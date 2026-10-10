"""Unit tests for Promio Catalog Synchronization Service (PROMIO-005).

Verifies:
- Feature flag disabled by default
- Dry-run preview mode (zero writes)
- Exact supplier identifier matching (never display name)
- Duplicate prevention & idempotency
- Preservation of retail prices, slugs, descriptions, and approvals
- Draft-only status for new products (isDraft=True)
- Normalization of verified Promio design products (25986528, 25986529, 25986530, 25986531)
- Filtering of invalid variants (missing UID or SKU)
- Handling of missing images and mockups
- Handling of malformed API payloads
- Retention of storefront products when missing from supplier response
- Promio router endpoints (/api/promio/status, /preview, /sync)
"""

import copy
import json
import os
import unittest
from unittest.mock import MagicMock, patch

import jwt
from fastapi.testclient import TestClient

from app import config
from app.main import app
from app.suppliers.promio_sync import (
    diff_promio_catalog,
    get_promio_sync_status,
    normalize_promio_design_product,
    sync_promio_catalog,
    PromioSyncError,
    PromioSyncValidationError,
)

# Sample verified Promio API payloads
MOCK_CRAFTER_TSHIRT = {
    "id": "25986528",
    "title": "Crafter Винтажная эмблема YUPEK с восточным орнаментом",
    "type": "Design",
    "design": "Винтажная эмблема YUPEK с восточным орнаментом",
    "weight": 0.575,
    "hsCode": "61099090",
    "countryOfOrigin": "NL",
    "mockups": [
        {
            "title": "DTG Front Side",
            "src": "https://promio.pro/images/pictures/artists/custom_user_94792/b3e083bd3bb2caa852b7653786f49fe5-679.png"
        }
    ],
    "images": [
        {
            "title": "Creator White Studio Front Main 5",
            "src": "https://promio.pro/images/pictures/shop/producten/creator_white_studio_front_main_5.jpg"
        }
    ],
    "variants": [
        {
            "uid": "64E8825",
            "sku": "STTU170-ANT-XXS",
            "price": 5.75,
            "options": [{"name": "Kleur", "value": "Anthracite"}, {"name": "Maat", "value": "XX-Small"}]
        },
        {
            "uid": "64E8826",
            "sku": "STTU170-ANT-XS",
            "price": 5.75,
            "options": [{"name": "Kleur", "value": "Anthracite"}, {"name": "Maat", "value": "X-Small"}]
        },
        {
            "uid": "64E8827",
            "sku": "STTU170-WHT-M",
            "price": 5.75,
            "options": [{"name": "Kleur", "value": "White"}, {"name": "Maat", "value": "Medium"}]
        }
    ]
}

MOCK_SWEATSHIRT = {
    "id": "25986529",
    "title": "AWDis Sweatshirt Винтажная эмблема YUPEK с восточным орнаментом",
    "type": "Design",
    "design": "Винтажная эмблема YUPEK с восточным орнаментом",
    "weight": 0.575,
    "hsCode": "61099090",
    "countryOfOrigin": "NL",
    "mockups": [
        {
            "title": "DTG Front Side",
            "src": "https://promio.pro/images/pictures/artists/custom_user_94792/230348f6fdf7c634fe9ab80ebac445a4-205.png"
        }
    ],
    "images": [
        {
            "title": "JH030 Bottle Green 067",
            "src": "https://promio.pro/images/pictures/shop/producten/jh030_bottle_green_067.jpg"
        }
    ],
    "variants": [
        {
            "uid": "64E8320",
            "sku": "JH030-ARW-XS",
            "price": 5.75,
            "options": [{"name": "Kleur", "value": "Arctic White"}, {"name": "Maat", "value": "X-Small"}]
        },
        {
            "uid": "64E8321",
            "sku": "JH030-ARW-S",
            "price": 5.75,
            "options": [{"name": "Kleur", "value": "Arctic White"}, {"name": "Maat", "value": "Small"}]
        }
    ]
}

MOCK_HOODIE_DTG = {
    "id": "25986530",
    "title": "College Hoodie - AWDis Винтажная эмблема YUPEK с восточным орнаментом",
    "type": "Design",
    "design": "Винтажная эмблема YUPEK с восточным орнаментом",
    "mockups": [
        {
            "title": "DTG Front Side",
            "src": "https://promio.pro/images/pictures/artists/custom_user_94792/3012f6c891774e39be8c6becc1aa3496-192.png"
        }
    ],
    "images": [],
    "variants": [
        {
            "uid": "64E8654",
            "sku": "JH001-ARW-XS",
            "price": 5.75,
            "options": [{"name": "Kleur", "value": "Arctic White"}, {"name": "Maat", "value": "X-Small"}]
        }
    ]
}

MOCK_HOODIE_EMBROIDERY = {
    "id": "25986531",
    "title": "College Hoodie - AWDis Borduring Винтажная эмблема YUPEK с восточным орнаментом",
    "type": "Design",
    "design": "Винтажная эмблема YUPEK с восточным орнаментом",
    "mockups": [
        {
            "title": "Embroidery Left",
            "src": "https://promio.pro/images/pictures/artists/custom_user_94792/13c8a2dc1e4211984a5cf474b04c2411-377.png"
        }
    ],
    "images": [],
    "variants": [
        {
            "uid": "64E841C",
            "sku": "JH001-ARW-XS",
            "price": 5.75,
            "options": [
                {"name": "Kleur", "value": "Arctic White"},
                {"name": "Maat", "value": "X-Small"},
                {"name": "Is van dit ontwerp een borduurbestand aanwezig?", "value": "Yes"}
            ]
        }
    ]
}


class TestPromioCatalogSync(unittest.TestCase):
    """Test suite for Promio catalog synchronization."""

    def setUp(self):
        self.jwt_patch = patch.object(config, "JWT_SECRET", "test_jwt_secret_key_yupek_admin")
        self.jwt_patch.start()
        self.client = TestClient(app)

    def tearDown(self):
        self.jwt_patch.stop()

    def _admin_headers(self) -> dict[str, str]:
        token = jwt.encode(
            {"sub": "admin_user_1", "aud": "authenticated", "app_metadata": {"role": "admin"}},
            "test_jwt_secret_key_yupek_admin",
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}

    def _non_admin_headers(self) -> dict[str, str]:
        token = jwt.encode(
            {"sub": "customer_user_1", "aud": "authenticated", "app_metadata": {"role": "customer"}},
            "test_jwt_secret_key_yupek_admin",
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}

    def _spoofed_role_headers(self) -> dict[str, str]:
        token = jwt.encode(
            {"sub": "attacker_user_1", "aud": "authenticated", "user_metadata": {"role": "admin"}, "role": "admin", "app_metadata": {}},
            "test_jwt_secret_key_yupek_admin",
            algorithm="HS256"
        )
        return {"Authorization": f"Bearer {token}"}

    def test_feature_flag_disabled_by_default(self):
        """Live catalog sync must be disabled by default via PROMIO_CATALOG_SYNC_ENABLED=false."""
        with patch.object(config, "PROMIO_CATALOG_SYNC_ENABLED", False):
            result = sync_promio_catalog(dry_run=False, force_enable=False, raw_products=[MOCK_CRAFTER_TSHIRT])
            self.assertEqual(result["status"], "disabled")
            self.assertFalse(result["feature_flag_enabled"])
            self.assertIn("disabled via feature flag", result["message"])

    def test_dry_run_preview_mode_generates_diff_without_writes(self):
        """Dry-run preview must report new/updated candidates and make zero writes."""
        mock_custom_products = []
        with patch("app.suppliers.promio_sync._read_site_config", return_value={"customProducts": mock_custom_products}), \
             patch("app.suppliers.promio_sync._write_site_config") as mock_write:

            report = sync_promio_catalog(dry_run=True, raw_products=[MOCK_CRAFTER_TSHIRT, MOCK_SWEATSHIRT])

            self.assertEqual(report["status"], "preview")
            self.assertTrue(report["dry_run"])
            self.assertEqual(report["summary"]["total_fetched"], 2)
            self.assertEqual(report["summary"]["new_count"], 2)
            self.assertEqual(report["summary"]["invalid_count"], 0)
            self.assertEqual(len(report["new_candidates"]), 2)
            # Verify no writes occurred
            mock_write.assert_not_called()

    def test_normalization_of_verified_promio_products(self):
        """All 4 verified Promio products must be correctly normalized."""
        # 1. Crafter T-shirt
        p1 = normalize_promio_design_product(MOCK_CRAFTER_TSHIRT)
        self.assertEqual(p1["id"], "promio-25986528")
        self.assertEqual(p1["supplierProductId"], "25986528")
        self.assertEqual(p1["category"], "tees")
        self.assertEqual(p1["baseGarment"], "Stanley/Stella Crafter 2.0 T-shirt")
        self.assertEqual(p1["decorationMethod"], "DTG Front Side")
        self.assertEqual(p1["supplierPrice"], 5.75)
        self.assertEqual(len(p1["variants"]), 3)
        self.assertIn("Anthracite", p1["colors"])
        self.assertIn("White", p1["colors"])
        self.assertIn("XX-Small", p1["sizes"])
        self.assertTrue(p1["isDraft"])

        # 2. AWDis Sweatshirt
        p2 = normalize_promio_design_product(MOCK_SWEATSHIRT)
        self.assertEqual(p2["id"], "promio-25986529")
        self.assertEqual(p2["category"], "sweatshirts")
        self.assertEqual(p2["baseGarment"], "AWDis Sweatshirt JH030")

        # 3. AWDis College Hoodie DTG
        p3 = normalize_promio_design_product(MOCK_HOODIE_DTG)
        self.assertEqual(p3["id"], "promio-25986530")
        self.assertEqual(p3["category"], "sweatshirts")
        self.assertEqual(p3["decorationMethod"], "DTG Front Side")

        # 4. AWDis College Hoodie Embroidery
        p4 = normalize_promio_design_product(MOCK_HOODIE_EMBROIDERY)
        self.assertEqual(p4["id"], "promio-25986531")
        self.assertEqual(p4["category"], "sweatshirts")
        self.assertEqual(p4["decorationMethod"], "Embroidery Left Chest")

    def test_draft_only_for_new_products(self):
        """New products must be created strictly as unpublished draft candidates requiring pricing approval."""
        norm = normalize_promio_design_product(MOCK_CRAFTER_TSHIRT)
        self.assertTrue(norm["isDraft"])
        self.assertEqual(norm["approvalStatus"], "pending_pricing_approval")
        self.assertIsNone(norm["price"])  # Retail price not yet approved
        self.assertIsNotNone(norm["pricingNotice"])

    def test_preserved_retail_prices_and_slugs_on_update(self):
        """Existing product retail prices, custom slugs, descriptions, and approvals must be preserved."""
        existing = {
            "id": "promio-25986528",
            "supplierProductId": "25986528",
            "supplier": "Promio",
            "name": "Custom Approved Crafter Tee",
            "slug": "custom-vintage-crafter-tee-approved",
            "price": 85.00,  # Retail price approved by admin
            "description": "Hand-crafted bespoke Turkmen silk embroidery on premium organic cotton.",
            "isDraft": False,
            "variants": [
                {"variant_id": "64E8825", "sku": "STTU170-ANT-XXS", "size": "XX-Small", "color": "Anthracite"}
            ]
        }

        # Normalize with existing product context
        updated_norm = normalize_promio_design_product(MOCK_CRAFTER_TSHIRT, existing_product=existing)

        self.assertEqual(updated_norm["price"], 85.00)  # Retail price strictly preserved
        self.assertEqual(updated_norm["slug"], "custom-vintage-crafter-tee-approved")  # Slug preserved
        self.assertEqual(updated_norm["description"], existing["description"])  # Description preserved
        self.assertFalse(updated_norm["isDraft"])  # Approval status preserved
        self.assertEqual(updated_norm["approvalStatus"], "approved")

    def test_exact_supplier_identifiers_matching(self):
        """Matching must use exact supplier IDs and never display names."""
        catalog = [
            {
                "id": "printify-12345",
                "supplierProductId": "12345",
                "supplier": "Printify",
                "name": "Crafter Винтажная эмблема YUPEK с восточным орнаментом",  # Same display name
            }
        ]

        # Promio product has same name as Printify product, but supplier is Promio
        diff = diff_promio_catalog([normalize_promio_design_product(MOCK_CRAFTER_TSHIRT)], catalog)
        # Must be treated as NEW because supplierProductId '25986528' under Promio does not match '12345'
        self.assertEqual(diff["summary"]["new_count"], 1)
        self.assertEqual(diff["summary"]["updated_count"], 0)

    def test_duplicate_prevention_and_idempotency(self):
        """Repeated sync executions must be idempotent and not create duplicate items."""
        norm_tshirt = normalize_promio_design_product(MOCK_CRAFTER_TSHIRT)
        initial_catalog = [norm_tshirt]

        diff = diff_promio_catalog([norm_tshirt], initial_catalog)
        self.assertEqual(diff["summary"]["new_count"], 0)
        self.assertEqual(diff["summary"]["unchanged_count"], 1)
        self.assertEqual(diff["summary"]["updated_count"], 0)

    def test_invalid_variants_filtered_out(self):
        """Variants missing UID or SKU must be safely filtered."""
        malformed_variants = copy.deepcopy(MOCK_CRAFTER_TSHIRT)
        malformed_variants["variants"] = [
            {"uid": "", "sku": "STTU170-BAD-01", "price": 5.75},  # Missing UID
            {"uid": "VALID-01", "sku": "", "price": 5.75},        # Missing SKU
            {"uid": "VALID-02", "sku": "STTU170-OK-02", "price": 5.75, "options": [{"name": "Size", "value": "M"}]},
        ]

        norm = normalize_promio_design_product(malformed_variants)
        self.assertEqual(len(norm["variants"]), 1)
        self.assertEqual(norm["variants"][0]["variant_id"], "VALID-02")

    def test_product_with_zero_valid_variants_rejected(self):
        """Products where all variants fail validation must be rejected."""
        no_valid_variants = copy.deepcopy(MOCK_CRAFTER_TSHIRT)
        no_valid_variants["variants"] = [
            {"uid": "", "sku": ""},
            {"uid": "123", "sku": ""},
        ]

        with self.assertRaises(PromioSyncValidationError):
            normalize_promio_design_product(no_valid_variants)

    def test_non_design_product_type_rejected(self):
        """Products that are not type=Design must be rejected."""
        base_product = copy.deepcopy(MOCK_CRAFTER_TSHIRT)
        base_product["type"] = "Base"  # Blank garment, not customized design

        with self.assertRaises(PromioSyncValidationError):
            normalize_promio_design_product(base_product)

    def test_missing_images_handled_gracefully(self):
        """Products without mockups or images must normalize without crashing."""
        no_images = copy.deepcopy(MOCK_CRAFTER_TSHIRT)
        no_images["mockups"] = []
        no_images["images"] = []

        norm = normalize_promio_design_product(no_images)
        self.assertEqual(norm["images"], [])
        self.assertEqual(norm["mockups"], [])

    def test_missing_promio_products_not_deleted_from_storefront(self):
        """If a Promio product is absent from supplier API, it must be retained, not deleted."""
        existing_p = normalize_promio_design_product(MOCK_SWEATSHIRT)
        catalog = [existing_p]

        # Sync only returns crafter t-shirt (sweatshirt is missing from response)
        diff = diff_promio_catalog([normalize_promio_design_product(MOCK_CRAFTER_TSHIRT)], catalog)

        self.assertEqual(diff["summary"]["new_count"], 1)
        self.assertEqual(diff["summary"]["retained_missing_count"], 1)
        self.assertEqual(diff["retained_missing_from_supplier"][0]["supplierProductId"], "25986529")

    def test_live_sync_execution_with_force_enable(self):
        """Live sync execution updates customProducts and saves metadata when enabled."""
        saved_configs = []

        def mock_write(cfg):
            saved_configs.append(copy.deepcopy(cfg))

        with patch("app.suppliers.promio_sync._read_site_config", return_value={"customProducts": []}), \
             patch("app.suppliers.promio_sync._write_site_config", side_effect=mock_write), \
             patch("app.suppliers.promio_sync._save_sync_metadata") as mock_meta:

            result = sync_promio_catalog(
                dry_run=False,
                force_enable=True,
                raw_products=[MOCK_CRAFTER_TSHIRT, MOCK_SWEATSHIRT]
            )

            self.assertEqual(result["status"], "success")
            self.assertEqual(result["summary"]["new_count"], 2)
            self.assertEqual(len(saved_configs), 1)
            self.assertEqual(len(saved_configs[0]["customProducts"]), 2)
            self.assertTrue(saved_configs[0]["customProducts"][0]["isDraft"])
            mock_meta.assert_called_once()

    def test_get_promio_sync_status(self):
        """get_promio_sync_status reports correct configuration and health indicators."""
        with patch.object(config, "PROMIO_CATALOG_SYNC_ENABLED", False), \
             patch.object(config, "PROMIO_APP_ID", "test_app"), \
             patch.object(config, "PROMIO_SECRET_KEY", "test_sec"):

            st = get_promio_sync_status()
            self.assertFalse(st["feature_flag_enabled"])
            self.assertTrue(st["credentials_configured"])
            self.assertFalse(st["supplier_order_submission_enabled"])
            self.assertEqual(st["supplier"], "Promio (Breda, NL)")

    # --------------------------------------------------------------------------
    # FASTAPI ROUTER TESTS & AUTHORIZATION REGRESSION TESTS
    # --------------------------------------------------------------------------

    def test_router_unauthenticated_requests_rejected(self):
        """Unauthenticated requests must be rejected with 401 across all Promio endpoints."""
        for path, method in [
            ("/api/promio/status", "get"),
            ("/api/promio/preview", "get"),
            ("/api/promio/sync", "post"),
        ]:
            with self.subTest(path=path, method=method):
                resp = getattr(self.client, method)(path)
                self.assertEqual(resp.status_code, 401)
                self.assertIn("detail", resp.json())

    def test_router_non_admin_authenticated_rejected(self):
        """Authenticated non-admin users must be rejected with 403 across all Promio endpoints."""
        for path, method in [
            ("/api/promio/status", "get"),
            ("/api/promio/preview", "get"),
            ("/api/promio/sync", "post"),
        ]:
            with self.subTest(path=path, method=method):
                resp = getattr(self.client, method)(path, headers=self._non_admin_headers())
                self.assertEqual(resp.status_code, 403)
                self.assertEqual(resp.json().get("detail"), "Admin only")

    def test_router_role_spoofing_rejected(self):
        """Role claims in user_metadata or request body must not bypass admin authorization."""
        # Spoofed role in user_metadata instead of app_metadata
        resp = self.client.get("/api/promio/status", headers=self._spoofed_role_headers())
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.json().get("detail"), "Admin only")

        # Spoofed role in body without bearer
        resp2 = self.client.post("/api/promio/sync", json={"role": "admin", "is_admin": True})
        self.assertEqual(resp2.status_code, 401)

    def test_router_unauthorized_cannot_trigger_storage_writes(self):
        """An unauthorized caller cannot trigger any storage writes under any circumstances."""
        with patch("app.suppliers.promio_sync._write_site_config") as mock_write, \
             patch("app.suppliers.promio_sync._save_sync_metadata") as mock_meta:

            # Unauthenticated
            resp1 = self.client.post("/api/promio/sync?dry_run=false")
            self.assertEqual(resp1.status_code, 401)

            # Non-admin
            resp2 = self.client.post("/api/promio/sync?dry_run=false", headers=self._non_admin_headers())
            self.assertEqual(resp2.status_code, 403)

            # Spoofed role
            resp3 = self.client.post("/api/promio/sync?dry_run=false", headers=self._spoofed_role_headers())
            self.assertEqual(resp3.status_code, 403)

            mock_write.assert_not_called()
            mock_meta.assert_not_called()

    def test_router_authenticated_admin_can_access_status(self):
        """GET /api/promio/status returns HTTP 200 with metrics when called by admin."""
        resp = self.client.get("/api/promio/status", headers=self._admin_headers())
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("feature_flag_enabled", data)
        self.assertIn("supplier_order_submission_enabled", data)
        self.assertFalse(data["supplier_order_submission_enabled"])

    def test_router_authenticated_admin_can_access_preview(self):
        """GET /api/promio/preview returns dry-run preview report when called by admin."""
        with patch("app.suppliers.promio_sync.PromioClient.list_products", return_value=[MOCK_CRAFTER_TSHIRT]):
            resp = self.client.get("/api/promio/preview", headers=self._admin_headers())
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "preview")
            self.assertTrue(data["dry_run"])

    def test_router_sync_dry_run_endpoint_as_admin(self):
        """POST /api/promio/sync with default dry_run=true returns preview when called by admin."""
        with patch("app.suppliers.promio_sync.PromioClient.list_products", return_value=[MOCK_CRAFTER_TSHIRT]):
            resp = self.client.post("/api/promio/sync?dry_run=true", headers=self._admin_headers())
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "preview")

    def test_router_sync_live_disabled_returns_disabled_notice_and_no_writes(self):
        """POST /api/promio/sync?dry_run=false returns disabled status and performs zero writes when flag is off."""
        with patch.object(config, "PROMIO_CATALOG_SYNC_ENABLED", False), \
             patch("app.suppliers.promio_sync._write_site_config") as mock_write, \
             patch("app.suppliers.promio_sync._save_sync_metadata") as mock_meta:

            resp = self.client.post("/api/promio/sync?dry_run=false", headers=self._admin_headers())
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "disabled")
            self.assertFalse(data["feature_flag_enabled"])
            mock_write.assert_not_called()
            mock_meta.assert_not_called()

    def test_invalid_supplier_response_does_not_partially_overwrite_catalog(self):
        """Invalid or failing supplier response must abort without writing partial catalog data."""
        with patch("app.suppliers.promio_sync._write_site_config") as mock_write:
            with self.assertRaises(PromioSyncError):
                sync_promio_catalog(
                    dry_run=False,
                    force_enable=True,
                    raw_products="invalid_non_list_payload"  # type: ignore
                )
            mock_write.assert_not_called()

    def test_compensating_rollback_on_relational_upsert_failure(self):
        """If relational products table upsert fails during live sync, site_config must be rolled back to prior snapshot."""
        saved_configs = []
        def mock_write(cfg):
            saved_configs.append(copy.deepcopy(cfg))

        mock_db = MagicMock()
        mock_db.table.side_effect = Exception("Supabase connection timeout during products upsert")

        initial_config = {
            "customProducts": [{"id": "initial-1", "supplierProductId": "99999", "name": "Existing Item"}],
            "updatedAt": "2026-01-01T00:00:00Z"
        }

        with patch("app.suppliers.promio_sync._read_site_config", return_value=initial_config), \
             patch("app.suppliers.promio_sync._write_site_config", side_effect=mock_write), \
             patch("app.suppliers.promio_sync._save_sync_metadata"), \
             patch("app.db.get_db", return_value=mock_db):

            with self.assertRaises(PromioSyncError) as ctx:
                sync_promio_catalog(
                    dry_run=False,
                    force_enable=True,
                    raw_products=[MOCK_CRAFTER_TSHIRT]
                )

            # Error must report rollback
            self.assertIn("site_config changes were rolled back", str(ctx.exception))
            # _write_site_config must have been called twice: 1) new state, 2) rollback to initial state
            self.assertEqual(len(saved_configs), 2)
            # The final written config must match the initial snapshot
            self.assertEqual(len(saved_configs[1]["customProducts"]), 1)
            self.assertEqual(saved_configs[1]["customProducts"][0]["id"], "initial-1")

    def test_health_endpoints_and_vercel_rewrites(self):
        """Verify root, /health, /api/health, and Vercel query-rewritten paths resolve correctly."""
        # 1. Root
        r1 = self.client.get("/")
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.json()["status"], "online")

        # 2. Direct health
        r2 = self.client.get("/health")
        self.assertEqual(r2.status_code, 200)
        self.assertTrue(r2.json()["ok"])

        # 3. Direct api/health
        r3 = self.client.get("/api/health")
        self.assertEqual(r3.status_code, 200)
        self.assertTrue(r3.json()["ok"])

        # 4. Vercel query rewrite __path=health
        r4 = self.client.get("/api/index.py?__path=health")
        self.assertEqual(r4.status_code, 200)
        self.assertTrue(r4.json()["ok"])

        # 5. Vercel query rewrite __path=api/health
        r5 = self.client.get("/api/index.py?__path=api/health")
        self.assertEqual(r5.status_code, 200)
        self.assertTrue(r5.json()["ok"])

        # 6. Direct Vercel entrypoint info
        r6 = self.client.get("/api/index.py")
        self.assertEqual(r6.status_code, 200)
        self.assertEqual(r6.json()["status"], "online")

    def test_serverless_readonly_skips_disk_writes(self):
        """When VERCEL environment variable is set, local JSON file writes must be skipped safely."""
        from app.suppliers.promio_sync import _write_site_config, _save_sync_metadata

        mock_db = MagicMock()
        mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock()

        with patch.dict(os.environ, {"VERCEL": "1"}), \
             patch("app.db.get_db", return_value=mock_db), \
             patch("builtins.open") as mock_open:

            _write_site_config({"customProducts": []})
            _save_sync_metadata({"last_sync": "now"})

            # In serverless mode, open() must not be called to write to disk
            mock_open.assert_not_called()


if __name__ == "__main__":
    unittest.main()
