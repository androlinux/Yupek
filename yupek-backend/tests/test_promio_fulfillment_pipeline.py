import hmac
import hashlib
import json
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app import config
from app.routers.orders import (
    _in_memory_order_mirror,
    _in_memory_processed_events,
    _active_retrying_order_ids,
    _save_order_record,
    _get_order_by_id,
)
from app.suppliers.promio import (
    PromioAdapter,
    calculate_promio_shipping,
    PromioOrderSubmissionDisabledError,
    PromioMappingError,
    PromioShippingCalculationError,
)
from app.suppliers.promio_sync import normalize_promio_design_product


class TestPromioCatalogNormalization(unittest.TestCase):
    """Test catalog normalization for the 4 Promio design products."""

    def setUp(self):
        scratch_path = os.path.join(
            r"C:\Users\Gebruiker\.gemini\antigravity-ide\brain\4dbcc181-541c-4981-a64b-0342974a6248\scratch\yupek_api_products.json"
        )
        if os.path.exists(scratch_path):
            with open(scratch_path, "r", encoding="utf-8") as f:
                self.raw_products = json.load(f)["products"]
        else:
            self.raw_products = []

    def test_normalize_all_4_promio_products(self):
        if not self.raw_products:
            self.skipTest("Scratch raw products cache not found.")

        self.assertEqual(len(self.raw_products), 4)
        for raw in self.raw_products:
            norm = normalize_promio_design_product(raw)
            # 1. Product identifiers
            self.assertTrue(norm["id"].startswith("promio-"))
            self.assertTrue(str(norm["supplierProductId"]).isdigit())
            self.assertEqual(norm["supplier"], "Promio")

            # 2. Safety: unpublished draft, null retail price
            self.assertTrue(norm["isDraft"])
            self.assertIsNone(norm["price"])
            self.assertEqual(norm["approvalStatus"], "pending_pricing_approval")
            self.assertIn("requires manual approval", norm["pricingNotice"])

            # 3. Variants
            variants = norm["variants"]
            self.assertGreater(len(variants), 0)
            for v in variants:
                self.assertTrue(bool(v["variant_id"]))
                self.assertTrue(bool(v["supplier_variant_uid"]))
                self.assertTrue(bool(v["sku"]))
                self.assertTrue(bool(v["title"]))
                self.assertIn(" / ", v["title"])
                self.assertGreater(v["supplier_cost_eur"], 0)
                self.assertEqual(v["price_cents"], int(round(v["supplier_cost_eur"] * 100)))

            # 4. Standard garment sizes
            self.assertGreater(len(norm["sizes"]), 0)
            self.assertGreater(len(norm["colors"]), 0)
            for s in norm["sizes"]:
                self.assertIn(s, [
                    "XX-Small", "XXS", "X-Small", "XS", "Small", "S",
                    "Medium", "M", "Large", "L", "X-Large", "XL",
                    "2X-Large", "2XL", "3X-Large", "3XL", "4X-Large", "4XL",
                    "5X-Large", "5XL", "One Size"
                ])


class TestPromioShippingCalculation(unittest.TestCase):
    """Test Promio deterministic shipping calculation."""

    def test_netherlands_single_tshirt_rates(self):
        items = [{"category": "t-shirt", "quantity": 1}]
        tracked = calculate_promio_shipping("NL", items, method="tracked")
        courier = calculate_promio_shipping("NL", items, method="courier")
        self.assertEqual(tracked, 375)  # €3.75
        self.assertEqual(courier, 395)  # €3.95

    def test_netherlands_multi_hoodie_courier_rate(self):
        items = [{"category": "hoodie", "quantity": 2}]  # 250 * 2 = 500 pts >= 250
        rate = calculate_promio_shipping("NL", items, method="courier")
        self.assertEqual(rate, 495)  # €4.95

    def test_europe_belgium_germany_rates(self):
        items = [{"category": "t-shirt", "quantity": 1}]  # 100 pts
        be_rate = calculate_promio_shipping("BE", items, method="tracked")
        de_rate = calculate_promio_shipping("DE", items, method="tracked")
        self.assertEqual(be_rate, 395)  # €3.95
        self.assertEqual(de_rate, 395)  # €3.95

    def test_europe_heavy_hoodies_rates(self):
        items = [{"category": "hoodie", "quantity": 2}]  # 500 pts
        fr_rate = calculate_promio_shipping("FR", items, method="tracked")
        self.assertEqual(fr_rate, 795)  # 500-599 pts: €7.95

    def test_unsupported_shipping_conditions_raise_error(self):
        items = [{"category": "t-shirt", "quantity": 1}]
        # 1. Missing destination country
        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("", items)
        # 2. Unsupported courier method for Europe (requires zonal vendor quote)
        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("FR", items, method="courier")
        # 3. Tracked method for heavy hoodie in NL (>249 pts requires courier)
        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("NL", [{"category": "hoodie", "quantity": 1}], method="tracked")
        # 4. Unknown / invalid method
        with self.assertRaises(PromioShippingCalculationError):
            calculate_promio_shipping("NL", items, method="invalid_method")


class TestPromioOrderPayloadConstruction(unittest.TestCase):
    """Test payload construction and address parsing in PromioAdapter."""

    def setUp(self):
        self.adapter = PromioAdapter({"enabled": True, "app_id": "app", "secret_key": "sec"})

    def test_build_order_payload_success(self):
        order = {
            "id": "YPK-PROMIO-TEST-01",
            "customer_email": "customer@yupek.com",
            "shipping_address": {
                "first_name": "Leyla",
                "last_name": "Alieva",
                "street": "Keizersgracht 100",
                "city": "Amsterdam",
                "postal_code": "1015AA",
                "country": "Netherlands",
            },
        }
        items = [
            {"variant_id": "64E8825", "sku": "STTU170-ANT-XXS", "quantity": 2},
        ]
        payload = self.adapter.build_order_payload(order, items)
        self.assertEqual(payload["client_order_id"], "YPK-PROMIO-TEST-01")
        self.assertEqual(payload["shipping_address"]["first_name"], "Leyla")
        self.assertEqual(payload["shipping_address"]["last_name"], "Alieva")
        self.assertEqual(payload["shipping_address"]["address1"], "Keizersgracht 100")
        self.assertEqual(payload["shipping_address"]["city"], "Amsterdam")
        self.assertEqual(payload["shipping_address"]["zip"], "1015AA")
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["variant_uid"], "64E8825")
        self.assertEqual(payload["items"][0]["quantity"], 2)

    def test_build_order_payload_missing_address_raises_mapping_error(self):
        order = {
            "id": "YPK-PROMIO-TEST-02",
            "shipping_address": {"first_name": "Leyla"},  # Missing street & city
        }
        items = [{"variant_id": "64E8825", "sku": "SKU", "quantity": 1}]
        with self.assertRaises(PromioMappingError):
            self.adapter.build_order_payload(order, items)


class TestPromioFulfillmentWebhookAndIdempotency(unittest.TestCase):
    """Test Stripe webhook fulfillment routing to Promio and idempotency safety."""

    def setUp(self):
        self.client = TestClient(app)
        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        mock_table.upsert.return_value.execute.return_value.data = None
        mock_table.insert.return_value.execute.return_value.data = None
        self.mock_db.return_value.table.return_value = mock_table

        _in_memory_order_mirror.clear()
        _in_memory_processed_events.clear()
        _active_retrying_order_ids.clear()

    def tearDown(self):
        self.db_patcher.stop()

    def _sign_stripe(self, payload: bytes) -> str:
        secret = config.STRIPE_WEBHOOK_SECRET or "whsec_test"
        ts = int(datetime.now(timezone.utc).timestamp())
        sig_payload = f"{ts}.".encode("utf-8") + payload
        mac = hmac.new(secret.encode("utf-8"), sig_payload, hashlib.sha256).hexdigest()
        return f"t={ts},v1={mac}"

    def _create_promio_order(self, order_id: str, **kwargs):
        order = {
            "id": order_id,
            "total_cents": 5893,
            "payment_status": kwargs.get("payment_status", "pending"),
            "fulfillment_status": kwargs.get("fulfillment_status", "pending_payment"),
            "customer_email": "buyer@yupek.com",
            "customer_name": "Promio Buyer",
            "items": [
                {
                    "supplier": "Promio",
                    "supplier_product_id": "25986528",
                    "variant_id": "64E8825",
                    "sku": "STTU170-ANT-XXS",
                    "quantity": 1,
                    "unit_price_cents": 5893,
                }
            ],
            "shipping_address": {
                "first_name": "Leyla",
                "last_name": "Alieva",
                "street": "Keizersgracht 100",
                "city": "Amsterdam",
                "postal_code": "1015AA",
                "country": "Netherlands",
            },
            **kwargs,
        }
        _save_order_record(order)
        return order

    def test_payment_succeeded_with_safe_lock_marks_paid_without_supplier_call(self):
        """Under default safety lock, payment succeeds, status is paid, zero Promio order created."""
        order_id = "YPK-SAFE-LOCK-01"
        self._create_promio_order(order_id)

        event = {
            "id": "evt_safe_lock_01",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_safe_01",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(config, "STRIPE_WEBHOOK_SECRET", "whsec_test"):
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )

        self.assertEqual(resp.status_code, 200)
        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "paid")
        self.assertEqual(order["fulfillment_status"], "paid")
        self.assertIsNone(order.get("promio_order_id"))

    def test_payment_succeeded_when_mock_unlocked_creates_promio_order(self):
        """When submission unlocked in mock, Promio order ID is created and saved."""
        order_id = "YPK-UNLOCKED-01"
        self._create_promio_order(order_id)

        event = {
            "id": "evt_unlocked_01",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_unlocked_01",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(config, "STRIPE_WEBHOOK_SECRET", "whsec_test"), \
             patch.object(PromioAdapter, "create_order", return_value="prm_ord_998877") as mock_promio:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            mock_promio.assert_called_once()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "paid")
        self.assertEqual(order["fulfillment_status"], "promio_order_created")
        self.assertEqual(order["promio_order_id"], "prm_ord_998877")

    def test_duplicate_webhook_delivery_is_strictly_idempotent(self):
        """Duplicate Stripe webhook delivery triggers exactly ONE supplier submission."""
        order_id = "YPK-IDEMP-01"
        self._create_promio_order(order_id)

        event = {
            "id": "evt_idemp_01",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_idemp_01",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(config, "STRIPE_WEBHOOK_SECRET", "whsec_test"), \
             patch.object(PromioAdapter, "create_order", return_value="prm_ord_idemp_01") as mock_promio:
            # First delivery
            resp1 = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp1.status_code, 200)

            # Second delivery with same event ID
            resp2 = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp2.status_code, 200)
            self.assertEqual(resp2.json()["status"], "already_processed")

            # Supplier called exactly once
            self.assertEqual(mock_promio.call_count, 1)

    def test_failed_payment_webhook_creates_zero_promio_orders(self):
        """Failed payment marks order failed and creates zero Promio orders."""
        order_id = "YPK-FAILED-01"
        self._create_promio_order(order_id)

        event = {
            "id": "evt_failed_01",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_failed_01",
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(config, "STRIPE_WEBHOOK_SECRET", "whsec_test"), \
             patch.object(PromioAdapter, "create_order") as mock_promio:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            mock_promio.assert_not_called()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "failed")


class TestPromioAdminRetryEndpoint(unittest.TestCase):
    """Test admin endpoint POST /api/orders/{order_id}/promio/retry."""

    def setUp(self):
        self.client = TestClient(app)
        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        mock_table.upsert.return_value.execute.return_value.data = None
        self.mock_db.return_value.table.return_value = mock_table

        _in_memory_order_mirror.clear()
        _active_retrying_order_ids.clear()

    def tearDown(self):
        self.db_patcher.stop()

    def _auth_headers(self):
        return {"X-Admin-Key": "test_admin_key"}

    @patch("app.routers.orders._check_admin_authorization", return_value=(False, 401, "Unauthorized"))
    def test_retry_requires_admin_authorization(self, mock_auth):
        resp = self.client.post("/api/orders/YPK-RETRY-01/promio/retry")
        self.assertEqual(resp.status_code, 401)

    @patch("app.routers.orders._check_admin_authorization", return_value=(True, 200, None))
    def test_retry_unpaid_order_returns_400(self, mock_auth):
        order = {
            "id": "YPK-UNPAID-01",
            "payment_status": "pending",
            "items": [],
        }
        _save_order_record(order)
        resp = self.client.post("/api/orders/YPK-UNPAID-01/promio/retry", headers=self._auth_headers())
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Only fully paid", resp.json()["detail"])

    @patch("app.routers.orders._check_admin_authorization", return_value=(True, 200, None))
    def test_retry_already_fulfilled_order_returns_400(self, mock_auth):
        order = {
            "id": "YPK-FULFILLED-01",
            "payment_status": "paid",
            "promio_order_id": "prm_12345",
            "items": [],
        }
        _save_order_record(order)
        resp = self.client.post("/api/orders/YPK-FULFILLED-01/promio/retry", headers=self._auth_headers())
        self.assertEqual(resp.status_code, 400)
        self.assertIn("already been fulfilled", resp.json()["detail"])

    @patch("app.routers.orders._check_admin_authorization", return_value=(True, 200, None))
    def test_retry_with_safety_lock_returns_503(self, mock_auth):
        order = {
            "id": "YPK-RETRY-LOCKED-01",
            "payment_status": "paid",
            "items": [],
        }
        _save_order_record(order)
        # submit_orders_enabled is False by default
        resp = self.client.post("/api/orders/YPK-RETRY-LOCKED-01/promio/retry", headers=self._auth_headers())
        self.assertEqual(resp.status_code, 503)
        self.assertIn("disabled by safety guard", resp.json()["detail"])

    @patch("app.routers.orders._check_admin_authorization", return_value=(True, 200, None))
    @patch.object(PromioAdapter, "submit_orders_enabled", True)
    @patch.object(PromioAdapter, "create_order", return_value="prm_manual_retry_777")
    def test_retry_when_mock_unlocked_succeeds(self, mock_create, mock_auth):
        order = {
            "id": "YPK-RETRY-SUCCESS-01",
            "payment_status": "paid",
            "items": [{"variant_id": "64E8825", "sku": "SKU", "quantity": 1}],
        }
        _save_order_record(order)
        resp = self.client.post("/api/orders/YPK-RETRY-SUCCESS-01/promio/retry", headers=self._auth_headers())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["promio_order_id"], "prm_manual_retry_777")

        saved = _get_order_by_id("YPK-RETRY-SUCCESS-01")
        self.assertEqual(saved["promio_order_id"], "prm_manual_retry_777")
        self.assertEqual(saved["fulfillment_status"], "promio_order_created")


if __name__ == "__main__":
    unittest.main()
