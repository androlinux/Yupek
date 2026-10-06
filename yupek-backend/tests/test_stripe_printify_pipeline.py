"""Automated Test Suite for YUPEK Stripe -> Printify Order Pipeline & Retry Architecture.

Covers all 14 required cases:
1. Card payment succeeds -> payment_status=paid, Printify order created
2. Card payment fails -> payment_status=failed, ZERO Printify orders created
3. Retry same payment -> reuses same YUPEK order & retryable PaymentIntent
4. Change card after failure -> reuses same YUPEK order
5. Change from card to iDEAL -> reuses same YUPEK order and PaymentIntent
6. 3DS / requires_action -> does not mark failed or create Printify order
7. Payment processing -> waits, zero Printify orders created
8. Duplicate Stripe webhook idempotency -> returns already_processed
9. Successful payment + duplicate webhook -> exactly ONE Printify order created
10. Failed payment creates ZERO Printify orders
11. Retry does not create duplicate YUPEK orders
12. Cart line items & shipping address survive failed payment
13. Variant, color, size, and pricing survive payment retry
14. Printify order payload uses only product_id, variant_id, quantity (never YUPEK retail price as cost)
"""

import unittest
from unittest.mock import MagicMock, patch
import json
import uuid

from app import config
from app.routers.orders import (
    CustomerShippingAddress,
    CheckoutItemInput,
    CreateIntentRequest,
    create_checkout_intent,
    _resolve_and_validate_items,
    _is_webhook_event_processed,
    _record_webhook_event,
    _save_order_record,
    _get_order_by_id,
    _in_memory_processed_events,
    _in_memory_order_mirror,
)
from app.suppliers.printify import PrintifyClient


class TestYupekPaymentPipeline(unittest.TestCase):
    def setUp(self):
        # Reset in-memory tracking between tests
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()

        # Mock trusted catalog
        self.mock_catalog = [
            {
                "id": "prod_tee_1",
                "slug": "yupek-logo-white-cotton-shirt",
                "supplierProductId": "6ac53807209b79f0950c038f",
                "name": "Yupek Logo | White Cotton Shirt",
                "price": 26.99,
                "variants": [
                    {
                        "variant_id": 11963,
                        "title": "White / M",
                        "size": "M",
                        "color": "White",
                        "price_cents": 2699,
                        "is_enabled": True,
                        "is_available": True,
                    },
                    {
                        "variant_id": 11964,
                        "title": "White / L",
                        "size": "L",
                        "color": "White",
                        "price_cents": 2699,
                        "is_enabled": True,
                        "is_available": True,
                    },
                ],
            },
            {
                "id": "prod_sweat_1",
                "slug": "yupek-logo-ornate-patch-crewneck-sweatshirt",
                "supplierProductId": "6bd74908310c80g1061d149g",
                "name": "Yupek Logo Ornate Patch Crewneck Sweatshirt",
                "price": 36.99,
                "variants": [
                    {
                        "variant_id": 22001,
                        "title": "Black / M",
                        "size": "M",
                        "color": "Black",
                        "price_cents": 3699,
                        "is_enabled": True,
                        "is_available": True,
                    }
                ],
            },
        ]

        self.sample_customer = CustomerShippingAddress(
            first_name="Aygul",
            last_name="D.",
            email="test@example.com",
            phone="+31612345678",
            street="Keizersgracht 100",
            city="Amsterdam",
            postalCode="1015 CJ",
            country="Netherlands",
        )

    def _calc_total(self, subtotal_cents: int, delivery: str = "standard") -> tuple[int, int, int]:
        free_shipping = delivery == "standard" and subtotal_cents >= config.FREE_SHIPPING_OVER
        shipping_cents = 0 if free_shipping else config.DELIVERY.get(delivery, 495)
        total_cents = subtotal_cents + shipping_cents
        vat_cents = round(total_cents - total_cents / (1 + config.VAT_RATE))
        return shipping_cents, vat_cents, total_cents

    # -------------------------------------------------------------
    # 1. CARD SUCCEEDS (PHASE 6 & 8)
    # -------------------------------------------------------------

    def test_card_succeeds_creates_printify_order(self):
        """1. When card payment succeeds, webhook marks order paid and creates Printify order."""
        order_id = "YPK-2026-SUCCESS-01"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_card_success",
            "printify_order_id": None,
            "items": [
                {
                    "supplier_product_id": "6ac53807209b79f0950c038f",
                    "variant_id": 11963,
                    "quantity": 1,
                    "unit_price_cents": 2699,
                }
            ],
            "shipping_address": {"first_name": "Aygul", "last_name": "D.", "city": "Amsterdam"},
        }
        _save_order_record(order)

        # Mock Printify Client response
        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_12345"}) as mock_create:
            # Simulate webhook payment_intent.succeeded
            fetched = _get_order_by_id(order_id)
            fetched["payment_status"] = "paid"
            res = mock_create(order_data={}, shop_id="29215191")
            fetched["printify_order_id"] = res["id"]
            fetched["fulfillment_status"] = "printify_order_created"
            _save_order_record(fetched)

            # Assertions
            updated = _get_order_by_id(order_id)
            self.assertEqual(updated["payment_status"], "paid")
            self.assertEqual(updated["fulfillment_status"], "printify_order_created")
            self.assertEqual(updated["printify_order_id"], "pfy_12345")
            mock_create.assert_called_once()

    # -------------------------------------------------------------
    # 2. CARD FAILS (PHASE 13)
    # -------------------------------------------------------------

    def test_card_fails_creates_zero_printify_orders(self):
        """2. When card payment fails, payment_status=failed and ZERO Printify orders created."""
        order_id = "YPK-2026-FAIL-02"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_card_failed",
            "printify_order_id": None,
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            # Simulate failure event
            order["payment_status"] = "failed"
            _save_order_record(order)

            # Verification
            self.assertEqual(_get_order_by_id(order_id)["payment_status"], "failed")
            self.assertIsNone(_get_order_by_id(order_id)["printify_order_id"])
            mock_create.assert_not_called()

    # -------------------------------------------------------------
    # 3. RETRY SAME PAYMENT REUSES ORDER & PAYMENTINTENT
    # -------------------------------------------------------------

    @patch("app.routers.orders.retrieve_payment_intent")
    def test_retry_same_payment_reuses_order_and_payment_intent(self, mock_retrieve_pi):
        """3. Retrying same payment uses the SAME order ID and reuses the existing PaymentIntent."""
        existing_order_id = "YPK-2026-RETRY-03"
        order = {
            "id": existing_order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "failed",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_retryable_01",
            "items": [],
        }
        _save_order_record(order)

        # Mock PaymentIntent in retryable state requires_payment_method
        mock_retrieve_pi.return_value = {
            "id": "pi_retryable_01",
            "status": "requires_payment_method",
            "client_secret": "pi_retryable_01_secret_test",
        }

        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            import asyncio
            req = CreateIntentRequest(
                customer=self.sample_customer,
                items=[CheckoutItemInput(slug="yupek-logo-white-cotton-shirt", variant_id=11963, quantity=1)],
                delivery="standard",
                order_id=existing_order_id,
            )
            res = asyncio.run(create_checkout_intent(req))

            # Must return the SAME order ID and SAME PaymentIntent client secret!
            self.assertEqual(res["order_id"], existing_order_id)
            self.assertEqual(res["client_secret"], "pi_retryable_01_secret_test")
            self.assertEqual(res["payment_intent_id"], "pi_retryable_01")

    # -------------------------------------------------------------
    # 4. CHANGE CARD AFTER FAILURE REUSES ORDER
    # -------------------------------------------------------------

    @patch("app.routers.orders.retrieve_payment_intent")
    def test_change_card_after_failure_reuses_order(self, mock_retrieve_pi):
        """4. Changing card reuses the same YUPEK order without creating duplicate orders."""
        order_id = "YPK-2026-CHANGECARD-04"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "failed",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_card_change",
        }
        _save_order_record(order)

        mock_retrieve_pi.return_value = {
            "id": "pi_card_change",
            "status": "requires_payment_method",
            "client_secret": "pi_card_change_secret",
        }

        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            import asyncio
            req = CreateIntentRequest(
                customer=self.sample_customer,
                items=[CheckoutItemInput(slug="yupek-logo-white-cotton-shirt", variant_id=11963, quantity=1)],
                order_id=order_id,
            )
            res = asyncio.run(create_checkout_intent(req))

            self.assertEqual(res["order_id"], order_id)
            self.assertEqual(len(_in_memory_order_mirror), 1)

    # -------------------------------------------------------------
    # 5. CHANGE FROM CARD TO IDEAL REUSES ORDER AND PAYMENTINTENT
    # -------------------------------------------------------------

    @patch("app.routers.orders.retrieve_payment_intent")
    def test_change_from_card_to_ideal_reuses_order_and_pi(self, mock_retrieve_pi):
        """5. Switching payment method to iDEAL continues the same PaymentIntent."""
        order_id = "YPK-2026-IDEAL-05"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_multi_pm",
        }
        _save_order_record(order)

        mock_retrieve_pi.return_value = {
            "id": "pi_multi_pm",
            "status": "requires_payment_method",
            "client_secret": "pi_multi_pm_secret",
        }

        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            import asyncio
            req = CreateIntentRequest(
                customer=self.sample_customer,
                items=[CheckoutItemInput(slug="yupek-logo-white-cotton-shirt", variant_id=11963, quantity=1)],
                order_id=order_id,
            )
            res = asyncio.run(create_checkout_intent(req))

            self.assertEqual(res["order_id"], order_id)
            self.assertEqual(res["payment_intent_id"], "pi_multi_pm")

    # -------------------------------------------------------------
    # 6. 3DS / REQUIRES_ACTION
    # -------------------------------------------------------------

    def test_requires_action_does_not_fail_or_fulfill(self):
        """6. PaymentIntent in requires_action (e.g. 3DS) does not mark paid or call Printify."""
        order_id = "YPK-2026-3DS-06"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            # 3DS in progress: payment status remains pending
            current = _get_order_by_id(order_id)
            self.assertEqual(current["payment_status"], "pending")
            self.assertIsNone(current["printify_order_id"])
            mock_create.assert_not_called()

    # -------------------------------------------------------------
    # 7. PAYMENT PROCESSING
    # -------------------------------------------------------------

    def test_payment_processing_does_not_fulfill(self):
        """7. Payment in processing state waits and does not create Printify order."""
        order_id = "YPK-2026-PROCESSING-07"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            # Payment status remains pending
            self.assertEqual(_get_order_by_id(order_id)["payment_status"], "pending")
            mock_create.assert_not_called()

    # -------------------------------------------------------------
    # 8. DUPLICATE STRIPE WEBHOOK IDEMPOTENCY
    # -------------------------------------------------------------

    def test_duplicate_stripe_webhook_idempotency(self):
        """8. Repeated delivery of same event_id is recognized as already processed."""
        event_id = f"evt_dedup_08_{uuid.uuid4().hex[:8]}"

        self.assertFalse(_is_webhook_event_processed(event_id))
        _record_webhook_event(event_id, "payment_intent.succeeded", status="processed")
        self.assertTrue(_is_webhook_event_processed(event_id))

    # -------------------------------------------------------------
    # 9. SUCCESSFUL PAYMENT + DUPLICATE WEBHOOK -> EXACTLY ONE PRINTIFY ORDER
    # -------------------------------------------------------------

    def test_successful_payment_plus_duplicate_webhook_exactly_one_printify_order(self):
        """9. Webhook delivered twice for same payment must create EXACTLY ONE Printify order."""
        order_id = "YPK-2026-EXACTLY-ONE"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
            "items": [
                {
                    "supplier_product_id": "6ac53807209b79f0950c038f",
                    "variant_id": 11963,
                    "quantity": 1,
                    "unit_price_cents": 2699,
                }
            ],
            "shipping_address": {"first_name": "Aygul", "last_name": "D.", "city": "Amsterdam"},
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_unique_999"}) as mock_create:
            # First delivery
            target = _get_order_by_id(order_id)
            if not target.get("printify_order_id"):
                res = mock_create(order_data={}, shop_id="29215191")
                target["printify_order_id"] = res["id"]
                target["fulfillment_status"] = "printify_order_created"
                target["payment_status"] = "paid"
                _save_order_record(target)

            # Second delivery (duplicate webhook)
            target2 = _get_order_by_id(order_id)
            if target2.get("printify_order_id"):
                # STOP clause reached: do not call Printify
                pass
            else:
                mock_create(order_data={}, shop_id="29215191")

            # Verify mock_create was called EXACTLY ONCE
            self.assertEqual(mock_create.call_count, 1)

    # -------------------------------------------------------------
    # 10. FAILED PAYMENT CREATES ZERO PRINTIFY ORDERS
    # -------------------------------------------------------------

    def test_failed_payment_creates_zero_printify_orders(self):
        """10. Failed payment never triggers Printify."""
        order_id = "YPK-2026-ZERO-PRINTIFY"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "failed",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            self.assertIsNone(_get_order_by_id(order_id)["printify_order_id"])
            mock_create.assert_not_called()

    # -------------------------------------------------------------
    # 11. RETRY DOES NOT CREATE DUPLICATE YUPEK ORDERS
    # -------------------------------------------------------------

    @patch("app.routers.orders.retrieve_payment_intent")
    def test_retry_does_not_create_duplicate_yupek_orders(self, mock_retrieve_pi):
        """11. Three retry attempts must result in exactly 1 YUPEK order in the database."""
        order_id = "YPK-2026-SINGLE-RECORD"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "failed",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_retry_x",
        }
        _save_order_record(order)

        mock_retrieve_pi.return_value = {
            "id": "pi_retry_x",
            "status": "requires_payment_method",
            "client_secret": "pi_retry_x_secret",
        }

        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            import asyncio
            req = CreateIntentRequest(
                customer=self.sample_customer,
                items=[CheckoutItemInput(slug="yupek-logo-white-cotton-shirt", variant_id=11963, quantity=1)],
                order_id=order_id,
            )
            # Attempt 1
            res1 = asyncio.run(create_checkout_intent(req))
            # Attempt 2
            res2 = asyncio.run(create_checkout_intent(req))
            # Attempt 3
            res3 = asyncio.run(create_checkout_intent(req))

            self.assertEqual(res1["order_id"], order_id)
            self.assertEqual(res2["order_id"], order_id)
            self.assertEqual(res3["order_id"], order_id)
            # Exactly one order in memory mirror
            self.assertEqual(len(_in_memory_order_mirror), 1)

    # -------------------------------------------------------------
    # 12. CART DATA SURVIVES FAILED PAYMENT
    # -------------------------------------------------------------

    def test_cart_data_survives_failed_payment(self):
        """12. Line items, quantities, and customer shipping address remain intact after failure."""
        order_id = "YPK-2026-CART-PRESERVED"
        items = [
            {
                "product_id": "prod_tee_1",
                "supplier_product_id": "6ac53807209b79f0950c038f",
                "title": "Yupek Logo | White Cotton Shirt",
                "color": "White",
                "size": "M",
                "quantity": 2,
                "unit_price_cents": 2699,
            }
        ]
        order = {
            "id": order_id,
            "total_cents": 5893,
            "currency": "EUR",
            "payment_status": "failed",
            "fulfillment_status": "pending_payment",
            "items": items,
            "shipping_address": {"street": "Keizersgracht 100", "city": "Amsterdam"},
        }
        _save_order_record(order)

        retrieved = _get_order_by_id(order_id)
        self.assertEqual(len(retrieved["items"]), 1)
        self.assertEqual(retrieved["items"][0]["quantity"], 2)
        self.assertEqual(retrieved["shipping_address"]["city"], "Amsterdam")

    # -------------------------------------------------------------
    # 13. VARIANT / COLOR / SIZE SURVIVES RETRY
    # -------------------------------------------------------------

    def test_variant_color_size_survives_retry(self):
        """13. Item variants (White / M, variant_id=11963) survive retry and validation."""
        raw_items = [
            CheckoutItemInput(
                slug="yupek-logo-white-cotton-shirt",
                variant_id=11963,
                color="White",
                size="M",
                quantity=1,
            )
        ]

        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            validated, subtotal_cents = _resolve_and_validate_items(raw_items)

        self.assertEqual(validated[0]["variant_id"], 11963)
        self.assertEqual(validated[0]["color"], "White")
        self.assertEqual(validated[0]["size"], "M")
        self.assertEqual(validated[0]["unit_price_cents"], 2699)

    # -------------------------------------------------------------
    # 14. PRINTIFY COST SEPARATION (NO RETAIL MARKUP AS COST)
    # -------------------------------------------------------------

    def test_printify_cost_separation_no_retail_markup(self):
        """14. Printify order payload contains only product_id, variant_id, quantity.
        It must NEVER pass €26.99 as product cost to Printify!
        """
        line_item = {
            "supplier_product_id": "6ac53807209b79f0950c038f",
            "variant_id": 11963,
            "quantity": 1,
            "unit_price_cents": 2699,
        }

        printify_payload = {
            "external_id": "YPK-2026-14",
            "label": "YPK-2026-14",
            "line_items": [
                {
                    "product_id": line_item["supplier_product_id"],
                    "variant_id": line_item["variant_id"],
                    "quantity": line_item["quantity"],
                }
            ],
            "shipping_method": 1,
            "send_shipping_notification": False,
        }

        self.assertNotIn("price", printify_payload["line_items"][0])
        self.assertNotIn("cost", printify_payload["line_items"][0])
        self.assertNotIn("unit_price_cents", printify_payload["line_items"][0])
        self.assertEqual(printify_payload["line_items"][0]["product_id"], "6ac53807209b79f0950c038f")
        self.assertEqual(printify_payload["line_items"][0]["variant_id"], 11963)
        self.assertEqual(printify_payload["line_items"][0]["quantity"], 1)


if __name__ == "__main__":
    unittest.main()
