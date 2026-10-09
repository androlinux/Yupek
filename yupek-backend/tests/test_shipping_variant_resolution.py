import unittest
from app.routers.orders import _enrich_catalog_variants


class TestShippingVariantResolution(unittest.TestCase):
    """Regression test suite for deterministic variant_id fallback and shipping safety."""

    def test_variant_id_missing_or_null_enriched(self):
        """Case 1: variant_id is missing or null -> deterministically enriched from trusted catalog."""
        raw_products = [
            {
                "id": "printify-6ac53807209b79f0950c038f",
                "supplierProductId": "6ac53807209b79f0950c038f",
                "slug": "yupek-logo-small-chest-print-white-cotton-shirt-6ac53807209b79f0950c038f",
                "name": "Yupek Logo | Small Chest Print, White Cotton Shirt",
                "variants": [
                    {
                        "size": "M",
                        "color": "White",
                        "variant_id": None,
                        "title": "White / M",
                    },
                    {
                        "size": "L",
                        "color": "White",
                        "title": "White / L",
                        # variant_id completely omitted
                    },
                ],
            }
        ]

        enriched = _enrich_catalog_variants(raw_products)
        self.assertEqual(len(enriched), 1)
        variants = enriched[0]["variants"]

        # White / M for this T-Shirt is 12101 in site-config.json
        self.assertEqual(variants[0].get("variant_id"), 12101)
        # White / L for this T-Shirt is 12100 in site-config.json
        self.assertEqual(variants[1].get("variant_id"), 12100)

    def test_valid_variant_id_already_present_preserved(self):
        """Case 2: valid variant_id already present -> preserved untouched (not overwritten)."""
        raw_products = [
            {
                "id": "printify-6ac53807209b79f0950c038f",
                "supplierProductId": "6ac53807209b79f0950c038f",
                "slug": "yupek-logo-small-chest-print-white-cotton-shirt-6ac53807209b79f0950c038f",
                "name": "Yupek Logo | Small Chest Print, White Cotton Shirt",
                "variants": [
                    {
                        "size": "M",
                        "color": "White",
                        "variant_id": 99999,  # Custom authoritative variant ID
                        "title": "White / M",
                    }
                ],
            }
        ]

        enriched = _enrich_catalog_variants(raw_products)
        # Must preserve 99999, NOT overwrite with 12101
        self.assertEqual(enriched[0]["variants"][0].get("variant_id"), 99999)

    def test_exact_size_and_color_match(self):
        """Case 3: exact size/color match -> correctly finds the specific Printify variant."""
        raw_products = [
            {
                "id": "printify-6ac5349aeeae231e00050f12",
                "supplierProductId": "6ac5349aeeae231e00050f12",
                "slug": "yupek-logo-ornate-patch-crewneck-sweatshirt-boho-medallion-back-print-6ac5349aeeae231e00050f12",
                "variants": [
                    {
                        "size": "S",
                        "color": "Ash",
                        "variant_id": None,
                    },
                    {
                        "size": "M",
                        "color": "Ash",
                        "variant_id": None,
                    },
                ],
            }
        ]

        enriched = _enrich_catalog_variants(raw_products)
        # Sweatshirt Ash S is 25377, Ash M is 25408
        self.assertEqual(enriched[0]["variants"][0].get("variant_id"), 25377)
        self.assertEqual(enriched[0]["variants"][1].get("variant_id"), 25408)

    def test_no_matching_variant_leaves_unverified(self):
        """Case 4: variant that does not exist in trusted catalog -> leaves variant_id untouched (never guesses)."""
        raw_products = [
            {
                "id": "printify-6ac53807209b79f0950c038f",
                "supplierProductId": "6ac53807209b79f0950c038f",
                "slug": "yupek-logo-small-chest-print-white-cotton-shirt-6ac53807209b79f0950c038f",
                "variants": [
                    {
                        "size": "NonExistentSize",
                        "color": "NeonPink",
                        "variant_id": None,
                    }
                ],
            }
        ]

        enriched = _enrich_catalog_variants(raw_products)
        # Must NOT invent any variant ID
        self.assertIsNone(enriched[0]["variants"][0].get("variant_id"))

    def test_malformed_product_data_handled_safely(self):
        """Case 5: malformed products and variants -> handled gracefully without crashing."""
        malformed = [
            {},
            {"id": None, "variants": None},
            {"id": "unknown-prod", "variants": [{}]},
            {"id": "printify-unknown", "variants": [{"size": None, "color": None, "variant_id": None}]},
            {"variants": [{"size": 123, "color": False, "variant_id": "invalid"}]},
        ]

        enriched = _enrich_catalog_variants(malformed)
        self.assertEqual(len(enriched), len(malformed))

    def test_prevention_of_mismatched_variant_ids(self):
        """Case 6: never match by product name alone or cross-match different products."""
        raw_products = [
            {
                # Completely different/unknown product ID but similar name
                "id": "printify-completely-different-id",
                "supplierProductId": "completely-different-id",
                "slug": "some-other-shirt",
                "name": "Yupek Logo | Small Chest Print, White Cotton Shirt",  # Identical title
                "variants": [
                    {
                        "size": "M",
                        "color": "White",
                        "variant_id": None,
                    }
                ],
            }
        ]

        enriched = _enrich_catalog_variants(raw_products)
        # Must NOT cross-match using title alone!
        self.assertIsNone(enriched[0]["variants"][0].get("variant_id"))


if __name__ == "__main__":
    unittest.main()
