"""Unit tests for Promio Brick API 1.0 Supplier Adapter.

Verifies:
- Missing credentials handling
- SHA-1 signature generation matching Brick API specification
- Valid and invalid API responses
- Provider-side HTTP 500 status-header anomaly handling (strict fail-closed schema validation)
- Catalogue and product conversion
- Variant UID/SKU explicit mapping (no display-name matching)
- Deterministic weight-points shipping calculations for NL, Europe, US/CA, Rest of World
- Unknown destinations, missing tariffs, and weight limits failing closed
- Disabled feature flag behavior
- Strict blocking of all order submission attempts across all environments
- Supplier registry integration
"""

import hashlib
import unittest
from unittest.mock import MagicMock, patch

from app.suppliers.base import SupplierProduct, SupplierVariant
from app.suppliers.promio import (
    DEFAULT_PRODUCT_WEIGHT_POINTS,
    EUROPE_TRACKED_RATES,
    NL_RATES,
    PromioAPIError,
    PromioAdapter,
    PromioClient,
    PromioConfigurationError,
    PromioMappingError,
    PromioOrderSubmissionDisabledError,
    PromioProductMapping,
    PromioShippingCalculationError,
    PromioVariantMapping,
    calculate_promio_shipping,
    generate_signature,
    validate_product_mapping,
)
from app.suppliers.registry import ADAPTERS, get_adapter


class TestPromioSignature(unittest.TestCase):
    """Tests for Promio Brick API request signature generation."""

    def test_signature_generation_dict(self):
        params = {"AppId": "test_app_123", "id": "42"}
        secret = "test_secret_abc"
        # query_string is AppId=test_app_123&id=42
        expected_raw = "AppId=test_app_123&id=42test_secret_abc"
        expected_sig = hashlib.sha1(expected_raw.encode("utf-8")).hexdigest()

        sig = generate_signature(params, secret)
        self.assertEqual(sig, expected_sig)

    def test_signature_generation_query_string(self):
        query_str = "AppId=test_app_123&id=42"
        secret = "test_secret_abc"
        expected_raw = f"{query_str}{secret}"
        expected_sig = hashlib.sha1(expected_raw.encode("utf-8")).hexdigest()

        sig = generate_signature(f"?{query_str}", secret)
        self.assertEqual(sig, expected_sig)

    def test_signature_strips_existing_signature_param(self):
        # Ensure that if Signature is already in params/string, it is stripped
        params = {"AppId": "test_app_123", "Signature": "old_sig", "id": "42"}
        secret = "test_secret_abc"
        expected_raw = "AppId=test_app_123&id=42test_secret_abc"
        expected_sig = hashlib.sha1(expected_raw.encode("utf-8")).hexdigest()

        sig = generate_signature(params, secret)
        self.assertEqual(sig, expected_sig)

    def test_missing_secret_key_raises_configuration_error(self):
        with self.assertRaises(PromioConfigurationError):
            generate_signature({"AppId": "123"}, "")


class TestPromioClient(unittest.TestCase):
    """Tests for PromioClient read-only operations and error handling."""

    def test_missing_credentials_raises_error(self):
        client = PromioClient(app_id="", secret_key="")
        with self.assertRaises(PromioConfigurationError):
            client.get_product(100)

        with self.assertRaises(PromioConfigurationError):
            client.list_fulfillment_products()

        with self.assertRaises(PromioConfigurationError):
            client.list_products()

    @patch("httpx.Client.get")
    def test_get_product_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": 10687317,
            "title": "Organic Creator T-shirt",
            "type": "t-shirt",
            "variants": [
                {"uid": "5F60F65", "sku": "STTU169-WHI-M", "price": 12.50}
            ],
            "images": [{"src": "https://promio.pro/img/sample.jpg"}]
        }
        mock_get.return_value = mock_resp

        client = PromioClient(app_id="app_1", secret_key="sec_1")
        data = client.get_product(10687317)
        self.assertEqual(data["id"], 10687317)
        self.assertEqual(data["title"], "Organic Creator T-shirt")
        self.assertEqual(len(data["variants"]), 1)

    @patch("httpx.Client.get")
    def test_get_product_http_error(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_get.return_value = mock_resp

        client = PromioClient(app_id="app_1", secret_key="sec_1")
        with self.assertRaises(PromioAPIError) as ctx:
            client.get_product(999999)
        self.assertIn("HTTP 404", str(ctx.exception))

    @patch("httpx.Client.get")
    def test_get_product_malformed_json_or_schema(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"something_else": True}  # Missing id/variants
        mock_get.return_value = mock_resp

        client = PromioClient(app_id="app_1", secret_key="sec_1")
        with self.assertRaises(PromioAPIError) as ctx:
            client.get_product(100)
        self.assertIn("Malformed product payload", str(ctx.exception))

    @patch("httpx.Client.get")
    def test_list_products_success_200(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = [
            {"id": 1, "title": "Product 1", "variants": []},
            {"id": 2, "title": "Product 2", "variants": []},
        ]
        mock_get.return_value = mock_resp

        client = PromioClient(app_id="app_1", secret_key="sec_1")
        products = client.list_products()
        self.assertEqual(len(products), 2)

    @patch("httpx.Client.get")
    def test_list_products_fastcgi_status_anomaly_accepted_with_valid_schema(self, mock_get):
        """Promio /products.php emits 'Status: 1' resulting in outer HTTP 500 while returning valid JSON."""
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.json.return_value = [
            {"id": 101, "title": "Stanley/Stella Tee", "variants": [{"uid": "u1", "sku": "s1"}]},
            {"id": 102, "title": "Stanley/Stella Hoodie", "variants": [{"uid": "u2", "sku": "s2"}]},
        ]
        mock_get.return_value = mock_resp

        client = PromioClient(app_id="app_1", secret_key="sec_1")
        # Should be cautiously accepted because payload matches exact valid product schema
        products = client.list_products()
        self.assertEqual(len(products), 2)
        self.assertEqual(products[0]["id"], 101)

    @patch("httpx.Client.get")
    def test_list_products_http_500_fails_closed_on_error_or_malformed(self, mock_get):
        """HTTP 500 with non-schema or error body MUST fail closed."""
        # Case A: Error dict
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.json.return_value = {"error": "Internal Server Error"}
        mock_get.return_value = mock_resp

        client = PromioClient(app_id="app_1", secret_key="sec_1")
        with self.assertRaises(PromioAPIError):
            client.list_products()

        # Case B: Non-JSON HTML error
        mock_resp.json.side_effect = ValueError("Not JSON")
        with self.assertRaises(PromioAPIError) as ctx:
            client.list_products()
        self.assertIn("non-JSON body", str(ctx.exception))


class TestPromioShippingCalculation(unittest.TestCase):
    """Tests for deterministic weight-points shipping calculations."""

    def test_domestic_netherlands_tariffs(self):
        # 1 T-shirt = 100 points
        tshirt = {"category": "t-shirt", "quantity": 1}
        # 0-100 pts: tracked = 375 cents, courier = 395 cents
        self.assertEqual(calculate_promio_shipping("Netherlands", [tshirt], "tracked"), 375)
        self.assertEqual(calculate_promio_shipping("nl", [tshirt], "courier"), 395)

        # 2 T-shirts = 200 points (101-249 bracket)
        two_tshirts = {"category": "t-shirt", "quantity": 2}
        self.assertEqual(calculate_promio_shipping("Nederland", [two_tshirts], "tracked"), 469)
        self.assertEqual(calculate_promio_shipping("NL", [two_tshirts], "courier"), 495)

        # 1 Hoodie = 250 points (250+ bracket)
        # Tracked is not offered over 249 points in NL (fails closed)
        hoodie = {"category": "hoodie", "quantity": 1}
        self.assertEqual(calculate_promio_shipping("Netherlands", [hoodie], "courier"), 495)
        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("Netherlands", [hoodie], "tracked")

    def test_europe_tracked_tariffs(self):
        # Germany: 1 T-shirt = 100 points -> 395 cents
        tshirt = {"category": "t-shirt", "quantity": 1}
        self.assertEqual(calculate_promio_shipping("Germany", [tshirt], "tracked"), 395)

        # Belgium: 1 Hoodie = 250 points (250-399 bracket) -> 545 cents
        hoodie = {"category": "hoodie", "quantity": 1}
        self.assertEqual(calculate_promio_shipping("Belgium", [hoodie], "tracked"), 545)

        # France: 2 Hoodies = 500 points (500-599 bracket) -> 795 cents
        two_hoodies = {"category": "hoodie", "quantity": 2}
        self.assertEqual(calculate_promio_shipping("France", [two_hoodies], "tracked"), 795)

        # 700+ points in Europe requires courier quote -> fails closed
        three_hoodies = {"category": "hoodie", "quantity": 3}  # 750 points
        with self.assertRaises(PromioShippingCalculationError) as ctx:
            calculate_promio_shipping("Spain", [three_hoodies], "tracked")
        self.assertIn("exceed maximum flat-tariff bracket", str(ctx.exception))

    def test_europe_courier_requires_vendor_quote(self):
        tshirt = {"category": "t-shirt", "quantity": 1}
        with self.assertRaises(PromioShippingCalculationError) as ctx:
            calculate_promio_shipping("Germany", [tshirt], "courier")
        self.assertIn("requires vendor zonal confirmation", str(ctx.exception))

    def test_us_and_canada_tariffs(self):
        tshirt = {"category": "t-shirt", "quantity": 1}
        self.assertEqual(calculate_promio_shipping("United States", [tshirt], "tracked"), 495)
        self.assertEqual(calculate_promio_shipping("Canada", [tshirt], "tracked"), 495)

    def test_rest_of_world_tariffs(self):
        tshirt = {"category": "t-shirt", "quantity": 1}
        self.assertEqual(calculate_promio_shipping("Australia", [tshirt], "tracked"), 495)

    def test_unknown_country_or_missing_input_fails_closed(self):
        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("", [{"category": "t-shirt", "quantity": 1}])

        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("NL", [{"category": "t-shirt", "quantity": 1}], method="teleport")


class TestPromioProductMapping(unittest.TestCase):
    """Tests for explicit Promio product and variant mapping."""

    def setUp(self):
        self.valid_data = {
            "supplier": "promio",
            "promio_product_id": 10687317,
            "base_sku": "STTU169",
            "category": "tees",
            "weight_points": 100,
            "variants": {
                "5F60F65": {
                    "supplier_variant_uid": "5F60F65",
                    "sku": "STTU169-WHI-M",
                    "size": "Medium",
                    "color": "White",
                    "cost_cents": 1250,
                },
                "5F60F66": {
                    "supplier_variant_uid": "5F60F66",
                    "sku": "STTU169-BLK-L",
                    "size": "Large",
                    "color": "Black",
                    "cost_cents": 1250,
                },
            },
            "designs": [
                {"position_title": "Front", "artwork_url": "https://yupek.shop/art/front.png"}
            ],
        }

    def test_validate_product_mapping_success(self):
        mapping = validate_product_mapping(self.valid_data)
        self.assertEqual(mapping.supplier, "promio")
        self.assertEqual(mapping.promio_product_id, 10687317)
        self.assertEqual(len(mapping.variants), 2)
        self.assertEqual(len(mapping.designs), 1)

    def test_lookup_variant_by_uid_or_sku(self):
        mapping = validate_product_mapping(self.valid_data)
        # By UID
        v1 = mapping.get_variant_by_uid_or_sku("5F60F65")
        self.assertEqual(v1.size, "Medium")
        # By SKU
        v2 = mapping.get_variant_by_uid_or_sku("STTU169-BLK-L")
        self.assertEqual(v2.color, "Black")

    def test_lookup_fails_on_display_name_or_unknown(self):
        mapping = validate_product_mapping(self.valid_data)
        # Matching by display name alone is strictly forbidden
        with self.assertRaises(PromioMappingError):
            mapping.get_variant_by_uid_or_sku("White T-Shirt Medium")

        with self.assertRaises(PromioMappingError):
            mapping.get_variant_by_uid_or_sku("non_existent_uid")

    def test_validate_mapping_rejects_missing_required_fields(self):
        # Missing supplier
        bad_data = dict(self.valid_data)
        bad_data["supplier"] = "printful"
        with self.assertRaises(PromioMappingError):
            validate_product_mapping(bad_data)

        # Missing base_sku
        bad_data = dict(self.valid_data)
        bad_data["base_sku"] = ""
        with self.assertRaises(PromioMappingError):
            validate_product_mapping(bad_data)


class TestPromioAdapter(unittest.TestCase):
    """Tests for PromioAdapter conforming to SupplierAdapter interface."""

    def test_adapter_registry(self):
        self.assertIn("promio", ADAPTERS)
        adapter = get_adapter({"type": "promio", "config": {"enabled": False}})
        self.assertIsInstance(adapter, PromioAdapter)

    def test_disabled_adapter_behavior(self):
        adapter = PromioAdapter({"enabled": False, "app_id": "app", "secret_key": "sec"})
        # list_products returns empty when disabled
        products, cursor = adapter.list_products()
        self.assertEqual(products, [])
        self.assertIsNone(cursor)

        # get_stock returns 0
        stock = adapter.get_stock(["uid_1", "uid_2"])
        self.assertEqual(stock, {"uid_1": 0, "uid_2": 0})

        # get_tracking returns disabled status
        track = adapter.get_tracking("ref_123")
        self.assertEqual(track["status"], "disabled")

    def test_order_submission_is_strictly_blocked_in_all_environments(self):
        """CRITICAL: Order creation must NEVER succeed in this adapter."""
        # Case A: Adapter disabled
        adapter_disabled = PromioAdapter({"enabled": False})
        with self.assertRaises(PromioOrderSubmissionDisabledError):
            adapter_disabled.create_order({"id": "ord_1"}, [{"variant_id": "v1"}])

        # Case B: Adapter enabled (order submission still strictly locked)
        adapter_enabled = PromioAdapter({"enabled": True, "app_id": "app", "secret_key": "sec"})
        self.assertFalse(adapter_enabled.submit_orders_enabled)
        with self.assertRaises(PromioOrderSubmissionDisabledError) as ctx:
            adapter_enabled.create_order({"id": "ord_1"}, [{"variant_id": "v1"}])
        self.assertIn("strictly disabled", str(ctx.exception))

    @patch("app.suppliers.promio.PromioClient.list_products")
    def test_list_products_enabled_adapter(self, mock_client_list):
        mock_client_list.return_value = [
            {
                "id": 10687317,
                "title": "Organic T-Shirt",
                "description": "Premium organic tee",
                "variants": [
                    {
                        "uid": "uid_1",
                        "sku": "SKU-1",
                        "price": 15.00,
                        "options": [
                            {"name": "Maat", "value": "L"},
                            {"name": "Kleur", "value": "White"},
                        ],
                    }
                ],
                "images": [{"src": "https://img.promio.pro/1.jpg"}],
            }
        ]

        adapter = PromioAdapter({"enabled": True, "app_id": "app", "secret_key": "sec"})
        products, cursor = adapter.list_products()

        self.assertEqual(len(products), 1)
        p = products[0]
        self.assertIsInstance(p, SupplierProduct)
        self.assertEqual(p.supplier_product_id, "10687317")
        self.assertEqual(p.name, "Organic T-Shirt")
        self.assertEqual(len(p.variants), 1)
        v = p.variants[0]
        self.assertIsInstance(v, SupplierVariant)
        self.assertEqual(v.supplier_variant_id, "uid_1")
        self.assertEqual(v.size, "L")
        self.assertEqual(v.color, "White")
        self.assertEqual(v.cost_cents, 1500)
        self.assertEqual(v.stock, 999)


if __name__ == "__main__":
    unittest.main()
