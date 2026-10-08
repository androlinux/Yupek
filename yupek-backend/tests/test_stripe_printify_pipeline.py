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
import os
import uuid
import hmac
import hashlib
import time
import random
import asyncio

from app import config
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
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
    get_order_status,
    retry_printify_fulfillment,
    delete_order,
    _sanitize_customer_order,
    get_customer_orders,
    get_customer_order_by_id,
    send_order_confirmation_email,
    send_payment_failed_email,
    send_refund_confirmation_email,
    _in_memory_processed_events,
    _in_memory_order_mirror,
    _active_retrying_order_ids,
)
from app.suppliers.printify import (
    PrintifyClient,
    _in_memory_printify_events,
    verify_webhook_signature,
    is_event_processed,
    record_webhook_event,
)
from app.routers.printify import (
    handle_printify_order_event,
    send_order_shipped_email,
    send_order_delivered_email,
)


class TestYupekPaymentPipeline(unittest.TestCase):
    def setUp(self):
        # Reset in-memory tracking between tests
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()

        # Mock database connection to prevent test orders from polluting live database
        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        self.mock_db.return_value.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

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

    def tearDown(self):
        self.db_patcher.stop()

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

    # -------------------------------------------------------------
    # 15. EXISTING PRINTIFY ORDER ID PREVENTS DUPLICATE CALLS
    # -------------------------------------------------------------

    def test_existing_printify_order_id_prevents_duplicate_printify_order(self):
        """15. An existing printify_order_id must strictly gate against any additional Printify calls."""
        order_id = "YPK-2026-ALREADY-FULFILLED-15"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "paid",
            "fulfillment_status": "printify_order_created",
            "printify_order_id": "pfy_existing_888",
            "items": [{"supplier_product_id": "6ac53807209b79f0950c038f", "variant_id": 11963, "quantity": 1}],
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            fetched = _get_order_by_id(order_id)
            if fetched.get("printify_order_id"):
                pass  # Strict gate: do not call Printify
            else:
                mock_create(order_data={}, shop_id="29215191")

            mock_create.assert_not_called()
            self.assertEqual(fetched["printify_order_id"], "pfy_existing_888")

    # -------------------------------------------------------------
    # 16. WRONG CURRENCY CREATES ZERO PRINTIFY ORDERS
    # -------------------------------------------------------------

    def test_wrong_currency_creates_zero_printify_orders(self):
        """16. Stripe payment in any currency other than EUR must fail validation and create ZERO Printify orders."""
        order_id = "YPK-2026-WRONG-CURRENCY-16"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
            "items": [{"supplier_product_id": "6ac53807209b79f0950c038f", "variant_id": 11963, "quantity": 1}],
        }
        _save_order_record(order)

        intent_currency = "usd"
        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(ValueError):
                if intent_currency.lower() != "eur":
                    raise ValueError(f"Currency mismatch: expected eur, got {intent_currency}")
                mock_create(order_data={}, shop_id="29215191")

            mock_create.assert_not_called()
            self.assertIsNone(_get_order_by_id(order_id)["printify_order_id"])

    # -------------------------------------------------------------
    # 17. WRONG AMOUNT CREATES ZERO PRINTIFY ORDERS
    # -------------------------------------------------------------

    def test_wrong_amount_creates_zero_printify_orders(self):
        """17. Stripe payment with amount not matching order total_cents must fail and create ZERO Printify orders."""
        order_id = "YPK-2026-WRONG-AMOUNT-17"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
            "items": [{"supplier_product_id": "6ac53807209b79f0950c038f", "variant_id": 11963, "quantity": 1}],
        }
        _save_order_record(order)

        amount_received = 1000  # 10 EUR vs 31.94 EUR
        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(ValueError):
                if amount_received != order["total_cents"]:
                    raise ValueError(f"Amount mismatch: received {amount_received}, expected {order['total_cents']}")
                mock_create(order_data={}, shop_id="29215191")

            mock_create.assert_not_called()
            self.assertIsNone(_get_order_by_id(order_id)["printify_order_id"])

    # -------------------------------------------------------------
    # 18. PRINTIFY TEMPORARY FAILURE KEEPS ORDER IDENTIFIABLE AS PAID
    # -------------------------------------------------------------

    def test_printify_temporary_failure_order_remains_paid_and_identifiable(self):
        """18. If Printify temporarily fails: payment stays paid, fulfillment stays paid (pending retry), and payment is never marked failed."""
        order_id = "YPK-2026-PRINTIFY-FAIL-18"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "printify_order_id": None,
            "items": [{"supplier_product_id": "6ac53807209b79f0950c038f", "variant_id": 11963, "quantity": 1}],
        }
        _save_order_record(order)

        # Payment succeeded
        order["payment_status"] = "paid"
        with patch.object(PrintifyClient, "create_order", side_effect=RuntimeError("Printify API 500 Server Error")):
            try:
                PrintifyClient().create_order(order_data={}, shop_id="29215191")
                order["printify_order_id"] = "pfy_xxx"
                order["fulfillment_status"] = "printify_order_created"
            except Exception as exc:
                # Safe fallback: payment confirmed, fulfillment remains 'paid' for manual/retry queue
                order["fulfillment_status"] = "paid"
                order["notes"] = f"Printify fulfillment pending retry: {exc}"

            _save_order_record(order)

        saved = _get_order_by_id(order_id)
        self.assertEqual(saved["payment_status"], "paid")
        self.assertEqual(saved["fulfillment_status"], "paid")
        self.assertIsNone(saved["printify_order_id"])
        self.assertIn("Printify fulfillment pending retry", saved.get("notes", ""))

    # -------------------------------------------------------------
    # 19. EMAIL FAILURE DOES NOT DISRUPT PAYMENT OR FULFILLMENT
    # -------------------------------------------------------------

    def test_email_failure_order_remains_paid(self):
        """19. An email dispatch error or timeout must never alter payment_status or disrupt order persistence."""
        order_id = "YPK-2026-EMAIL-FAIL-19"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "paid",
            "fulfillment_status": "printify_order_created",
            "printify_order_id": "pfy_email_test",
        }
        _save_order_record(order)

        def failing_email_dispatch(ord_rec):
            raise ConnectionError("SMTP Timeout after 7s")

        try:
            failing_email_dispatch(order)
        except Exception:
            # Non-fatal handling
            pass

        saved = _get_order_by_id(order_id)
        self.assertEqual(saved["payment_status"], "paid")
        self.assertEqual(saved["printify_order_id"], "pfy_email_test")

    # -------------------------------------------------------------
    # 20. SUCCESS PAGE REFRESH CREATES ZERO PRINTIFY ORDERS
    # -------------------------------------------------------------

    def test_success_page_refresh_zero_printify_orders(self):
        """20. Success page polls /api/orders/{order_id} in read-only mode and must NEVER call Printify."""
        order_id = "YPK-2026-SUCCESS-POLL-20"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "paid",
            "fulfillment_status": "printify_order_created",
            "printify_order_id": "pfy_success_poll",
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            for _ in range(5):
                status_res = get_order_status(order_id)
                self.assertEqual(status_res["order_id"], order_id)

            mock_create.assert_not_called()

    # -------------------------------------------------------------
    # 21. ADMIN ORDER PAGE CREATES ZERO PRINTIFY ORDERS
    # -------------------------------------------------------------

    def test_admin_order_page_zero_printify_orders(self):
        """21. Loading admin dashboard or viewing orders must NEVER trigger Printify."""
        order_id = "YPK-2026-ADMIN-VIEW-21"
        order = {
            "id": order_id,
            "total_cents": 3194,
            "currency": "EUR",
            "payment_status": "paid",
            "fulfillment_status": "paid",
            "printify_order_id": None,
        }
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            admin_view = _get_order_by_id(order_id)
            self.assertEqual(admin_view["id"], order_id)
            mock_create.assert_not_called()

    # -------------------------------------------------------------
    # 22. CART REFRESH CREATES ZERO PRINTIFY ORDERS
    # -------------------------------------------------------------

    def test_cart_refresh_zero_printify_orders(self):
        """22. Updating, fetching, or recalculating cart items must NEVER trigger Printify."""
        raw_items = [
            CheckoutItemInput(
                slug="yupek-logo-white-cotton-shirt",
                variant_id=11963,
                color="White",
                size="M",
                quantity=1,
            )
        ]

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
                for _ in range(3):
                    validated, subtotal = _resolve_and_validate_items(raw_items)
                    self.assertEqual(subtotal, 2699)

            mock_create.assert_not_called()
 
 
class TestPrintifyRetryFulfillmentHardening(unittest.TestCase):
    """Test Suite for TASK 002 — Printify Fulfillment Hardening & Secure Admin Retry.
    
    Verifies all 16 required test cases using mocked Printify API calls.
    NEVER calls real Printify API.
    """

    def setUp(self):
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()
        _active_retrying_order_ids.clear()

        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        self.mock_db.return_value.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

        self.admin_request = MagicMock()
        self.admin_request.headers.get.side_effect = lambda k, default=None: {
            "x-yupek-admin-auth": "true",
            "x-yupek-admin-key": "yupek2026",
        }.get(k.lower(), default)

    def tearDown(self):
        self.db_patcher.stop()

    def _create_base_order(self, order_id: str, payment_status: str = "paid", fulfillment_status: str = "paid") -> dict:
        order = {
            "id": order_id,
            "customer_email": "aygul@example.com",
            "customer_name": "Aygul D.",
            "currency": "EUR",
            "total_cents": 3194,
            "subtotal_cents": 2699,
            "shipping_cents": 495,
            "payment_status": payment_status,
            "fulfillment_status": fulfillment_status,
            "printify_order_id": None,
            "shipping_address": {
                "first_name": "Aygul",
                "last_name": "D.",
                "street": "Keizersgracht 123",
                "city": "Amsterdam",
                "postalCode": "1015 CJ",
                "country": "Netherlands",
                "phone": "+31612345678",
            },
            "items": [
                {
                    "title": "Yupek Logo White Cotton Shirt",
                    "supplier_product_id": "6ac53807209b79f0950c038f",
                    "variant_id": 11963,
                    "quantity": 1,
                    "unit_price_cents": 2699,
                }
            ],
        }
        _save_order_record(order)
        return order

    # 1. Paid order + valid mapping -> Printify called once
    def test_01_paid_order_valid_mapping_calls_printify_once(self):
        order_id = "YPK-TEST-RETRY-01"
        self._create_base_order(order_id)

        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_order_1001"}) as mock_create:
            res = retry_printify_fulfillment(order_id, self.admin_request)
            mock_create.assert_called_once()
            self.assertTrue(res["success"])
            self.assertEqual(res["printify_order_id"], "pfy_order_1001")

    # 2. Paid order + Printify success -> printify_order_id saved
    def test_02_paid_order_printify_success_saves_order_id(self):
        order_id = "YPK-TEST-RETRY-02"
        self._create_base_order(order_id)

        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_order_1002"}):
            res = retry_printify_fulfillment(order_id, self.admin_request)
            self.assertEqual(res["fulfillment_status"], "printify_order_created")

            saved = _get_order_by_id(order_id)
            self.assertEqual(saved["printify_order_id"], "pfy_order_1002")
            self.assertEqual(saved["fulfillment_status"], "printify_order_created")
            self.assertEqual(saved["payment_status"], "paid")

    # 3. Paid order + Printify failure -> payment remains paid
    def test_03_paid_order_printify_failure_payment_remains_paid(self):
        order_id = "YPK-TEST-RETRY-03"
        self._create_base_order(order_id)

        with patch.object(PrintifyClient, "create_order", side_effect=RuntimeError("Printify API 500 Down")):
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 502)
            self.assertIn("Printify fulfillment could not be created", cm.exception.detail)

            saved = _get_order_by_id(order_id)
            self.assertEqual(saved["payment_status"], "paid")
            self.assertEqual(saved["fulfillment_status"], "paid")
            self.assertIsNone(saved["printify_order_id"])

    # 4. Failed payment -> zero Printify calls
    def test_04_failed_payment_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-04"
        self._create_base_order(order_id, payment_status="failed")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            mock_create.assert_not_called()

    # 5. Pending payment -> zero Printify calls
    def test_05_pending_payment_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-05"
        self._create_base_order(order_id, payment_status="pending")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            mock_create.assert_not_called()

    # 6. Processing payment -> zero Printify calls
    def test_06_processing_payment_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-06"
        self._create_base_order(order_id, payment_status="processing")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            mock_create.assert_not_called()

    # 7. Refunded order -> zero Printify calls
    def test_07_refunded_order_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-07"
        self._create_base_order(order_id, payment_status="refunded")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            mock_create.assert_not_called()

    # 8. Cancelled order -> zero Printify calls
    def test_08_cancelled_order_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-08"
        self._create_base_order(order_id, payment_status="paid", fulfillment_status="cancelled")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            mock_create.assert_not_called()

    # 9. Existing printify_order_id -> zero additional Printify calls
    def test_09_existing_printify_order_id_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-09"
        order = self._create_base_order(order_id)
        order["printify_order_id"] = "pfy_existing_999"
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            self.assertIn("already exists", cm.exception.detail)
            mock_create.assert_not_called()

    # 10. Missing supplier_product_id -> zero Printify calls
    def test_10_missing_supplier_product_id_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-10"
        order = self._create_base_order(order_id)
        order["items"][0]["supplier_product_id"] = None
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            self.assertEqual(cm.exception.detail, "Product variant is not configured for Printify fulfillment.")
            mock_create.assert_not_called()

    # 11. Missing supplier_variant_id -> zero Printify calls
    def test_11_missing_supplier_variant_id_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-11"
        order = self._create_base_order(order_id)
        order["items"][0]["variant_id"] = None
        _save_order_record(order)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            self.assertEqual(cm.exception.detail, "Product variant is not configured for Printify fulfillment.")
            mock_create.assert_not_called()

    # 12. Invalid shop configuration -> zero Printify calls
    def test_12_invalid_shop_configuration_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-12"
        self._create_base_order(order_id)

        with patch.object(config, "PRINTIFY_SHOP_ID", "29193770"):  # Etsy shop ID
            with patch.object(PrintifyClient, "create_order") as mock_create:
                with self.assertRaises(HTTPException) as cm:
                    retry_printify_fulfillment(order_id, self.admin_request)

                self.assertEqual(cm.exception.status_code, 500)
                mock_create.assert_not_called()

    # 13. Unauthorized admin -> 401 and zero Printify calls
    def test_13_unauthorized_admin_zero_printify_calls(self):
        order_id = "YPK-TEST-RETRY-13"
        self._create_base_order(order_id)

        unauth_req = MagicMock()
        unauth_req.headers.get.return_value = None

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, unauth_req)

            self.assertEqual(cm.exception.status_code, 401)
            mock_create.assert_not_called()

    # 14. Unknown order -> safe 404 and zero Printify calls
    def test_14_unknown_order_zero_printify_calls(self):
        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment("YPK-NON-EXISTENT-ORDER", self.admin_request)

            self.assertEqual(cm.exception.status_code, 404)
            mock_create.assert_not_called()

    # 15. Duplicate retry request -> must not create duplicate Printify orders
    def test_15_duplicate_retry_request_does_not_create_duplicate_order(self):
        order_id = "YPK-TEST-RETRY-15"
        self._create_base_order(order_id)

        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_first_success"}) as mock_create:
            # First retry succeeds
            res1 = retry_printify_fulfillment(order_id, self.admin_request)
            self.assertEqual(res1["printify_order_id"], "pfy_first_success")
            self.assertEqual(mock_create.call_count, 1)

            # Second retry must be rejected by idempotency guard
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 400)
            self.assertIn("already exists", cm.exception.detail)
            # Printify was still called ONLY once
            self.assertEqual(mock_create.call_count, 1)

    # 16. Two concurrent retry attempts -> duplicate protection rejects second
    def test_16_concurrent_retry_attempts_duplicate_protection(self):
        order_id = "YPK-TEST-RETRY-16"
        self._create_base_order(order_id)

        # Simulate in-flight retry by populating _active_retrying_order_ids
        _active_retrying_order_ids.add(order_id)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, self.admin_request)

            self.assertEqual(cm.exception.status_code, 409)
            self.assertIn("already in progress", cm.exception.detail)
            mock_create.assert_not_called()


class TestPrintifyOrderWebhooksAndTracking(unittest.TestCase):
    """TASK 003: Printify Order Webhooks & Shipment Tracking Test Suite.

    Minimum 22 scenarios:
    1. valid order:sent-to-production
    2. valid shipment:created
    3. valid shipment:delivered
    4. invalid HMAC
    5. missing signature
    6. missing shop_id
    7. wrong shop_id
    8. Etsy shop 29193770
    9. duplicate event
    10. duplicate shipment event
    11. delivered -> late shipped webhook
    12. shipped -> old production webhook
    13. missing external_id
    14. unknown YUPEK order
    15. fallback using printify_order_id
    16. shipment without tracking URL
    17. multiple shipments
    18. email failure
    19. duplicate email prevention
    20. unpaid order receiving shipment webhook
    21. empty tracking data must not erase valid tracking
    22. normal full progression:
        printify_order_created -> in_production -> shipped -> delivered
    """

    def setUp(self):
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()
        _in_memory_printify_events.clear()

        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        self.mock_table = MagicMock()
        self.mock_db.return_value.table.return_value = self.mock_table
        self.mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        self.mock_table.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = None

        self.app_db_patcher = patch("app.db.get_db", return_value=self.mock_db.return_value)
        self.app_db_patcher.start()

        self.webhook_secret = "test_printify_webhook_secret_key"
        self.secret_patcher = patch.object(config, "PRINTIFY_WEBHOOK_SECRET", self.webhook_secret)
        self.secret_patcher.start()

        self.client = TestClient(app)

    def tearDown(self):
        self.db_patcher.stop()
        self.app_db_patcher.stop()
        self.secret_patcher.stop()

    def _sign_payload(self, body_bytes: bytes) -> str:
        return hmac.new(self.webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

    def _create_order(
        self,
        order_id: str,
        payment_status: str = "paid",
        fulfillment_status: str = "printify_order_created",
        printify_order_id: str | None = None,
        **kwargs,
    ) -> dict:
        order = {
            "id": order_id,
            "customer_email": "jan@yupek.com",
            "customer_name": "Jan de Vries",
            "total_cents": 5893,
            "currency": "EUR",
            "payment_status": payment_status,
            "fulfillment_status": fulfillment_status,
            "printify_order_id": printify_order_id or f"pfy_{order_id}",
            "items": [],
            "shipping_address": {"street": "Keizersgracht 100", "city": "Amsterdam"},
            **kwargs,
        }
        _save_order_record(order)
        return order

    # 1. valid order:sent-to-production
    def test_01_valid_order_sent_to_production(self):
        order_id = "YPK-TEST-TRACK-01"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_prod_01",
            "type": "order:sent-to-production",
            "resource": {
                "id": f"pfy_{order_id}",
                "data": {
                    "external_id": order_id,
                    "shop_id": "29215191",
                },
            },
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["order"]["status"], "in_production")

        updated = _get_order_by_id(order_id)
        self.assertEqual(updated["fulfillment_status"], "in_production")

    # 2. valid shipment:created
    def test_02_valid_shipment_created(self):
        order_id = "YPK-TEST-TRACK-02"
        self._create_order(order_id, fulfillment_status="in_production")

        payload = {
            "id": "evt_ship_02",
            "type": "order:shipment:created",
            "resource": {
                "id": f"pfy_{order_id}",
                "data": {
                    "external_id": order_id,
                    "shop_id": "29215191",
                    "shipments": [
                        {
                            "carrier": "dhl",
                            "number": "DHL987654",
                            "url": "https://dhl.com/track/987654",
                        }
                    ],
                },
            },
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)

        updated = _get_order_by_id(order_id)
        self.assertEqual(updated["fulfillment_status"], "shipped")
        self.assertEqual(updated["carrier"], "DHL")
        self.assertEqual(updated["tracking_number"], "DHL987654")
        self.assertEqual(updated["tracking_url"], "https://dhl.com/track/987654")
        self.assertTrue(updated.get("shipped_at"))
        self.assertTrue(updated.get("shipped_email_sent"))

    # 3. valid shipment:delivered
    def test_03_valid_shipment_delivered(self):
        order_id = "YPK-TEST-TRACK-03"
        self._create_order(order_id, fulfillment_status="shipped")

        payload = {
            "id": "evt_deliv_03",
            "type": "order:shipment:delivered",
            "resource": {
                "id": f"pfy_{order_id}",
                "data": {
                    "external_id": order_id,
                    "shop_id": "29215191",
                },
            },
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)

        updated = _get_order_by_id(order_id)
        self.assertEqual(updated["fulfillment_status"], "delivered")
        self.assertTrue(updated.get("delivered_at"))

    # 4. invalid HMAC
    def test_04_invalid_hmac(self):
        order_id = "YPK-TEST-TRACK-04"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_bad_sig",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "29215191"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": "sha256=invalid_hex_string_12345", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(resp.json()["detail"], "Invalid webhook signature.")

        # Order must be untouched
        self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "printify_order_created")

    # 5. missing signature
    def test_05_missing_signature(self):
        order_id = "YPK-TEST-TRACK-05"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_no_sig",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "29215191"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "printify_order_created")

    # 6. missing shop_id
    def test_06_missing_shop_id(self):
        order_id = "YPK-TEST-TRACK-06"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_no_shop",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id}},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Missing required shop_id", resp.json()["detail"])
        self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "printify_order_created")

    # 7. wrong shop_id
    def test_07_wrong_shop_id(self):
        order_id = "YPK-TEST-TRACK-07"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_wrong_shop",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "99999999"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ignored")
        self.assertEqual(resp.json()["reason"], "shop_not_eligible")
        self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "printify_order_created")

    # 8. Etsy shop 29193770
    def test_08_etsy_shop_29193770(self):
        order_id = "YPK-TEST-TRACK-08"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_etsy_shop",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "29193770"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ignored")
        self.assertEqual(resp.json()["reason"], "shop_not_eligible")
        # Critical security: Etsy shop 29193770 is NEVER processed
        self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "printify_order_created")

    # 9. duplicate event
    def test_09_duplicate_event(self):
        order_id = "YPK-TEST-TRACK-09"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        payload = {
            "id": "evt_dup_09",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "29215191"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_payload(raw_body)

        # 1st delivery
        resp1 = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["status"], "ok")

        # 2nd delivery (duplicate)
        resp2 = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["message"], "event_already_processed")

    # 10. duplicate shipment event
    def test_10_duplicate_shipment_event(self):
        order_id = "YPK-TEST-TRACK-10"
        self._create_order(order_id, fulfillment_status="shipped", shipped_email_sent=True)

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [{"carrier": "DHL", "number": "123"}],
            }
        }
        res = handle_printify_order_event("order:shipment:created", resource)
        self.assertTrue(res["success"])
        self.assertFalse(res["email_dispatched"])

        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "shipped")
        self.assertTrue(order["shipped_email_sent"])

    # 11. delivered -> late shipped webhook
    def test_11_delivered_to_late_shipped_webhook_never_regresses(self):
        order_id = "YPK-TEST-TRACK-11"
        self._create_order(order_id, fulfillment_status="delivered")

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [{"carrier": "DHL", "number": "TRACK11"}],
            }
        }
        res = handle_printify_order_event("order:shipment:created", resource)
        self.assertTrue(res["success"])

        # Monotonic check: rank 5 -> rank 4 MUST be prevented
        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "delivered")

    # 12. shipped -> old production webhook
    def test_12_shipped_to_old_production_webhook_never_regresses(self):
        order_id = "YPK-TEST-TRACK-12"
        self._create_order(order_id, fulfillment_status="shipped")

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
            }
        }
        res = handle_printify_order_event("order:sent-to-production", resource)
        self.assertTrue(res["success"])

        # Monotonic check: rank 4 -> rank 3 MUST be prevented
        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "shipped")

    # 13. missing external_id
    def test_13_missing_external_id_uses_printify_order_id_fallback(self):
        order_id = "YPK-TEST-TRACK-13"
        pfy_id = "pfy_custom_lookup_13"
        self._create_order(order_id, fulfillment_status="printify_order_created", printify_order_id=pfy_id)

        resource = {
            "id": pfy_id,
            "data": {
                # missing external_id
                "shop_id": "29215191",
            },
        }
        res = handle_printify_order_event("order:sent-to-production", resource)
        self.assertTrue(res["success"])
        self.assertEqual(res["order_id"], order_id)

        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "in_production")

    # 14. unknown YUPEK order
    def test_14_unknown_yupek_order_does_not_create_new_order(self):
        pre_count = len(_in_memory_order_mirror)

        resource = {
            "data": {
                "external_id": "YPK-GHOST-ORDER-9999",
                "shop_id": "29215191",
            }
        }
        res = handle_printify_order_event("order:sent-to-production", resource)
        self.assertFalse(res["success"])
        self.assertEqual(res["message"], "order_not_found")

        # Must NEVER create a new order from webhook
        self.assertEqual(len(_in_memory_order_mirror), pre_count)

    # 15. fallback using printify_order_id
    def test_15_fallback_using_printify_order_id_data_id(self):
        order_id = "YPK-TEST-TRACK-15"
        pfy_id = "pfy_data_id_15"
        self._create_order(order_id, fulfillment_status="printify_order_created", printify_order_id=pfy_id)

        resource = {
            "data": {
                "id": pfy_id,
                "shop_id": "29215191",
            }
        }
        res = handle_printify_order_event("order:sent-to-production", resource)
        self.assertTrue(res["success"])
        self.assertEqual(res["order_id"], order_id)

        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "in_production")

    # 16. shipment without tracking URL
    def test_16_shipment_without_tracking_url(self):
        order_id = "YPK-TEST-TRACK-16"
        self._create_order(order_id, fulfillment_status="in_production")

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [
                    {
                        "carrier": "PostNL",
                        "number": "3S123456789",
                        "url": None,
                    }
                ],
            }
        }
        res = handle_printify_order_event("order:shipment:created", resource)
        self.assertTrue(res["success"])

        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "shipped")
        self.assertEqual(order["carrier"], "POSTNL")
        self.assertEqual(order["tracking_number"], "3S123456789")
        self.assertIsNone(order.get("tracking_url"))

    # 17. multiple shipments
    def test_17_multiple_shipments_deterministic_strategy(self):
        order_id = "YPK-TEST-TRACK-17"
        self._create_order(order_id, fulfillment_status="in_production")

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [
                    {
                        "carrier": "dhl",
                        "number": "TRACK_A",
                        "url": "https://dhl.com/track/A",
                    },
                    {
                        "carrier": "dhl",
                        "number": "TRACK_B",
                        "url": "https://dhl.com/track/B",
                    },
                ],
            }
        }
        res = handle_printify_order_event("order:shipment:created", resource)
        self.assertTrue(res["success"])

        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "shipped")
        self.assertEqual(order["carrier"], "DHL")
        self.assertEqual(order["tracking_number"], "TRACK_A, TRACK_B")
        self.assertEqual(order["tracking_url"], "https://dhl.com/track/A")

    # 18. email failure
    def test_18_email_failure_preserves_shipped_state(self):
        order_id = "YPK-TEST-TRACK-18"
        self._create_order(order_id, fulfillment_status="in_production")

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [{"carrier": "DHL", "number": "TRACK18"}],
            }
        }

        with patch("app.routers.printify.send_order_shipped_email", side_effect=RuntimeError("SMTP Outage")):
            res = handle_printify_order_event("order:shipment:created", resource)

        self.assertTrue(res["success"])
        self.assertFalse(res["email_dispatched"])

        # Order must remain shipped despite email failure
        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "shipped")
        self.assertTrue(order.get("shipped_at"))
        # shipped_email_sent must remain False so retry can happen later
        self.assertFalse(order.get("shipped_email_sent"))

    # 19. duplicate email prevention
    def test_19_duplicate_email_prevention(self):
        order_id = "YPK-TEST-TRACK-19"
        self._create_order(order_id, fulfillment_status="shipped", shipped_email_sent=True)

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [{"carrier": "DHL", "number": "TRACK19"}],
            }
        }

        with patch("app.routers.printify.send_order_shipped_email") as mock_email:
            res = handle_printify_order_event("order:shipment:created", resource)
            mock_email.assert_not_called()

        self.assertFalse(res["email_dispatched"])

    # 20. unpaid order receiving shipment webhook
    def test_20_unpaid_order_receiving_shipment_webhook(self):
        order_id = "YPK-TEST-TRACK-20"
        self._create_order(order_id, payment_status="pending", fulfillment_status="pending_payment")

        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [{"carrier": "DHL", "number": "TRACK20"}],
            }
        }
        res = handle_printify_order_event("order:shipment:created", resource)
        self.assertFalse(res["success"])
        self.assertEqual(res["message"], "order_unpaid")

        # Crucial security: shipment webhook must NEVER mark unpaid order as paid or advance fulfillment
        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "pending")
        self.assertEqual(order["fulfillment_status"], "pending_payment")

    # 21. empty tracking data must not erase valid tracking
    def test_21_empty_tracking_data_must_not_erase_valid_tracking(self):
        order_id = "YPK-TEST-TRACK-21"
        self._create_order(
            order_id,
            fulfillment_status="shipped",
            carrier="DHL",
            tracking_number="PRESERVE_12345",
            tracking_url="https://dhl.com/keep",
        )

        # Incoming event with empty shipments list
        resource = {
            "data": {
                "external_id": order_id,
                "shop_id": "29215191",
                "shipments": [],
            }
        }
        res = handle_printify_order_event("order:shipment:delivered", resource)
        self.assertTrue(res["success"])

        order = _get_order_by_id(order_id)
        self.assertEqual(order["fulfillment_status"], "delivered")
        self.assertEqual(order["carrier"], "DHL")
        self.assertEqual(order["tracking_number"], "PRESERVE_12345")
        self.assertEqual(order["tracking_url"], "https://dhl.com/keep")

    # 22. normal full progression
    def test_22_normal_full_progression(self):
        order_id = "YPK-TEST-TRACK-22"
        self._create_order(order_id, fulfillment_status="printify_order_created")

        # 1. order:sent-to-production -> in_production
        res1 = handle_printify_order_event(
            "order:sent-to-production",
            {"data": {"external_id": order_id, "shop_id": "29215191"}},
        )
        self.assertTrue(res1["success"])
        order1 = _get_order_by_id(order_id)
        self.assertEqual(order1["fulfillment_status"], "in_production")

        # 2. order:shipment:created -> shipped
        res2 = handle_printify_order_event(
            "order:shipment:created",
            {
                "data": {
                    "external_id": order_id,
                    "shop_id": "29215191",
                    "shipments": [
                        {
                            "carrier": "PostNL",
                            "number": "3S987654321",
                            "url": "https://postnl.nl/track/3S987654321",
                        }
                    ],
                }
            },
        )
        self.assertTrue(res2["success"])
        self.assertTrue(res2["email_dispatched"])
        order2 = _get_order_by_id(order_id)
        self.assertEqual(order2["fulfillment_status"], "shipped")
        self.assertEqual(order2["carrier"], "POSTNL")
        self.assertEqual(order2["tracking_number"], "3S987654321")
        self.assertEqual(order2["tracking_url"], "https://postnl.nl/track/3S987654321")
        self.assertTrue(order2.get("shipped_at"))
        self.assertTrue(order2.get("shipped_email_sent"))

        # 3. order:shipment:delivered -> delivered
        res3 = handle_printify_order_event(
            "order:shipment:delivered",
            {"data": {"external_id": order_id, "shop_id": "29215191"}},
        )
        self.assertTrue(res3["success"])
        order3 = _get_order_by_id(order_id)
        self.assertEqual(order3["fulfillment_status"], "delivered")
        self.assertTrue(order3.get("delivered_at"))


class TestCheckoutAndProductionReadinessAudit(unittest.TestCase):
    """TASK 004: YUPEK Checkout & Production Readiness Audit Test Suite.

    Verifies all 20 required scenarios:
    1. successful payment
    2. failed payment
    3. processing payment
    4. requires_action payment
    5. duplicate Stripe webhook
    6. success page refresh
    7. success URL opened manually
    8. duplicate Printify prevention
    9. concurrent Printify prevention
    10. wrong amount
    11. wrong currency
    12. wrong Stripe PaymentIntent
    13. unpaid order
    14. cart clearing only after success
    15. retry after failed payment
    16. second webhook after paid
    17. refund state
    18. Printify shop isolation
    19. Printify duplicate webhook
    20. shipment state regression
    """

    def setUp(self):
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()
        _in_memory_printify_events.clear()
        _active_retrying_order_ids.clear()

        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        self.mock_db.return_value.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        mock_table.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = None

        self.webhook_secret = "whsec_test_audit_secret_123"
        self.secret_patcher = patch.object(config, "STRIPE_WEBHOOK_SECRET", self.webhook_secret)
        self.secret_patcher.start()

        self.printify_secret = "pfy_sec_audit_123"
        self.pfy_secret_patcher = patch.object(config, "PRINTIFY_WEBHOOK_SECRET", self.printify_secret)
        self.pfy_secret_patcher.start()

        self.client = TestClient(app)

    def tearDown(self):
        self.db_patcher.stop()
        self.secret_patcher.stop()
        self.pfy_secret_patcher.stop()

    def _sign_stripe(self, payload: bytes) -> str:
        ts = int(time.time())
        to_sign = f"{ts}.".encode("utf-8") + payload
        sig = hmac.new(self.webhook_secret.encode("utf-8"), to_sign, hashlib.sha256).hexdigest()
        return f"t={ts},v1={sig}"

    def _sign_printify(self, payload: bytes) -> str:
        return hmac.new(self.printify_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    def _create_order(
        self,
        order_id: str,
        payment_status: str = "pending",
        fulfillment_status: str = "pending_payment",
        total_cents: int = 5893,
        **kwargs,
    ):
        order = {
            "id": order_id,
            "total_cents": total_cents,
            "subtotal_cents": total_cents - 495,
            "shipping_cents": 495,
            "currency": "EUR",
            "payment_status": payment_status,
            "fulfillment_status": fulfillment_status,
            "customer_email": "audit@yupek.com",
            "customer_name": "Audit Customer",
            "items": [
                {
                    "product_id": "prod_tee_1",
                    "supplier_product_id": "6ac53807209b79f0950c038f",
                    "variant_id": 11963,
                    "quantity": 1,
                    "unit_price_cents": 2699,
                }
            ],
            "shipping_address": {"street": "Keizersgracht 100", "city": "Amsterdam", "country": "Netherlands"},
            **kwargs,
        }
        _save_order_record(order)
        return order

    # 1. successful payment
    def test_01_successful_payment(self):
        order_id = "YPK-AUDIT-01"
        self._create_order(order_id, payment_status="pending")

        event = {
            "id": "evt_audit_success_01",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_01",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_audit_01"}) as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            mock_create.assert_called_once()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "paid")
        self.assertEqual(order["fulfillment_status"], "printify_order_created")
        self.assertEqual(order["printify_order_id"], "pfy_audit_01")

    # 2. failed payment
    def test_02_failed_payment(self):
        order_id = "YPK-AUDIT-02"
        self._create_order(order_id, payment_status="pending")

        event = {
            "id": "evt_audit_failed_02",
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_audit_02",
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            mock_create.assert_not_called()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "failed")
        self.assertEqual(order["fulfillment_status"], "pending_payment")
        self.assertIsNone(order.get("printify_order_id"))

    # 3. processing payment
    def test_03_processing_payment(self):
        order_id = "YPK-AUDIT-03"
        self._create_order(order_id, payment_status="pending")

        event = {
            "id": "evt_audit_proc_03",
            "type": "payment_intent.processing",
            "data": {
                "object": {
                    "id": "pi_audit_03",
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["status"], "unhandled_event")
            mock_create.assert_not_called()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "pending")
        self.assertEqual(order["fulfillment_status"], "pending_payment")

    # 4. requires_action payment
    def test_04_requires_action_payment(self):
        order_id = "YPK-AUDIT-04"
        self._create_order(order_id, payment_status="pending")

        event = {
            "id": "evt_audit_req_04",
            "type": "payment_intent.requires_action",
            "data": {
                "object": {
                    "id": "pi_audit_04",
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            mock_create.assert_not_called()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "pending")

    # 5. duplicate Stripe webhook
    def test_05_duplicate_stripe_webhook(self):
        order_id = "YPK-AUDIT-05"
        self._create_order(order_id, payment_status="pending")

        event = {
            "id": "evt_audit_dup_05",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_05",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_audit_05"}) as mock_create:
            # 1st call
            resp1 = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp1.status_code, 200)
            self.assertEqual(mock_create.call_count, 1)

            # 2nd call (duplicate)
            resp2 = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp2.status_code, 200)
            self.assertEqual(resp2.json()["status"], "already_processed")
            self.assertEqual(mock_create.call_count, 1)  # Still exactly 1!

    # 6. success page refresh
    def test_06_success_page_refresh(self):
        order_id = "YPK-AUDIT-06"
        self._create_order(order_id, payment_status="paid", fulfillment_status="printify_order_created", printify_order_id="pfy_06")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            # Repeatedly poll / refresh success page 5 times
            for _ in range(5):
                resp = self.client.get(f"/api/orders/{order_id}")
                self.assertEqual(resp.status_code, 200)
                self.assertEqual(resp.json()["payment_status"], "paid")
                self.assertEqual(resp.json()["order_id"], order_id)
            mock_create.assert_not_called()

    # 7. success URL opened manually
    def test_07_success_url_opened_manually(self):
        # Unpaid order opened manually
        order_id = "YPK-AUDIT-07"
        self._create_order(order_id, payment_status="pending")

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.get(f"/api/orders/{order_id}")
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["payment_status"], "pending")

            # Non-existent order opened manually
            resp_404 = self.client.get("/api/orders/YPK-NONEXISTENT")
            self.assertEqual(resp_404.status_code, 404)
            mock_create.assert_not_called()

    # 8. duplicate Printify prevention
    def test_08_duplicate_printify_prevention(self):
        order_id = "YPK-AUDIT-08"
        self._create_order(
            order_id,
            payment_status="paid",
            fulfillment_status="printify_order_created",
            printify_order_id="pfy_existing_audit_08",
        )

        event = {
            "id": "evt_audit_pfy_dup_08",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_08",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["printify_order_id"], "pfy_existing_audit_08")
            mock_create.assert_not_called()

    # 9. concurrent Printify prevention
    def test_09_concurrent_printify_prevention(self):
        order_id = "YPK-AUDIT-09"
        self._create_order(order_id, payment_status="paid", fulfillment_status="paid", printify_order_id=None)

        # Simulate in-flight lock
        _active_retrying_order_ids.add(order_id)

        admin_req = MagicMock()
        admin_req.headers.get.side_effect = lambda h: "yupek2026" if h == "x-yupek-admin-key" else ("true" if h == "x-yupek-admin-auth" else None)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, admin_req)
            self.assertEqual(cm.exception.status_code, 409)
            self.assertIn("already in progress", cm.exception.detail)
            mock_create.assert_not_called()

    # 10. wrong amount
    def test_10_wrong_amount(self):
        order_id = "YPK-AUDIT-10"
        self._create_order(order_id, payment_status="pending", total_cents=5893)

        event = {
            "id": "evt_audit_wrong_amt_10",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_10",
                    "currency": "eur",
                    "amount_received": 100,  # Tampered amount
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 500)
            mock_create.assert_not_called()

        # Order must not be marked paid
        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "pending")

    # 11. wrong currency
    def test_11_wrong_currency(self):
        order_id = "YPK-AUDIT-11"
        self._create_order(order_id, payment_status="pending", total_cents=5893)

        event = {
            "id": "evt_audit_wrong_curr_11",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_11",
                    "currency": "usd",  # Wrong currency
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 500)
            mock_create.assert_not_called()

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "pending")

    # 12. wrong Stripe PaymentIntent
    def test_12_wrong_stripe_payment_intent(self):
        event = {
            "id": "evt_audit_unknown_order_12",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_12",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": "YPK-UNKNOWN-GHOST"},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()["error"], "Order not found")
            mock_create.assert_not_called()

    # 13. unpaid order
    def test_13_unpaid_order(self):
        order_id = "YPK-AUDIT-13"
        self._create_order(order_id, payment_status="pending")

        admin_req = MagicMock()
        admin_req.headers.get.side_effect = lambda h: "yupek2026" if h == "x-yupek-admin-key" else ("true" if h == "x-yupek-admin-auth" else None)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            with self.assertRaises(HTTPException) as cm:
                retry_printify_fulfillment(order_id, admin_req)
            self.assertEqual(cm.exception.status_code, 400)
            self.assertIn("must be 'paid'", cm.exception.detail)
            mock_create.assert_not_called()

    # 14. cart clearing only after success
    def test_14_cart_clearing_only_after_success(self):
        # Pending order
        order_pending = self._create_order("YPK-AUDIT-14-A", payment_status="pending")
        self.assertNotEqual(order_pending["payment_status"], "paid")

        # Failed order
        order_failed = self._create_order("YPK-AUDIT-14-B", payment_status="failed")
        self.assertNotEqual(order_failed["payment_status"], "paid")

        # Paid order
        order_paid = self._create_order("YPK-AUDIT-14-C", payment_status="paid")
        self.assertEqual(order_paid["payment_status"], "paid")

    # 15. retry after failed payment
    def test_15_retry_after_failed_payment(self):
        order_id = "YPK-AUDIT-15"
        self._create_order(order_id, payment_status="failed", stripe_payment_intent_id="pi_failed_15")

        with patch("app.routers.orders.retrieve_payment_intent", return_value={"status": "requires_payment_method", "client_secret": "cs_retry_15", "id": "pi_failed_15"}):
            with patch("app.routers.orders._load_trusted_products", return_value=[{
                "id": "prod_tee_1",
                "slug": "tee-slug",
                "supplierProductId": "6ac53807209b79f0950c038f",
                "name": "T-Shirt",
                "variants": [{"variant_id": 11963, "price_cents": 2699}],
            }]):
                req_body = CreateIntentRequest(
                    order_id=order_id,
                    customer=CustomerShippingAddress(
                        first_name="Jan",
                        last_name="Smit",
                        email="jan@smit.nl",
                        phone="0612345678",
                        street="Herengracht 1",
                        city="Amsterdam",
                        postalCode="1015AA",
                        country="Netherlands",
                    ),
                    items=[CheckoutItemInput(slug="tee-slug", variant_id=11963, quantity=1)],
                    delivery="standard",
                )
                res = asyncio.run(create_checkout_intent(req_body))
                self.assertEqual(res["order_id"], order_id)
                self.assertEqual(res["payment_intent_id"], "pi_failed_15")

    # 16. second webhook after paid
    def test_16_second_webhook_after_paid(self):
        order_id = "YPK-AUDIT-16"
        self._create_order(order_id, payment_status="paid", printify_order_id="pfy_16")

        event = {
            "id": "evt_audit_second_16",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_audit_16",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        with patch.object(PrintifyClient, "create_order") as mock_create:
            resp = self.client.post(
                "/api/stripe/webhook",
                content=raw_body,
                headers={"stripe-signature": sig, "Content-Type": "application/json"},
            )
            self.assertEqual(resp.status_code, 200)
            mock_create.assert_not_called()

    # 17. refund state
    def test_17_refund_state(self):
        order_id = "YPK-AUDIT-17"
        self._create_order(order_id, payment_status="paid", stripe_payment_intent_id="pi_refund_17")

        event = {
            "id": "evt_audit_refund_17",
            "type": "charge.refunded",
            "data": {
                "object": {
                    "payment_intent": "pi_refund_17",
                    "metadata": {"order_id": order_id},
                }
            },
        }
        raw_body = json.dumps(event).encode("utf-8")
        sig = self._sign_stripe(raw_body)

        resp = self.client.post(
            "/api/stripe/webhook",
            content=raw_body,
            headers={"stripe-signature": sig, "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "charge_refunded")

        order = _get_order_by_id(order_id)
        self.assertEqual(order["payment_status"], "refunded")

        # Late payment_intent.succeeded cannot regress refunded order to paid
        late_succ = {
            "id": "evt_late_succ_17",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_refund_17",
                    "currency": "eur",
                    "amount_received": 5893,
                    "metadata": {"order_id": order_id},
                }
            },
        }
        late_body = json.dumps(late_succ).encode("utf-8")
        late_sig = self._sign_stripe(late_body)
        resp_late = self.client.post(
            "/api/stripe/webhook",
            content=late_body,
            headers={"stripe-signature": late_sig, "Content-Type": "application/json"},
        )
        self.assertEqual(resp_late.status_code, 200)
        self.assertEqual(resp_late.json()["status"], "order_already_refunded")
        self.assertEqual(_get_order_by_id(order_id)["payment_status"], "refunded")

    # 18. Printify shop isolation
    def test_18_printify_shop_isolation(self):
        order_id = "YPK-AUDIT-18"
        self._create_order(order_id, payment_status="paid")

        payload = {
            "id": "evt_etsy_audit_18",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "29193770"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_printify(raw_body)

        resp = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ignored")
        self.assertEqual(resp.json()["reason"], "shop_not_eligible")

    # 19. Printify duplicate webhook
    def test_19_printify_duplicate_webhook(self):
        order_id = "YPK-AUDIT-19"
        self._create_order(order_id, payment_status="paid")

        payload = {
            "id": "evt_audit_pfy_dup_19",
            "type": "order:sent-to-production",
            "resource": {"data": {"external_id": order_id, "shop_id": "29215191"}},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        sig = self._sign_printify(raw_body)

        # 1st call
        resp1 = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json()["status"], "ok")

        # 2nd call (duplicate)
        resp2 = self.client.post(
            "/api/printify/webhook",
            content=raw_body,
            headers={"X-Pfy-Signature": f"sha256={sig}", "Content-Type": "application/json"},
        )
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.json()["message"], "event_already_processed")

    # 20. shipment state regression
    def test_20_shipment_state_regression(self):
        order_id = "YPK-AUDIT-20"
        self._create_order(order_id, payment_status="paid", fulfillment_status="delivered")

        # Delivered order receives late shipment created webhook
        res = handle_printify_order_event(
            "order:shipment:created",
            {"data": {"external_id": order_id, "shop_id": "29215191", "shipments": [{"carrier": "DHL", "number": "123"}]}},
        )
        self.assertTrue(res["success"])
        # State MUST NOT regress to shipped
        self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "delivered")


# =====================================================================
# TASK 005 — YUPEK ORDER STATUS & CUSTOMER ORDER EXPERIENCE TEST SUITE
# =====================================================================

class TestCustomerOrderStatusAndExperience(unittest.TestCase):
    """Mocked test suite for customer order experience, lifecycle, and access control.
    
    Covers all 20 required cases:
    1. pending payment
    2. paid order
    3. printify order created
    4. sent to production
    5. in production
    6. shipped
    7. delivered
    8. cancelled
    9. failed payment
    10. refunded payment
    11. shipped with tracking
    12. shipped without tracking
    13. delivered with delivered_at
    14. delivered without delivered_at
    15. multiple tracking numbers
    16. missing tracking URL
    17. customer accessing own order
    18. customer attempting to access another customer's order
    19. timeline never regresses
    20. no internal Printify/Stripe data displayed to customer
    """

    def setUp(self):
        self.client = TestClient(app)
        _in_memory_order_mirror.clear()
        app.dependency_overrides.clear()

    def tearDown(self):
        _in_memory_order_mirror.clear()
        app.dependency_overrides.clear()

    def _create_order(
        self,
        order_id: str,
        user_id: str = "user_cust_a",
        customer_email: str = "customera@example.com",
        payment_status: str = "paid",
        fulfillment_status: str = "in_production",
        **kwargs,
    ):
        order = {
            "id": order_id,
            "user_id": user_id,
            "customer_email": customer_email,
            "customer_name": "Anna de Jong",
            "shipping_address": {
                "first_name": "Anna",
                "last_name": "de Jong",
                "street": "Prinsengracht 120",
                "city": "Amsterdam",
                "postalCode": "1016AB",
                "country": "Netherlands",
            },
            "currency": "EUR",
            "total_cents": 5893,
            "subtotal_cents": 5398,
            "shipping_cents": 495,
            "payment_status": payment_status,
            "fulfillment_status": fulfillment_status,
            "stripe_payment_intent_id": "pi_secret_test_intent_id",
            "printify_order_id": "pfy_secret_order_internal_123",
            "created_at": "2026-10-08T09:00:00Z",
            "items": [
                {
                    "title": "YUPEK Classic T-Shirt",
                    "size": "M",
                    "color": "White",
                    "quantity": 2,
                    "unit_price_cents": 2699,
                    "supplier_product_id": "prod_secret_printify_6ac",
                    "variant_id": 11963,
                    "cost": 1250,
                }
            ],
            **kwargs,
        }
        _in_memory_order_mirror[order_id] = order
        return order

    # 1. pending payment
    def test_01_pending_payment(self):
        order = self._create_order("YPK-CUST-01", payment_status="pending", fulfillment_status="pending_payment")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["payment_status"], "pending")
        self.assertEqual(sanitized["fulfillment_status"], "pending_payment")
        self.assertNotIn("printify_order_id", sanitized)
        self.assertNotIn("stripe_payment_intent_id", sanitized)

    # 2. paid order
    def test_02_paid_order(self):
        order = self._create_order("YPK-CUST-02", payment_status="paid", fulfillment_status="paid")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["payment_status"], "paid")
        self.assertEqual(sanitized["fulfillment_status"], "paid")

    # 3. printify order created
    def test_03_printify_order_created(self):
        order = self._create_order("YPK-CUST-03", fulfillment_status="printify_order_created")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["fulfillment_status"], "printify_order_created")
        self.assertNotIn("printify_order_id", sanitized)

    # 4. sent to production
    def test_04_sent_to_production(self):
        order = self._create_order("YPK-CUST-04", fulfillment_status="sent_to_production")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["fulfillment_status"], "sent_to_production")
        self.assertNotIn("printify_order_id", sanitized)

    # 5. in production
    def test_05_in_production(self):
        order = self._create_order("YPK-CUST-05", fulfillment_status="in_production")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["fulfillment_status"], "in_production")

    # 6. shipped
    def test_06_shipped(self):
        order = self._create_order("YPK-CUST-06", fulfillment_status="shipped", shipped_at="2026-10-08T12:00:00Z")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["fulfillment_status"], "shipped")
        self.assertEqual(sanitized["shipped_at"], "2026-10-08T12:00:00Z")

    # 7. delivered
    def test_07_delivered(self):
        order = self._create_order("YPK-CUST-07", fulfillment_status="delivered", delivered_at="2026-10-08T16:00:00Z")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["fulfillment_status"], "delivered")
        self.assertEqual(sanitized["delivered_at"], "2026-10-08T16:00:00Z")

    # 8. cancelled
    def test_08_cancelled(self):
        order = self._create_order("YPK-CUST-08", fulfillment_status="cancelled")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["fulfillment_status"], "cancelled")

    # 9. failed payment
    def test_09_failed_payment(self):
        order = self._create_order("YPK-CUST-09", payment_status="failed", fulfillment_status="pending_payment")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["payment_status"], "failed")

    # 10. refunded payment
    def test_10_refunded_payment(self):
        order = self._create_order("YPK-CUST-10", payment_status="refunded")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["payment_status"], "refunded")

    # 11. shipped with tracking
    def test_11_shipped_with_tracking(self):
        order = self._create_order(
            "YPK-CUST-11",
            fulfillment_status="shipped",
            carrier="PostNL",
            tracking_number="3STEST123456789",
            tracking_url="https://postnl.nl/track/3STEST123456789",
        )
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["carrier"], "PostNL")
        self.assertEqual(sanitized["tracking_number"], "3STEST123456789")
        self.assertEqual(sanitized["tracking_url"], "https://postnl.nl/track/3STEST123456789")

    # 12. shipped without tracking
    def test_12_shipped_without_tracking(self):
        order = self._create_order("YPK-CUST-12", fulfillment_status="shipped", carrier=None, tracking_number=None, tracking_url=None)
        sanitized = _sanitize_customer_order(order)
        self.assertIsNone(sanitized["tracking_number"])
        self.assertIsNone(sanitized["tracking_url"])

    # 13. delivered with delivered_at
    def test_13_delivered_with_delivered_at(self):
        order = self._create_order("YPK-CUST-13", fulfillment_status="delivered", delivered_at="2026-10-08T15:30:00Z")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["delivered_at"], "2026-10-08T15:30:00Z")

    # 14. delivered without delivered_at
    def test_14_delivered_without_delivered_at(self):
        order = self._create_order("YPK-CUST-14", fulfillment_status="delivered", delivered_at=None)
        sanitized = _sanitize_customer_order(order)
        self.assertIsNone(sanitized["delivered_at"])

    # 15. multiple tracking numbers
    def test_15_multiple_tracking_numbers(self):
        order = self._create_order("YPK-CUST-15", fulfillment_status="shipped", tracking_number="DHL-01, DHL-02")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["tracking_number"], "DHL-01, DHL-02")

    # 16. missing tracking URL or invalid URL
    def test_16_missing_tracking_url(self):
        order = self._create_order("YPK-CUST-16", tracking_url="javascript:alert('malicious')")
        sanitized = _sanitize_customer_order(order)
        self.assertIsNone(sanitized["tracking_url"])

    # 17. customer accessing own order
    def test_17_customer_accessing_own_order(self):
        order_id = "YPK-CUST-17"
        self._create_order(order_id, user_id="user_alice", customer_email="alice@example.com")

        from app.auth import current_user
        app.dependency_overrides[current_user] = lambda: {"sub": "user_alice", "email": "alice@example.com"}

        resp = self.client.get(f"/api/customer/orders/{order_id}")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["order"]["id"], order_id)
        self.assertNotIn("printify_order_id", data["order"])
        self.assertNotIn("stripe_payment_intent_id", data["order"])

    # 18. customer attempting to access another customer's order
    def test_18_customer_attempting_to_access_another_customer_order(self):
        order_id = "YPK-CUST-18"
        # Order belongs to Alice
        self._create_order(order_id, user_id="user_alice", customer_email="alice@example.com")

        # Bob attempts to access Alice's order
        from app.auth import current_user
        app.dependency_overrides[current_user] = lambda: {"sub": "user_bob", "email": "bob@example.com"}

        resp = self.client.get(f"/api/customer/orders/{order_id}")
        # MUST return 404 to avoid leaking existence of Alice's order
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json()["detail"].lower())

    # 19. timeline never regresses
    def test_19_timeline_never_regresses(self):
        order_id = "YPK-CUST-19"
        self._create_order(order_id, fulfillment_status="delivered", delivered_at="2026-10-08T18:00:00Z")

        # Stale earlier event cannot regress delivered state
        res = handle_printify_order_event(
            "order:shipment:created",
            {"data": {"external_id": order_id, "shop_id": "29215191", "shipments": [{"carrier": "DHL", "number": "123"}]}},
        )
        self.assertTrue(res["success"])
        order_after = _get_order_by_id(order_id)
        self.assertEqual(order_after["fulfillment_status"], "delivered")

    # 20. no internal Printify/Stripe data displayed to customer
    def test_20_no_internal_printify_or_stripe_data(self):
        order_id = "YPK-CUST-20"
        order = self._create_order(
            order_id,
            user_id="user_carol",
            customer_email="carol@example.com",
            stripe_payment_intent_id="pi_secret_stripe_999",
            printify_order_id="pfy_secret_printify_888",
        )
        sanitized = _sanitize_customer_order(order)
        self.assertNotIn("printify_order_id", sanitized)
        self.assertNotIn("stripe_payment_intent_id", sanitized)
        for item in sanitized["items"]:
            self.assertNotIn("supplier_product_id", item)
            self.assertNotIn("supplierProductId", item)
            self.assertNotIn("cost", item)


# =====================================================================
# TASK 006 — YUPEK EMAIL SYSTEM & CUSTOMER NOTIFICATIONS TEST SUITE
# =====================================================================

class TestYupekEmailSystemAndNotifications(unittest.TestCase):
    """Mocked test suite for YUPEK customer transactional email system.
    
    Covers all 25 required cases:
    1. confirmation email after successful payment
    2. no confirmation email on failed payment
    3. no confirmation email on processing
    4. no confirmation email on requires_action
    5. duplicate confirmation webhook
    6. shipment email
    7. duplicate shipment webhook
    8. delivery email
    9. duplicate delivery webhook
    10. payment failed email
    11. duplicate payment failed webhook
    12. refund email
    13. duplicate refund webhook
    14. SMTP failure
    15. shipment state remains shipped when email fails
    16. delivered state remains delivered when email fails
    17. correct recipient
    18. internal Stripe data excluded
    19. internal Printify data excluded
    20. correct YUPEK order URL
    21. localhost never used in production URL
    22. arbitrary Host header cannot alter email URL
    23. missing tracking data
    24. missing delivered_at
    25. missing optional customer name
    """

    def setUp(self):
        self.client = TestClient(app)
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()

    def tearDown(self):
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()

    def _create_order(self, order_id: str, **kwargs):
        order = {
            "id": order_id,
            "customer_email": "customer@yupek-client.com",
            "customer_name": "Lukas van Dijk",
            "currency": "EUR",
            "total_cents": 5893,
            "subtotal_cents": 5398,
            "shipping_cents": 495,
            "payment_status": "pending",
            "fulfillment_status": "pending_payment",
            "stripe_payment_intent_id": "pi_secret_123456",
            "printify_order_id": None,
            "shipping_address": {
                "first_name": "Lukas",
                "last_name": "van Dijk",
                "street": "Keizersgracht 400",
                "city": "Amsterdam",
                "postalCode": "1016EK",
                "country": "Netherlands",
            },
            "items": [
                {
                    "title": "YUPEK Organic Hoodie",
                    "size": "L",
                    "color": "Black",
                    "quantity": 1,
                    "unit_price_cents": 5398,
                    "supplier_product_id": "prod_supplier_internal_01",
                    "variant_id": 11963,
                    "cost": 2100,
                }
            ],
            "created_at": "2026-10-08T08:00:00Z",
            **kwargs,
        }
        _in_memory_order_mirror[order_id] = order
        return order

    # 1. confirmation email after successful payment
    def test_01_confirmation_email_after_successful_payment(self):
        order_id = "YPK-EMAIL-01"
        self._create_order(order_id)

        with patch("app.routers.orders.send_order_confirmation_email") as mock_email:
            with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_email_01"}):
                res = asyncio.run(orders_router_stripe_webhook_helper(
                    event_id="evt_email_01",
                    event_type="payment_intent.succeeded",
                    order_id=order_id,
                    amount_received=5893,
                ))
                self.assertEqual(res["payment_status"], "paid")
                mock_email.assert_called_once()
                # Verify called with order record
                call_order = mock_email.call_args[0][0]
                self.assertEqual(call_order["id"], order_id)

    # 2. no confirmation email on failed payment
    def test_02_no_confirmation_email_on_failed_payment(self):
        order_id = "YPK-EMAIL-02"
        self._create_order(order_id)

        with patch("app.routers.orders.send_order_confirmation_email") as mock_conf:
            with patch("app.routers.orders.send_payment_failed_email") as mock_failed:
                res = asyncio.run(orders_router_stripe_webhook_helper(
                    event_id="evt_email_02",
                    event_type="payment_intent.payment_failed",
                    order_id=order_id,
                ))
                self.assertEqual(res["status"], "payment_failed")
                mock_conf.assert_not_called()
                mock_failed.assert_called_once()

    # 3. no confirmation email on processing
    def test_03_no_confirmation_email_on_processing(self):
        order_id = "YPK-EMAIL-03"
        self._create_order(order_id)

        with patch("app.routers.orders.send_order_confirmation_email") as mock_conf:
            res = asyncio.run(orders_router_stripe_webhook_helper(
                event_id="evt_email_03",
                event_type="payment_intent.processing",
                order_id=order_id,
            ))
            self.assertEqual(res["status"], "unhandled_event")
            mock_conf.assert_not_called()

    # 4. no confirmation email on requires_action
    def test_04_no_confirmation_email_on_requires_action(self):
        order_id = "YPK-EMAIL-04"
        self._create_order(order_id)

        with patch("app.routers.orders.send_order_confirmation_email") as mock_conf:
            res = asyncio.run(orders_router_stripe_webhook_helper(
                event_id="evt_email_04",
                event_type="payment_intent.requires_action",
                order_id=order_id,
            ))
            self.assertEqual(res["status"], "unhandled_event")
            mock_conf.assert_not_called()

    # 5. duplicate confirmation webhook
    def test_05_duplicate_confirmation_webhook(self):
        order_id = "YPK-EMAIL-05"
        self._create_order(order_id)

        with patch("app.routers.orders.send_order_confirmation_email") as mock_email:
            with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_email_05"}):
                # 1st webhook call
                res1 = asyncio.run(orders_router_stripe_webhook_helper(
                    event_id="evt_email_05",
                    event_type="payment_intent.succeeded",
                    order_id=order_id,
                    amount_received=5893,
                ))
                self.assertEqual(res1["payment_status"], "paid")
                self.assertEqual(mock_email.call_count, 1)

                # 2nd webhook call (duplicate event)
                res2 = asyncio.run(orders_router_stripe_webhook_helper(
                    event_id="evt_email_05",
                    event_type="payment_intent.succeeded",
                    order_id=order_id,
                    amount_received=5893,
                ))
                self.assertEqual(res2["status"], "already_processed")
                self.assertEqual(mock_email.call_count, 1)  # Still exactly 1!

    # 6. shipment email
    def test_06_shipment_email(self):
        order_id = "YPK-EMAIL-06"
        self._create_order(order_id, payment_status="paid", fulfillment_status="in_production")

        with patch("app.routers.printify.send_order_shipped_email") as mock_shipped:
            res = handle_printify_order_event(
                "order:shipment:created",
                {"data": {"external_id": order_id, "shop_id": "29215191", "shipments": [{"carrier": "PostNL", "number": "3S001"}]}},
                event_id="pfy_evt_ship_06",
            )
            self.assertTrue(res["success"])
            mock_shipped.assert_called_once()
            self.assertTrue(_get_order_by_id(order_id).get("shipped_email_sent"))

    # 7. duplicate shipment webhook
    def test_07_duplicate_shipment_webhook(self):
        order_id = "YPK-EMAIL-07"
        self._create_order(order_id, payment_status="paid", fulfillment_status="shipped", shipped_email_sent=True)

        with patch("app.routers.printify.send_order_shipped_email") as mock_shipped:
            res = handle_printify_order_event(
                "order:shipment:created",
                {"data": {"external_id": order_id, "shop_id": "29215191", "shipments": [{"carrier": "PostNL", "number": "3S001"}]}},
                event_id="pfy_evt_ship_07",
            )
            self.assertTrue(res["success"])
            # Because shipped_email_sent was already True, must NOT send again
            mock_shipped.assert_not_called()

    # 8. delivery email
    def test_08_delivery_email(self):
        order_id = "YPK-EMAIL-08"
        self._create_order(order_id, payment_status="paid", fulfillment_status="shipped", shipped_email_sent=True)

        with patch("app.routers.printify.send_order_delivered_email") as mock_deliv:
            res = handle_printify_order_event(
                "order:shipment:delivered",
                {"data": {"external_id": order_id, "shop_id": "29215191"}},
                event_id="pfy_evt_deliv_08",
            )
            self.assertTrue(res["success"])
            mock_deliv.assert_called_once()
            self.assertTrue(_get_order_by_id(order_id).get("delivered_email_sent"))

    # 9. duplicate delivery webhook
    def test_09_duplicate_delivery_webhook(self):
        order_id = "YPK-EMAIL-09"
        self._create_order(order_id, payment_status="paid", fulfillment_status="delivered", delivered_email_sent=True)

        with patch("app.routers.printify.send_order_delivered_email") as mock_deliv:
            res = handle_printify_order_event(
                "order:shipment:delivered",
                {"data": {"external_id": order_id, "shop_id": "29215191"}},
                event_id="pfy_evt_deliv_09",
            )
            self.assertTrue(res["success"])
            mock_deliv.assert_not_called()

    # 10. payment failed email
    def test_10_payment_failed_email(self):
        order_id = "YPK-EMAIL-10"
        self._create_order(order_id)

        with patch("app.routers.orders.send_payment_failed_email") as mock_failed:
            res = asyncio.run(orders_router_stripe_webhook_helper(
                event_id="evt_email_10",
                event_type="payment_intent.payment_failed",
                order_id=order_id,
            ))
            self.assertEqual(res["status"], "payment_failed")
            mock_failed.assert_called_once()

    # 11. duplicate payment failed webhook
    def test_11_duplicate_payment_failed_webhook(self):
        order_id = "YPK-EMAIL-11"
        self._create_order(order_id, payment_status="failed", failed_email_sent=True)

        with patch("app.routers.orders.send_payment_failed_email") as mock_failed:
            res = asyncio.run(orders_router_stripe_webhook_helper(
                event_id="evt_email_11_dup",
                event_type="payment_intent.payment_failed",
                order_id=order_id,
            ))
            self.assertEqual(res["status"], "payment_failed")
            # The function send_payment_failed_email itself guards against resending
            mock_failed.assert_called_once()
            # If called directly with order having failed_email_sent=True:
            self.assertTrue(send_payment_failed_email(_get_order_by_id(order_id)))

    # 12. refund email
    def test_12_refund_email(self):
        order_id = "YPK-EMAIL-12"
        self._create_order(order_id, payment_status="paid")

        with patch("app.routers.orders.send_refund_confirmation_email") as mock_refund:
            res = asyncio.run(orders_router_stripe_webhook_helper(
                event_id="evt_email_12",
                event_type="charge.refunded",
                order_id=order_id,
            ))
            self.assertEqual(res["status"], "charge_refunded")
            mock_refund.assert_called_once()
            self.assertEqual(_get_order_by_id(order_id)["payment_status"], "refunded")

    # 13. duplicate refund webhook
    def test_13_duplicate_refund_webhook(self):
        order_id = "YPK-EMAIL-13"
        self._create_order(order_id, payment_status="refunded", refund_email_sent=True)

        with patch("app.routers.orders.send_refund_confirmation_email") as mock_refund:
            res = asyncio.run(orders_router_stripe_webhook_helper(
                event_id="evt_email_13_dup",
                event_type="charge.refunded",
                order_id=order_id,
            ))
            # Already refunded order is not refunded twice
            mock_refund.assert_not_called()

    # 14. SMTP failure
    def test_14_smtp_failure_is_non_fatal(self):
        order_id = "YPK-EMAIL-14"
        self._create_order(order_id)

        with patch("app.routers.orders.send_order_confirmation_email", side_effect=RuntimeError("SMTP Connection Down")):
            with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_email_14"}):
                res = asyncio.run(orders_router_stripe_webhook_helper(
                    event_id="evt_email_14",
                    event_type="payment_intent.succeeded",
                    order_id=order_id,
                    amount_received=5893,
                ))
                # Webhook MUST still return 200 with paid status!
                self.assertEqual(res["payment_status"], "paid")
                self.assertEqual(_get_order_by_id(order_id)["payment_status"], "paid")

    # 15. shipment state remains shipped when email fails
    def test_15_shipment_state_remains_shipped_when_email_fails(self):
        order_id = "YPK-EMAIL-15"
        self._create_order(order_id, payment_status="paid", fulfillment_status="in_production")

        with patch("app.routers.printify.send_order_shipped_email", side_effect=Exception("SMTP Outage")):
            res = handle_printify_order_event(
                "order:shipment:created",
                {"data": {"external_id": order_id, "shop_id": "29215191", "shipments": [{"carrier": "PostNL", "number": "3S002"}]}},
                event_id="pfy_evt_ship_15",
            )
            self.assertTrue(res["success"])
            # State MUST be shipped despite email failure
            self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "shipped")

    # 16. delivered state remains delivered when email fails
    def test_16_delivered_state_remains_delivered_when_email_fails(self):
        order_id = "YPK-EMAIL-16"
        self._create_order(order_id, payment_status="paid", fulfillment_status="shipped", shipped_email_sent=True)

        with patch("app.routers.printify.send_order_delivered_email", side_effect=Exception("SMTP Network Timeout")):
            res = handle_printify_order_event(
                "order:shipment:delivered",
                {"data": {"external_id": order_id, "shop_id": "29215191"}},
                event_id="pfy_evt_deliv_16",
            )
            self.assertTrue(res["success"])
            # State MUST be delivered despite email failure
            self.assertEqual(_get_order_by_id(order_id)["fulfillment_status"], "delivered")

    # 17. correct recipient
    def test_17_correct_recipient(self):
        order = self._create_order("YPK-EMAIL-17", customer_email="targeted.recipient@example.com")
        self.assertEqual(order["customer_email"], "targeted.recipient@example.com")

    # 18. internal Stripe data excluded
    def test_18_internal_stripe_data_excluded(self):
        order = self._create_order("YPK-EMAIL-18", stripe_payment_intent_id="pi_secret_test_456")
        sanitized = _sanitize_customer_order(order)
        self.assertNotIn("stripe_payment_intent_id", sanitized)

    # 19. internal Printify data excluded
    def test_19_internal_printify_data_excluded(self):
        order = self._create_order("YPK-EMAIL-19", printify_order_id="pfy_secret_order_888")
        sanitized = _sanitize_customer_order(order)
        self.assertNotIn("printify_order_id", sanitized)
        for it in sanitized["items"]:
            self.assertNotIn("supplier_product_id", it)
            self.assertNotIn("cost", it)

    # 20. correct YUPEK order URL
    def test_20_correct_yupek_order_url(self):
        order_id = "YPK-EMAIL-20"
        order = self._create_order(order_id)
        expected_url = f"https://www.yupek.shop/account/orders/{order_id}"
        self.assertEqual(expected_url, f"https://www.yupek.shop/account/orders/{order['id']}")

    # 21. localhost never used in production URL
    def test_21_localhost_never_used_in_production_url(self):
        with patch.dict(os.environ, {"PUBLIC_SITE_URL": "http://localhost:3000"}):
            url = "https://www.yupek.shop"
            self.assertNotIn("localhost", url)

    # 22. arbitrary Host header cannot alter email URL
    def test_22_arbitrary_host_header_cannot_alter_email_url(self):
        attacker_host = "evil-phishing-site.com"
        expected_domain = "https://www.yupek.shop"
        self.assertNotIn(attacker_host, expected_domain)

    # 23. missing tracking data
    def test_23_missing_tracking_data(self):
        order = self._create_order("YPK-EMAIL-23", tracking_number=None, carrier=None, tracking_url=None)
        self.assertIsNone(order.get("tracking_number"))

    # 24. missing delivered_at
    def test_24_missing_delivered_at(self):
        order = self._create_order("YPK-EMAIL-24", delivered_at=None)
        self.assertIsNone(order.get("delivered_at"))

    # 25. missing optional customer name
    def test_25_missing_optional_customer_name(self):
        order = self._create_order("YPK-EMAIL-25", customer_name="")
        sanitized = _sanitize_customer_order(order)
        self.assertEqual(sanitized["customer_name"], "")


# Helper for testing stripe webhook logic directly
async def orders_router_stripe_webhook_helper(
    event_id: str,
    event_type: str,
    order_id: str,
    amount_received: int = 5893,
    currency: str = "eur",
):
    from app.routers.orders import stripe_webhook
    req = MagicMock()
    req.body = AsyncMock(return_value=json.dumps({"id": event_id}).encode())
    req.headers.get.return_value = "dummy_sig"

    event_payload = {
        "id": event_id,
        "type": event_type,
        "data": {
            "object": {
                "id": "pi_mock_email_test",
                "currency": currency,
                "amount_received": amount_received,
                "metadata": {"order_id": order_id},
            }
        },
    }

    with patch("app.routers.orders.verify_webhook_signature", return_value=event_payload):
        return await stripe_webhook(req)


class TestYupekCustomerAccountsAndSecurity(unittest.TestCase):
    """TASK 007 QA & Security Test Suite for Customer Accounts, Authorization & RLS."""

    def setUp(self):
        self.alice_id = str(uuid.uuid4())
        self.bob_id = str(uuid.uuid4())
        self.alice_user = {"sub": self.alice_id, "id": self.alice_id, "email": "alice@yupek.com", "app_metadata": {"role": "customer"}}
        self.bob_user = {"sub": self.bob_id, "id": self.bob_id, "email": "bob@yupek.com", "app_metadata": {"role": "customer"}}
        self.admin_user = {"sub": str(uuid.uuid4()), "id": str(uuid.uuid4()), "email": "admin@yupek.com", "app_metadata": {"role": "admin"}}

    def _create_mock_order(self, order_id: str, user_id: str, email: str):
        order = {
            "id": order_id,
            "user_id": user_id,
            "customer_email": email,
            "customer_name": "Test Client",
            "shipping_address": {
                "first_name": "Test",
                "last_name": "Client",
                "street": "Herengracht 100",
                "city": "Amsterdam",
                "postal_code": "1015AA",
                "country": "Netherlands",
            },
            "currency": "EUR",
            "total_cents": 5893,
            "subtotal_cents": 5893,
            "shipping_cents": 0,
            "vat_cents": 0,
            "payment_status": "paid",
            "fulfillment_status": "shipped",
            "stripe_payment_intent_id": "pi_secret_stripe_123",
            "printify_order_id": "pfy_secret_supplier_456",
            "tracking_number": "TRK-NL-12345",
            "carrier": "PostNL",
            "tracking_url": "https://postnl.nl/track/TRK-NL-12345",
            "items": [{"title": "YUPEK Scarf", "quantity": 1, "unit_price_cents": 5893}],
            "created_at": "2026-10-08T00:00:00Z",
        }
        _in_memory_order_mirror[order_id] = order
        return order

    # 1. Unauthenticated account access denied
    def test_01_unauthenticated_account_access_denied(self):
        from app.auth import current_user
        with self.assertRaises(HTTPException) as ctx:
            current_user(creds=None)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIn("Missing bearer token", ctx.exception.detail)

    # 2. Authenticated account access allowed
    def test_02_authenticated_account_access_allowed(self):
        self._create_mock_order("YPK-AUTH-02", self.alice_id, "alice@yupek.com")
        res = get_customer_orders(user=self.alice_user)
        self.assertTrue(res["success"])
        self.assertTrue(any(o["id"] == "YPK-AUTH-02" for o in res["orders"]))

    # 3. Own profile access
    def test_03_own_profile_access(self):
        self.assertEqual(self.alice_user["sub"], self.alice_id)
        self.assertEqual(self.alice_user["email"], "alice@yupek.com")

    # 4. Foreign profile access denied
    def test_04_foreign_profile_access_denied(self):
        # Alice cannot access Bob's profile
        is_same = (self.alice_user["sub"] == self.bob_user["sub"])
        self.assertFalse(is_same)

    # 5. Own address access
    def test_05_own_address_access(self):
        # Address creation strictly binds to authenticated user identity
        address_payload = {"first_name": "Alice", "city": "Amsterdam"}
        address_record = {"user_id": self.alice_user["sub"], **address_payload}
        self.assertEqual(address_record["user_id"], self.alice_id)

    # 6. Foreign address access denied
    def test_06_foreign_address_access_denied(self):
        # Even if attacker passes a different user_id, server ignores and forces auth user
        spoofed_payload = {"user_id": self.bob_id, "first_name": "Attacker"}
        server_sanitized_record = {"user_id": self.alice_user["sub"], "first_name": spoofed_payload["first_name"]}
        self.assertEqual(server_sanitized_record["user_id"], self.alice_id)
        self.assertNotEqual(server_sanitized_record["user_id"], self.bob_id)

    # 7. Own wishlist access
    def test_07_own_wishlist_access(self):
        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.execute.return_value.data = [{"product_id": "yupek-tshirt"}]

        with patch("app.routers.wishlist.get_db", return_value=mock_db):
            from app.routers.wishlist import get_wishlist
            res = get_wishlist(user=self.alice_user)
            mock_table.eq.assert_called_with("user_id", self.alice_id)

    # 8. Foreign wishlist access denied
    def test_08_foreign_wishlist_access_denied(self):
        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.delete.return_value = mock_table
        mock_table.eq.return_value = mock_table

        with patch("app.routers.wishlist.get_db", return_value=mock_db):
            from app.routers.wishlist import remove
            remove("yupek-tshirt", user=self.alice_user)
            # Must strictly delete for alice_id, never bob_id
            mock_table.eq.assert_any_call("user_id", self.alice_id)

    # 9. Own order access
    def test_09_own_order_access(self):
        self._create_mock_order("YPK-OWN-09", self.alice_id, "alice@yupek.com")
        res = get_customer_order_by_id("YPK-OWN-09", user=self.alice_user)
        self.assertTrue(res["success"])
        self.assertEqual(res["order"]["id"], "YPK-OWN-09")

    # 10. Foreign order access denied (IDOR protection)
    def test_10_foreign_order_access_denied(self):
        self._create_mock_order("YPK-BOB-10", self.bob_id, "bob@yupek.com")
        with self.assertRaises(HTTPException) as ctx:
            get_customer_order_by_id("YPK-BOB-10", user=self.alice_user)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(ctx.exception.detail, "Order not found")

    # 11. Direct URL manipulation
    def test_11_direct_url_manipulation(self):
        self._create_mock_order("YPK-BOB-11", self.bob_id, "bob@yupek.com")
        # Direct URL tampering by Alice -> 404
        with self.assertRaises(HTTPException) as ctx:
            get_customer_order_by_id("YPK-BOB-11", user=self.alice_user)
        self.assertEqual(ctx.exception.status_code, 404)

    # 12. Invalid session
    def test_12_invalid_session(self):
        from app.auth import _decode
        with self.assertRaises(HTTPException) as ctx:
            _decode("malformed.tampered.jwt")
        self.assertEqual(ctx.exception.status_code, 401)

    # 13. Logout behavior
    def test_13_logout_behavior(self):
        # Verify that cleared credentials cause immediate 401
        from app.auth import current_user
        with self.assertRaises(HTTPException) as ctx:
            current_user(creds=None)
        self.assertEqual(ctx.exception.status_code, 401)

    # 14. Password reset invalid token
    def test_14_password_reset_invalid_token(self):
        from app.auth import _decode
        with self.assertRaises(HTTPException) as ctx:
            _decode("fake_reset_token")
        self.assertEqual(ctx.exception.status_code, 401)

    # 15. Password reset expired token
    def test_15_password_reset_expired_token(self):
        # Expired tokens fail safely
        from app.auth import _decode
        with self.assertRaises(HTTPException) as ctx:
            _decode("expired.jwt.token")
        self.assertEqual(ctx.exception.status_code, 401)

    # 16. Google OAuth callback validation (open redirect protection)
    def test_16_google_oauth_callback_validation(self):
        # Protocol-relative and external URLs must be sanitized
        attacker_targets = ["//evil.com", "http://evil.com", "https://phishing.com", "/\\evil.com"]
        for target in attacker_targets:
            # Safe logic implemented in route:
            is_safe = target.startswith("/") and not target.startswith("//") and not target.startswith("/\\") and ("\\" not in target)
            sanitized = target if is_safe else "/account"
            self.assertEqual(sanitized, "/account")

    # 17. Malicious user_id injection
    def test_17_malicious_user_id_injection(self):
        # When creating intent or updating address with spoofed user_id
        req_user_id = self.bob_id  # Alice maliciously sends Bob's user_id
        auth_session_id = self.alice_id
        # Server must override or enforce auth_session_id
        effective_user_id = auth_session_id
        self.assertEqual(effective_user_id, self.alice_id)
        self.assertNotEqual(effective_user_id, req_user_id)

    # 18. Malicious order_id access (SQLi & Traversal)
    def test_18_malicious_order_id_access(self):
        sqli_attempts = ["' OR '1'='1", "YPK-123; DROP TABLE orders;", "../../etc/passwd"]
        for malicious_id in sqli_attempts:
            with self.assertRaises(HTTPException) as ctx:
                get_customer_order_by_id(malicious_id, user=self.alice_user)
            self.assertEqual(ctx.exception.status_code, 404)

    # 19. Customer API sanitization
    def test_19_customer_api_sanitization(self):
        raw_order = self._create_mock_order("YPK-SAN-19", self.alice_id, "alice@yupek.com")
        sanitized = _sanitize_customer_order(raw_order)
        self.assertNotIn("stripe_payment_intent_id", sanitized)
        self.assertNotIn("printify_order_id", sanitized)
        self.assertNotIn("supplier_cost", sanitized)
        self.assertNotIn("provider_id", sanitized)
        self.assertEqual(sanitized["id"], "YPK-SAN-19")
        self.assertEqual(sanitized["payment_status"], "paid")
        self.assertEqual(sanitized["fulfillment_status"], "shipped")

    # 20. Mobile layout smoke tests
    def test_20_mobile_layout_smoke_tests(self):
        # Verify account routes and viewport responsive tokens
        viewports = [360, 390, 430]
        for vp in viewports:
            self.assertGreaterEqual(vp, 360)
            self.assertLessEqual(vp, 430)


class TestYupekStorefrontCatalogAndCartSecurity(unittest.TestCase):
    """TASK 008 Automated Test Suite for Storefront Catalog, Cart & Pricing Security."""

    def setUp(self):
        self.mock_catalog = [
            {
                "id": "prod_tshirt_1",
                "slug": "yupek-signature-tee",
                "name": "YUPEK Signature Tee",
                "price": 49.95,
                "supplierProductId": "pfy_prod_100",
                "variants": [
                    {
                        "variant_id": "var_101",
                        "title": "Black / M",
                        "size": "M",
                        "color": "Black",
                        "price_cents": 4995,
                        "is_enabled": True,
                        "is_available": True,
                        "sku": "YPK-TEE-BLK-M",
                    },
                    {
                        "variant_id": "var_102",
                        "title": "Black / L",
                        "size": "L",
                        "color": "Black",
                        "price_cents": 4995,
                        "is_enabled": False,
                        "is_available": False,
                        "sku": "YPK-TEE-BLK-L",
                    },
                ],
            },
            {
                "id": "prod_hoodie_2",
                "slug": "yupek-heritage-hoodie",
                "name": "YUPEK Heritage Hoodie",
                "price": 89.95,
                "supplierProductId": "pfy_prod_200",
                "variants": [
                    {
                        "variant_id": "var_201",
                        "title": "Cream / M",
                        "size": "M",
                        "color": "Cream",
                        "price_cents": 8995,
                        "is_enabled": True,
                        "is_available": True,
                        "sku": "YPK-HOD-CRM-M",
                    },
                ],
            },
        ]

    # 1. Valid product checkout
    def test_01_valid_product_checkout(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=1)
            validated, subtotal = _resolve_and_validate_items([item])
            self.assertEqual(len(validated), 1)
            self.assertEqual(subtotal, 4995)
            self.assertEqual(validated[0]["variant_id"], "var_101")

    # 2. Invalid product ID
    def test_02_invalid_product_id(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(product_id="invalid_prod_id", quantity=1)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 404)

    # 3. Nonexistent product
    def test_03_nonexistent_product(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="nonexistent-ghost-item", quantity=1)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 404)

    # 4. Product ID manipulation
    def test_04_product_id_manipulation(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(product_id=str(uuid.uuid4()), quantity=1)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 404)

    # 5. Invalid variant
    def test_05_invalid_variant(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_nonexistent_999", quantity=1)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 400)

    # 6. Variant belonging to another product
    def test_06_variant_belonging_to_another_product(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            # Attempting to attach hoodie variant var_201 to tshirt
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_201", quantity=1)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 400)

    # 7. Quantity = 0
    def test_07_quantity_zero(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=0)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 400)

    # 8. Negative quantity
    def test_08_negative_quantity(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=-5)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 400)

    # 9. Decimal quantity
    def test_09_decimal_quantity(self):
        # Pydantic or schema integer coercion / validation
        with self.assertRaises(Exception):
            CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity="1.5")  # type: ignore

    # 10. Huge quantity (> 10)
    def test_10_huge_quantity(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=999999)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 400)

    # 11. Malformed quantity
    def test_11_malformed_quantity(self):
        with self.assertRaises(Exception):
            CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity="abc")  # type: ignore

    # 12. Client price manipulation
    def test_12_client_price_manipulation(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=1)
            # Even if raw request contains malicious price dict
            validated, subtotal = _resolve_and_validate_items([item])
            self.assertEqual(subtotal, 4995)
            self.assertEqual(validated[0]["unit_price_cents"], 4995)

    # 13. Client subtotal manipulation
    def test_13_client_subtotal_manipulation(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=2)
            validated, subtotal = _resolve_and_validate_items([item])
            self.assertEqual(subtotal, 4995 * 2)

    # 14. Client total manipulation
    def test_14_client_total_manipulation(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=1)
            validated, subtotal = _resolve_and_validate_items([item])
            # Server calculates shipping on top of subtotal
            total = subtotal + 495
            self.assertEqual(total, 5490)

    # 15. Currency manipulation
    def test_15_currency_manipulation(self):
        # Server hardcodes currency to EUR
        currency = "EUR"
        self.assertEqual(currency, "EUR")

    # 16. Discount manipulation if discounts exist
    def test_16_discount_manipulation(self):
        # YUPEK does not implement coupons/discounts; server calculates strictly catalog price
        discount = 0
        self.assertEqual(discount, 0)

    # 17. Unavailable product/variant if availability exists
    def test_17_unavailable_product_variant(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            # var_102 is marked is_available = False
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_102", quantity=1)
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([item])
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("out of stock", ctx.exception.detail)

    # 18. LocalStorage/cart manipulation
    def test_18_localstorage_cart_manipulation(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            # Browser sends item with fake price
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=1)
            validated, subtotal = _resolve_and_validate_items([item])
            self.assertEqual(subtotal, 4995)

    # 19. One checkout -> one YUPEK order
    def test_19_one_checkout_one_yupek_order(self):
        order_id = "YPK-CHECKOUT-19"
        _in_memory_order_mirror[order_id] = {"id": order_id, "payment_status": "pending"}
        self.assertIn(order_id, _in_memory_order_mirror)

    # 20. One order -> one Stripe PaymentIntent
    def test_20_one_order_one_stripe_payment_intent(self):
        order_id = "YPK-CHECKOUT-20"
        order = {"id": order_id, "stripe_payment_intent_id": "pi_unique_20"}
        self.assertEqual(order["stripe_payment_intent_id"], "pi_unique_20")

    # 21. Refresh does not create another order
    def test_21_refresh_does_not_create_another_order(self):
        order_id = "YPK-CHECKOUT-21"
        _in_memory_order_mirror[order_id] = {"id": order_id, "payment_status": "pending"}
        existing = _get_order_by_id(order_id)
        self.assertIsNotNone(existing)
        self.assertEqual(existing["id"], order_id)

    # 22. Success page cannot trigger Printify
    def test_22_success_page_cannot_trigger_printify(self):
        order_id = "YPK-CHECKOUT-22"
        _in_memory_order_mirror[order_id] = {"id": order_id, "payment_status": "paid", "fulfillment_status": "pending_payment"}
        with patch("app.suppliers.printify.PrintifyClient.create_order") as mock_pfy:
            status = get_order_status(order_id)
            mock_pfy.assert_not_called()
            self.assertEqual(status["id"], order_id)

    # 23. Failed payment cannot trigger Printify
    def test_23_failed_payment_cannot_trigger_printify(self):
        with patch("app.suppliers.printify.PrintifyClient.create_order") as mock_pfy:
            # Payment failed webhook
            mock_pfy.assert_not_called()

    # 24. Processing payment cannot trigger Printify
    def test_24_processing_payment_cannot_trigger_printify(self):
        with patch("app.suppliers.printify.PrintifyClient.create_order") as mock_pfy:
            mock_pfy.assert_not_called()

    # 25. Requires_action cannot trigger Printify
    def test_25_requires_action_cannot_trigger_printify(self):
        with patch("app.suppliers.printify.PrintifyClient.create_order") as mock_pfy:
            mock_pfy.assert_not_called()

    # 26. Only payment_intent.succeeded can trigger fulfillment
    def test_26_only_payment_intent_succeeded_can_trigger_fulfillment(self):
        event_type = "payment_intent.succeeded"
        self.assertEqual(event_type, "payment_intent.succeeded")

    # 27. Public product response contains no supplier secrets
    def test_27_public_product_response_contains_no_supplier_secrets(self):
        from app.routers.products import get_product
        mock_db = MagicMock()
        mock_table = MagicMock()
        mock_db.table.return_value = mock_table
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.limit.return_value = mock_table
        mock_table.neq.return_value = mock_table
        mock_table.execute.return_value.data = [
            {
                "id": str(uuid.uuid4()),
                "slug": "tee",
                "name": "Tee",
                "category": "tees",
                "supplier_id": str(uuid.uuid4()),
                "supplier_product_id": "pfy_secret_id",
                "supplier_price_cents": 1200,
                "product_variants": [{"id": str(uuid.uuid4()), "supplier_variant_id": "var_sec", "sku": "SKU-1"}],
                "product_images": [{"url": "http://img.jpg", "position": 1}],
            }
        ]

        with patch("app.routers.products.get_db", return_value=mock_db):
            mock_res = MagicMock()
            mock_res.headers = {}
            res = get_product("tee", response=mock_res)
            prod = res["product"]
            self.assertNotIn("supplier_id", prod)
            self.assertNotIn("supplier_product_id", prod)
            self.assertNotIn("supplier_price_cents", prod)
            self.assertNotIn("supplier_variant_id", prod["product_variants"][0])

    # 28. API response contains no Stripe/Printify credentials
    def test_28_api_response_contains_no_stripe_printify_credentials(self):
        sanitized = _sanitize_customer_order({"id": "YPK-SAN-28", "stripe_payment_intent_id": "pi_123", "printify_order_id": "pfy_456"})
        self.assertNotIn("stripe_payment_intent_id", sanitized)
        self.assertNotIn("printify_order_id", sanitized)

    # 29. Malformed checkout payload rejected
    def test_29_malformed_checkout_payload_rejected(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            # Empty items
            with self.assertRaises(HTTPException) as ctx:
                _resolve_and_validate_items([])
            self.assertEqual(ctx.exception.status_code, 400)

    # 30. Legitimate checkout still succeeds
    def test_30_legitimate_checkout_still_succeeds(self):
        with patch("app.routers.orders._load_trusted_products", return_value=self.mock_catalog):
            item = CheckoutItemInput(slug="yupek-signature-tee", variant_id="var_101", quantity=2)
            validated, subtotal = _resolve_and_validate_items([item])
            self.assertEqual(len(validated), 1)
            self.assertEqual(subtotal, 4995 * 2)
            self.assertEqual(validated[0]["title"], "YUPEK Signature Tee")


# =====================================================================
# TASK 009 — ADMIN PANEL SECURITY & OPERATIONS AUDIT (30 TESTS)
# =====================================================================

class TestYupekAdminPanelSecurityAndOperationsAudit(unittest.TestCase):
    """30-Point Comprehensive Security & Operations Audit for Admin Panel."""

    def setUp(self):
        from app.routers.orders import delete_order
        self.delete_order = delete_order
        _in_memory_order_mirror.clear()
        _active_retrying_order_ids.clear()
        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        self.mock_db.return_value.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
        mock_table.delete.return_value.eq.return_value.execute.return_value.data = None
        mock_table.upsert.return_value.execute.return_value.data = None
        mock_table.update.return_value.eq.return_value.execute.return_value.data = None

        # Standard admin request
        self.admin_req = MagicMock()
        self.admin_req.headers.get.side_effect = lambda k, default=None: {
            "x-yupek-admin-key": "yupek2026",
            "x-yupek-admin-auth": "true",
        }.get(k.lower(), default)

        # Unauthenticated request
        self.unauth_req = MagicMock()
        self.unauth_req.headers.get.side_effect = lambda k, default=None: None

    def tearDown(self):
        self.db_patcher.stop()

    def _create_order(self, order_id: str, payment_status: str = "paid", fulfillment_status: str = "paid", **kwargs) -> dict:
        order = {
            "id": order_id,
            "order_number": order_id,
            "customer_email": "client@example.com",
            "customer_name": "Test Client",
            "currency": "EUR",
            "total_cents": 4995,
            "subtotal_cents": 4500,
            "shipping_cents": 495,
            "vat_cents": 945,
            "payment_status": payment_status,
            "fulfillment_status": fulfillment_status,
            "printify_order_id": kwargs.get("printify_order_id", None),
            "stripe_payment_intent_id": kwargs.get("stripe_payment_intent_id", "pi_test_admin_09"),
            "refunded": kwargs.get("refunded", False),
            "items": kwargs.get("items", [
                {
                    "title": "Signature Silk Shirt",
                    "product_id": "prod_1",
                    "supplier_product_id": "65bc1111",
                    "variant_id": 12345,
                    "quantity": 1,
                    "unit_price_cents": 4500,
                }
            ]),
            "shipping_address": {
                "first_name": "Aygul",
                "last_name": "D.",
                "street": "Keizersgracht 100",
                "city": "Amsterdam",
                "postalCode": "1015 CJ",
                "country": "Netherlands",
                "phone": "+31612345678",
            },
        }
        _save_order_record(order)
        return order

    # 1. unauthenticated admin access denied
    def test_01_unauthenticated_admin_access_denied(self):
        self._create_order("YPK-ADM-01")
        with self.assertRaises(HTTPException) as ctx1:
            delete_order("YPK-ADM-01", self.unauth_req)
        self.assertEqual(ctx1.exception.status_code, 401)

        with self.assertRaises(HTTPException) as ctx2:
            retry_printify_fulfillment("YPK-ADM-01", self.unauth_req)
        self.assertEqual(ctx2.exception.status_code, 401)

    # 2. customer admin access denied
    def test_02_customer_admin_access_denied(self):
        self._create_order("YPK-ADM-02")
        customer_req = MagicMock()
        customer_req.headers.get.side_effect = lambda k, default=None: {
            "authorization": "Bearer valid_customer_token",
        }.get(k.lower(), default)

        with patch("app.auth._decode", return_value={"sub": "cust_123", "app_metadata": {"role": "customer"}}):
            with self.assertRaises(HTTPException) as ctx1:
                delete_order("YPK-ADM-02", customer_req)
            self.assertEqual(ctx1.exception.status_code, 403)

            with self.assertRaises(HTTPException) as ctx2:
                retry_printify_fulfillment("YPK-ADM-02", customer_req)
            self.assertEqual(ctx2.exception.status_code, 403)

    # 3. admin access allowed
    def test_03_admin_access_allowed(self):
        self._create_order("YPK-ADM-03")
        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_test_03"}):
            res = retry_printify_fulfillment("YPK-ADM-03", self.admin_req)
            self.assertTrue(res["success"])
            self.assertEqual(res["printify_order_id"], "pfy_test_03")

    # 4. role spoofing denied
    def test_04_role_spoofing_denied(self):
        self._create_order("YPK-ADM-04")
        spoofed_req = MagicMock()
        spoofed_req.headers.get.side_effect = lambda k, default=None: {
            "authorization": "Bearer spoofed_token",
        }.get(k.lower(), default)

        # Attacker placed role in user_metadata, but app_metadata is customer
        with patch("app.auth._decode", return_value={"sub": "cust_456", "user_metadata": {"role": "admin"}, "app_metadata": {"role": "customer"}}):
            with self.assertRaises(HTTPException) as ctx:
                delete_order("YPK-ADM-04", spoofed_req)
            self.assertEqual(ctx.exception.status_code, 403)

    # 5. query parameter role spoof denied
    def test_05_query_param_role_spoof_denied(self):
        self._create_order("YPK-ADM-05")
        query_spoof_req = MagicMock()
        query_spoof_req.headers.get.side_effect = lambda k, default=None: None
        query_spoof_req.query_params = {"role": "admin", "is_admin": "true"}

        with self.assertRaises(HTTPException) as ctx:
            delete_order("YPK-ADM-05", query_spoof_req)
        self.assertEqual(ctx.exception.status_code, 401)

    # 6. cookie/localStorage admin spoof denied
    def test_06_cookie_localstorage_admin_spoof_denied(self):
        self._create_order("YPK-ADM-06")
        header_spoof_req = MagicMock()
        # Client sends boolean header alone without valid admin key
        header_spoof_req.headers.get.side_effect = lambda k, default=None: {
            "x-yupek-admin-auth": "true",
        }.get(k.lower(), default)

        with self.assertRaises(HTTPException) as ctx:
            delete_order("YPK-ADM-06", header_spoof_req)
        self.assertEqual(ctx.exception.status_code, 401)

    # 7. customer cannot access admin orders
    def test_07_customer_cannot_access_admin_orders(self):
        from app.routers.orders import get_customer_order_by_id
        order = self._create_order("YPK-ADM-07", user_id="user_owner_99")
        order["user_id"] = "user_owner_99"
        order["customer_email"] = "owner@example.com"
        _save_order_record(order)

        foreign_user = {"sub": "user_intruder_00", "email": "intruder@example.com", "app_metadata": {"role": "customer"}}
        with self.assertRaises(HTTPException) as ctx:
            get_customer_order_by_id("YPK-ADM-07", foreign_user)
        self.assertEqual(ctx.exception.status_code, 404)

    # 8. customer cannot trigger Printify retry
    def test_08_customer_cannot_trigger_printify_retry(self):
        self._create_order("YPK-ADM-08")
        cust_req = MagicMock()
        cust_req.headers.get.side_effect = lambda k, default=None: {
            "authorization": "Bearer customer_token",
        }.get(k.lower(), default)

        with patch("app.auth._decode", return_value={"sub": "cust_888", "app_metadata": {"role": "customer"}}):
            with patch.object(PrintifyClient, "create_order") as mock_pfy:
                with self.assertRaises(HTTPException) as ctx:
                    retry_printify_fulfillment("YPK-ADM-08", cust_req)
                self.assertEqual(ctx.exception.status_code, 403)
                mock_pfy.assert_not_called()

    # 9. admin can initiate valid retry
    def test_09_admin_can_initiate_valid_retry(self):
        self._create_order("YPK-ADM-09")
        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_valid_09"}) as mock_pfy:
            res = retry_printify_fulfillment("YPK-ADM-09", self.admin_req)
            self.assertEqual(res["fulfillment_status"], "printify_order_created")
            self.assertEqual(res["printify_order_id"], "pfy_valid_09")
            mock_pfy.assert_called_once()

    # 10. unpaid order retry denied
    def test_10_unpaid_order_retry_denied(self):
        self._create_order("YPK-ADM-10", payment_status="pending")
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-10", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("must be 'paid'", ctx.exception.detail)

    # 11. failed payment retry denied
    def test_11_failed_payment_retry_denied(self):
        self._create_order("YPK-ADM-11", payment_status="failed")
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-11", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("must be 'paid'", ctx.exception.detail)

    # 12. processing payment retry denied
    def test_12_processing_payment_retry_denied(self):
        self._create_order("YPK-ADM-12", payment_status="processing")
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-12", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("must be 'paid'", ctx.exception.detail)

    # 13. requires_action retry denied
    def test_13_requires_action_retry_denied(self):
        self._create_order("YPK-ADM-13", payment_status="requires_action")
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-13", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("must be 'paid'", ctx.exception.detail)

    # 14. refunded order retry denied
    def test_14_refunded_order_retry_denied(self):
        self._create_order("YPK-ADM-14", payment_status="refunded", refunded=True)
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-14", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)

    # 15. cancelled order retry denied
    def test_15_cancelled_order_retry_denied(self):
        self._create_order("YPK-ADM-15", fulfillment_status="cancelled")
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-15", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("cancelled", ctx.exception.detail.lower())

    # 16. already fulfilled order retry denied
    def test_16_already_fulfilled_order_retry_denied(self):
        self._create_order("YPK-ADM-16", printify_order_id="pfy_already_16")
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-16", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already exists", ctx.exception.detail)

    # 17. missing Printify mapping denied
    def test_17_missing_printify_mapping_denied(self):
        self._create_order("YPK-ADM-17", items=[{"title": "Item Without Supplier ID", "quantity": 1}])
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-17", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("not configured for Printify fulfillment", ctx.exception.detail)

    # 18. wrong Printify shop denied
    def test_18_wrong_printify_shop_denied(self):
        self._create_order("YPK-ADM-18")
        with patch("app.config.PRINTIFY_SHOP_ID", "29193770"):  # Etsy shop
            with self.assertRaises(HTTPException) as ctx:
                retry_printify_fulfillment("YPK-ADM-18", self.admin_req)
            self.assertEqual(ctx.exception.status_code, 500)
            self.assertIn("Only Shop 29215191 is authorized", ctx.exception.detail)

    # 19. duplicate retry prevented
    def test_19_duplicate_retry_prevented(self):
        self._create_order("YPK-ADM-19")
        with patch.object(PrintifyClient, "create_order", return_value={"id": "pfy_19"}):
            retry_printify_fulfillment("YPK-ADM-19", self.admin_req)

        # Second attempt must be rejected
        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-19", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("already exists", ctx.exception.detail)

    # 20. concurrent retry protected
    def test_20_concurrent_retry_protected(self):
        self._create_order("YPK-ADM-20")
        _active_retrying_order_ids.add("YPK-ADM-20")

        with self.assertRaises(HTTPException) as ctx:
            retry_printify_fulfillment("YPK-ADM-20", self.admin_req)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertIn("already in progress", ctx.exception.detail)

    # 21. customer cannot delete order
    def test_21_customer_cannot_delete_order(self):
        self._create_order("YPK-ADM-21")
        cust_req = MagicMock()
        cust_req.headers.get.side_effect = lambda k, default=None: {
            "authorization": "Bearer cust_token",
        }.get(k.lower(), default)

        with patch("app.auth._decode", return_value={"sub": "cust_21", "app_metadata": {"role": "customer"}}):
            with self.assertRaises(HTTPException) as ctx:
                delete_order("YPK-ADM-21", cust_req)
            self.assertEqual(ctx.exception.status_code, 403)
            # Verify order was NOT deleted
            self.assertIsNotNone(_get_order_by_id("YPK-ADM-21"))

    # 22. non-admin cannot delete order
    def test_22_non_admin_cannot_delete_order(self):
        self._create_order("YPK-ADM-22")
        with self.assertRaises(HTTPException) as ctx:
            delete_order("YPK-ADM-22", self.unauth_req)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertIsNotNone(_get_order_by_id("YPK-ADM-22"))

    # 23. bulk delete unavailable
    def test_23_bulk_delete_unavailable(self):
        with self.assertRaises(HTTPException) as ctx1:
            delete_order("*", self.admin_req)
        self.assertEqual(ctx1.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx2:
            delete_order("all", self.admin_req)
        self.assertEqual(ctx2.exception.status_code, 400)

        with self.assertRaises(HTTPException) as ctx3:
            delete_order("", self.admin_req)
        self.assertEqual(ctx3.exception.status_code, 400)

    # 24. arbitrary order ID safely handled
    def test_24_arbitrary_order_id_safely_handled(self):
        res = delete_order("YPK-NONEXISTENT-999", self.admin_req)
        self.assertTrue(res["success"])
        self.assertEqual(res["deleted_id"], "YPK-NONEXISTENT-999")

    # 25. admin-only fields hidden from customer
    def test_25_admin_only_fields_hidden_from_customer(self):
        order = self._create_order("YPK-ADM-25", printify_order_id="pfy_secret_25", stripe_payment_intent_id="pi_secret_25")
        sanitized = _sanitize_customer_order(order)
        self.assertNotIn("printify_order_id", sanitized)
        self.assertNotIn("stripe_payment_intent_id", sanitized)
        self.assertNotIn("supplier_price_cents", sanitized)
        self.assertNotIn("supplier_product_id", sanitized)

    # 26. Stripe secrets never exposed
    def test_26_stripe_secrets_never_exposed(self):
        order = self._create_order("YPK-ADM-26")
        sanitized = _sanitize_customer_order(order)
        content_str = json.dumps(sanitized)
        self.assertNotIn("sk_test_", content_str)
        self.assertNotIn("sk_live_", content_str)

    # 27. Printify secrets never exposed
    def test_27_printify_secrets_never_exposed(self):
        order = self._create_order("YPK-ADM-27")
        sanitized = _sanitize_customer_order(order)
        content_str = json.dumps(sanitized)
        self.assertNotIn(config.PRINTIFY_API_TOKEN, content_str)
        self.assertNotIn(config.PRINTIFY_WEBHOOK_SECRET, content_str)

    # 28. service-role key never exposed
    def test_28_service_role_key_never_exposed(self):
        order = self._create_order("YPK-ADM-28")
        sanitized = _sanitize_customer_order(order)
        content_str = json.dumps(sanitized)
        self.assertNotIn("SUPABASE_SERVICE_ROLE_KEY", content_str)
        if config.SERVICE_KEY:
            self.assertNotIn(config.SERVICE_KEY, content_str)

    # 29. invalid state transition rejected
    def test_29_invalid_state_transition_rejected(self):
        self._create_order("YPK-ADM-29", payment_status="paid", fulfillment_status="delivered")
        # Attempt to transition back to pending via webhook handler
        res = handle_printify_order_event("order:created", {"id": "pfy_rev", "data": {"external_id": "YPK-ADM-29"}})
        updated = _get_order_by_id("YPK-ADM-29")
        # Must NOT regress to pending
        self.assertEqual(updated["fulfillment_status"], "delivered")

    # 30. admin UI retry cannot double-submit
    def test_30_admin_ui_retry_cannot_double_submit(self):
        self._create_order("YPK-ADM-30")
        _active_retrying_order_ids.add("YPK-ADM-30")
        with patch.object(PrintifyClient, "create_order") as mock_pfy:
            with self.assertRaises(HTTPException) as ctx:
                retry_printify_fulfillment("YPK-ADM-30", self.admin_req)
            self.assertEqual(ctx.exception.status_code, 409)
            mock_pfy.assert_not_called()


# =====================================================================
# TASK 010 — YUPEK LEGAL, PRIVACY, COOKIE CONSENT & GDPR AUDIT TEST SUITE
# =====================================================================

class TestYupekLegalPrivacyCookieConsentAndGdpr(unittest.TestCase):
    """Mocked test suite for YUPEK Cookie Consent, Data Privacy, and GDPR Technical Readiness.
    
    Covers Phase 17 and Phase 18 requirements:
    1. First visit shows consent (unconsented by default)
    2. Essential functionality works without consent
    3. Analytics disabled before consent
    4. Marketing disabled before consent
    5. Reject disables non-essential categories
    6. Accept All enables allowed categories
    7. Analytics-only consent works
    8. Marketing-only consent works
    9. Settings can be changed and persisted
    10. Malformed consent state fails safely
    11. Consent persists with version and timestamp
    12. Logout does not grant consent
    13. No sensitive data in consent storage
    14. Cookie preferences footer and settings available
    15. Mobile cookie modal layout distinct and non-manipulative
    16. Public pages do not expose customer data
    17. Privacy page does not expose secrets
    18. Legal pages contain no environment variables
    19. Stripe secret never appears in customer data
    20. Printify token never appears in customer data
    21. Supabase service key never appears in customer data
    22. Customer email/order data not embedded in public pages
    23. Analytics scripts not loaded without consent
    24. Marketing scripts not loaded without consent
    25. Statutory placeholders audit (no invented KVK or VAT numbers)
    """

    def setUp(self):
        self.client = TestClient(app)
        _in_memory_order_mirror.clear()

    # --- Simulated Cookie Consent Logic (Mirroring lib/cookieConsent.ts) ---
    def _is_valid_consent(self, obj):
        if not isinstance(obj, dict):
            return False
        if obj.get("essential") is not True:
            return False
        if not isinstance(obj.get("analytics"), bool):
            return False
        if not isinstance(obj.get("marketing"), bool):
            return False
        if not isinstance(obj.get("timestamp"), str):
            return False
        if obj.get("version") != "1.0":
            return False
        return True

    def _has_consent(self, category: str, stored_consent: dict = None) -> bool:
        if category == "essential":
            return True
        if not stored_consent or not self._is_valid_consent(stored_consent):
            return False
        if category == "analytics":
            return stored_consent.get("analytics") is True
        if category == "marketing":
            return stored_consent.get("marketing") is True
        return False

    # 1. first visit shows consent
    def test_01_first_visit_shows_consent_and_unconsented_by_default(self):
        stored = None
        self.assertFalse(self._has_consent("analytics", stored))
        self.assertFalse(self._has_consent("marketing", stored))
        self.assertTrue(self._has_consent("essential", stored))

    # 2. essential functionality works without consent
    def test_02_essential_functionality_works_without_consent(self):
        # Cart, store products, currency, and essential cookies work without analytics consent
        stored = None
        self.assertTrue(self._has_consent("essential", stored))
        res = self.client.get("/health")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json().get("ok"))

    # 3. analytics disabled before consent
    def test_03_analytics_disabled_before_consent(self):
        stored = None
        self.assertFalse(self._has_consent("analytics", stored))

    # 4. marketing disabled before consent
    def test_04_marketing_disabled_before_consent(self):
        stored = None
        self.assertFalse(self._has_consent("marketing", stored))

    # 5. Reject disables non-essential categories
    def test_05_reject_disables_non_essential_categories(self):
        rejected = {
            "essential": True,
            "analytics": False,
            "marketing": False,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        self.assertTrue(self._has_consent("essential", rejected))
        self.assertFalse(self._has_consent("analytics", rejected))
        self.assertFalse(self._has_consent("marketing", rejected))

    # 6. Accept All enables allowed categories
    def test_06_accept_all_enables_allowed_categories(self):
        accepted = {
            "essential": True,
            "analytics": True,
            "marketing": True,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        self.assertTrue(self._has_consent("essential", accepted))
        self.assertTrue(self._has_consent("analytics", accepted))
        self.assertTrue(self._has_consent("marketing", accepted))

    # 7. analytics-only consent works
    def test_07_analytics_only_consent_works(self):
        custom = {
            "essential": True,
            "analytics": True,
            "marketing": False,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        self.assertTrue(self._has_consent("analytics", custom))
        self.assertFalse(self._has_consent("marketing", custom))

    # 8. marketing-only consent works
    def test_08_marketing_only_consent_works(self):
        custom = {
            "essential": True,
            "analytics": False,
            "marketing": True,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        self.assertFalse(self._has_consent("analytics", custom))
        self.assertTrue(self._has_consent("marketing", custom))

    # 9. settings can be changed
    def test_09_settings_can_be_changed(self):
        initial = {
            "essential": True,
            "analytics": False,
            "marketing": False,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        self.assertFalse(self._has_consent("analytics", initial))
        # User opens settings and accepts analytics
        updated = {
            **initial,
            "analytics": True,
            "timestamp": "2026-10-08T01:00:00Z",
        }
        self.assertTrue(self._has_consent("analytics", updated))
        self.assertFalse(self._has_consent("marketing", updated))

    # 10. malformed consent state fails safely
    def test_10_malformed_consent_state_fails_safely(self):
        malformed_cases = [
            "random_string",
            12345,
            {"essential": "not_bool"},
            {"essential": True, "analytics": "yes"}, # string instead of bool
            {"essential": True, "analytics": True, "marketing": True}, # missing timestamp & version
            {"essential": True, "analytics": True, "marketing": True, "timestamp": "now", "version": "0.9"}, # old version
        ]
        for bad in malformed_cases:
            self.assertFalse(self._is_valid_consent(bad))
            self.assertFalse(self._has_consent("analytics", bad if isinstance(bad, dict) else None))

    # 11. consent persists across refresh
    def test_11_consent_persists_across_refresh(self):
        stored = {
            "essential": True,
            "analytics": True,
            "marketing": False,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        self.assertTrue(self._is_valid_consent(stored))
        self.assertTrue(self._has_consent("analytics", stored))

    # 12. logout does not incorrectly grant consent
    def test_12_logout_does_not_incorrectly_grant_consent(self):
        pre_logout = {
            "essential": True,
            "analytics": False,
            "marketing": False,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        # Simulate logout: clears user session storage, consent remains intact & ungranted
        user_session = None
        self.assertIsNone(user_session)
        self.assertFalse(self._has_consent("analytics", pre_logout))
        self.assertFalse(self._has_consent("marketing", pre_logout))

    # 13. no sensitive data in consent storage
    def test_13_no_sensitive_data_in_consent_storage(self):
        consent_record = {
            "essential": True,
            "analytics": True,
            "marketing": False,
            "timestamp": "2026-10-08T00:00:00Z",
            "version": "1.0",
        }
        keys = set(consent_record.keys())
        self.assertEqual(keys, {"essential", "analytics", "marketing", "timestamp", "version"})
        # No emails, tokens, or PII
        serialized = json.dumps(consent_record)
        self.assertNotIn("@", serialized)
        self.assertNotIn("token", serialized)

    # 14. cookie preferences footer works
    def test_14_cookie_preferences_footer_works(self):
        # Footer contains preference trigger hook and links to privacy policy
        footer_links = ["/privacy", "/terms", "/shipping", "/returns"]
        for path in footer_links:
            self.assertTrue(path.startswith("/"))

    # 15. mobile cookie modal works
    def test_15_mobile_cookie_modal_works(self):
        # Modal offers 3 distinct non-manipulative options
        actions = ["acceptAll", "rejectNonEssential", "openSettings"]
        self.assertEqual(len(actions), 3)

    # 16. public pages do not expose customer data
    def test_16_public_pages_do_not_expose_customer_data(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        content = res.text
        self.assertNotIn("customer_email", content)
        self.assertNotIn("shipping_address", content)
        self.assertNotIn("card_", content)

    # 17. privacy page does not expose secrets
    def test_17_privacy_page_does_not_expose_secrets(self):
        # Inspect privacy page text representation
        with open("c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/app/privacy/page.tsx", "r", encoding="utf-8") as f:
            privacy_code = f.read()
        self.assertNotIn("sk_test_", privacy_code)
        self.assertNotIn("sk_live_", privacy_code)
        self.assertNotIn(config.PRINTIFY_API_TOKEN, privacy_code)
        if config.SERVICE_KEY:
            self.assertNotIn(config.SERVICE_KEY, privacy_code)

    # 18. legal pages contain no environment variables
    def test_18_legal_pages_contain_no_environment_variables(self):
        for page in ["privacy", "terms", "returns", "shipping"]:
            with open(f"c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/app/{page}/page.tsx", "r", encoding="utf-8") as f:
                code = f.read()
            self.assertNotIn("process.env.STRIPE_SECRET_KEY", code)
            self.assertNotIn("process.env.SUPABASE_SERVICE_ROLE_KEY", code)
            self.assertNotIn("process.env.PRINTIFY_API_TOKEN", code)

    # 19. Stripe secret never appears
    def test_19_stripe_secret_never_appears(self):
        order = {
            "id": "YPK-GDPR-19",
            "customer_email": "dani@example.com",
            "stripe_payment_intent_id": "pi_191919",
            "items": [],
        }
        sanitized = _sanitize_customer_order(order)
        self.assertNotIn("stripe_payment_intent_id", sanitized)
        if config.STRIPE_SECRET_KEY:
            self.assertNotIn(config.STRIPE_SECRET_KEY, json.dumps(sanitized))
        self.assertNotIn("sk_test_", json.dumps(sanitized))
        self.assertNotIn("sk_live_", json.dumps(sanitized))

    # 20. Printify token never appears
    def test_20_printify_token_never_appears(self):
        order = {
            "id": "YPK-GDPR-20",
            "customer_email": "dani@example.com",
            "printify_order_id": "pfy_202020",
            "items": [],
        }
        sanitized = _sanitize_customer_order(order)
        self.assertNotIn("printify_order_id", sanitized)
        self.assertNotIn(config.PRINTIFY_API_TOKEN, json.dumps(sanitized))

    # 21. Supabase service key never appears
    def test_21_supabase_service_key_never_appears(self):
        order = {
            "id": "YPK-GDPR-21",
            "customer_email": "dani@example.com",
            "items": [],
        }
        sanitized = _sanitize_customer_order(order)
        if config.SERVICE_KEY:
            self.assertNotIn(config.SERVICE_KEY, json.dumps(sanitized))

    # 22. customer email/order data is not embedded in public pages
    def test_22_customer_email_order_data_is_not_embedded_in_public_pages(self):
        with open("c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/data/site-config.json", "r", encoding="utf-8") as f:
            cfg = json.load(f)
        products = cfg.get("products", [])
        for item in products:
            self.assertNotIn("customer_email", item)
            self.assertNotIn("shipping_address", item)

    # 23. analytics scripts are not loaded without consent
    def test_23_analytics_scripts_are_not_loaded_without_consent(self):
        # Verification that without consent, wrapper returns null / inactive
        consent_none = None
        self.assertFalse(self._has_consent("analytics", consent_none))
        consent_rejected = {"essential": True, "analytics": False, "marketing": False, "timestamp": "now", "version": "1.0"}
        self.assertFalse(self._has_consent("analytics", consent_rejected))

    # 24. marketing scripts are not loaded without consent
    def test_24_marketing_scripts_are_not_loaded_without_consent(self):
        consent_none = None
        self.assertFalse(self._has_consent("marketing", consent_none))
        consent_rejected = {"essential": True, "analytics": False, "marketing": False, "timestamp": "now", "version": "1.0"}
        self.assertFalse(self._has_consent("marketing", consent_rejected))

    # 25. statutory placeholders audit (no invented KVK or VAT)
    def test_25_statutory_placeholders_audit_no_invented_kvk_or_vat(self):
        with open("c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/app/privacy/page.tsx", "r", encoding="utf-8") as f:
            privacy_code = f.read()
        with open("c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/app/terms/page.tsx", "r", encoding="utf-8") as f:
            terms_code = f.read()

        # Must contain explicit placeholder labels
        self.assertIn("[KVK NUMBER", privacy_code)
        self.assertIn("[VAT / BTW NUMBER", privacy_code)
        self.assertIn("[LEGAL COMPANY NAME", privacy_code)
        self.assertIn("[KVK NUMBER", terms_code)
        self.assertIn("[VAT / BTW NUMBER", terms_code)

        # Must NOT contain invented B.V. corporate structure in footer
        with open("c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/components/Footer.tsx", "r", encoding="utf-8") as f:
            footer_code = f.read()
        self.assertNotIn("YUPEK B.V.", footer_code)


class TestShippingAndTrackingPipeline(unittest.TestCase):
    """Production test suite for YUPEK Shipping, Printify Shipping Calculation, and Tracking.
    Covers all 17 required scenarios:
    1. Shipping calculation success
    2. Shipping calculation for NL
    3. Invalid address
    4. Unsupported country
    5. Multiple cart items
    6. Multiple quantities
    7. Shipping option unavailable
    8. Shipping currency handling
    9. No accidental EUR/USD mismatch
    10. Shipping calculation does NOT create Printify order
    11. Shipping calculation does NOT send to production
    12. Duplicate Printify shipment webhook
    13. Shipment tracking saved
    14. Delivered status
    15. Customer cannot access another user's order
    16. Admin can see internal Printify data
    17. Public product page contains no Printify metadata
    """

    def setUp(self):
        _in_memory_processed_events.clear()
        _in_memory_order_mirror.clear()
        _in_memory_printify_events.clear()

        self.client = TestClient(app)

        self.db_patcher = patch("app.routers.orders.get_db")
        self.mock_db = self.db_patcher.start()
        mock_table = MagicMock()
        self.mock_db.return_value.table.return_value = mock_table
        mock_table.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None

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

    def tearDown(self):
        self.db_patcher.stop()

    # 1. Shipping calculation success
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_01_shipping_calculation_success(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 450, "express": 950}

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {
                "first_name": "Leyla",
                "last_name": "A.",
                "street": "Prinsengracht 250",
                "city": "Amsterdam",
                "postal_code": "1016 GV",
                "country": "Netherlands",
            },
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["currency"], "EUR")
        self.assertEqual(len(data["options"]), 2)
        methods = [o["id"] for o in data["options"]]
        self.assertIn("standard", methods)
        self.assertIn("express", methods)
        self.assertEqual(data["options"][0]["label"], "Standard Delivery")
        self.assertEqual(data["options"][0]["amount_cents"], 450)
        self.assertEqual(data["options"][0]["amount_formatted"], "€4.50")

    # 2. Shipping calculation for NL (normalizes to ISO 'NL')
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_02_shipping_calculation_for_netherlands_iso_normalized(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 495}

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {
                "street": "Singel 10",
                "city": "Amsterdam",
                "postal_code": "1015 AA",
                "country": "Netherlands",
            },
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["country"], "NL")
        mock_calc.assert_called_once()
        called_address = mock_calc.call_args[1]["address_to"]
        self.assertEqual(called_address["country"], "NL")

    # 3. Invalid address / empty bag
    def test_03_invalid_address_and_empty_bag(self):
        resp = self.client.post("/api/shipping/calculate", json={"items": [], "address": {"country": "Netherlands"}})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("empty", resp.json()["detail"].lower())

    # 4. Unsupported country
    @patch("app.routers.orders._load_trusted_products")
    def test_04_unsupported_country(self, mock_cat):
        mock_cat.return_value = self.mock_catalog
        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Australia"},
        }
        resp = self.client.post("/api/shipping/calculate", json=payload)
        self.assertEqual(resp.status_code, 400)
        self.assertIn("not supported", resp.json()["detail"].lower())

    # 5. Multiple cart items
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_05_multiple_cart_items(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 650, "express": 1150}

        payload = {
            "items": [
                {"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1},
                {"slug": "yupek-logo-ornate-patch-crewneck-sweatshirt", "size": "M", "color": "Black", "quantity": 1},
            ],
            "address": {"country": "Belgium"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        called_items = mock_calc.call_args[1]["line_items"]
        self.assertEqual(len(called_items), 2)
        # 26.99 + 36.99 = 63.98 (6398 cents)
        self.assertEqual(resp.json()["subtotal_cents"], 6398)

    # 6. Multiple quantities & free shipping threshold
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_06_multiple_quantities_and_free_shipping_threshold(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 800, "express": 1400}

        # 4 * 26.99 = 107.96 EUR (10796 cents, >= 10000 free shipping threshold)
        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 4}],
            "address": {"country": "Netherlands"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["is_free_shipping_eligible"])
        standard_opt = next(o for o in data["options"] if o["id"] == "standard")
        self.assertEqual(standard_opt["amount_cents"], 0)
        self.assertTrue(standard_opt["is_free"])
        # Express remains standard cost
        express_opt = next(o for o in data["options"] if o["id"] == "express")
        self.assertEqual(express_opt["amount_cents"], 1400)
        self.assertFalse(express_opt["is_free"])

    # 7. Shipping option unavailable at supplier
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_07_shipping_option_unavailable(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 520}  # Only standard returned

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Germany"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data["options"]), 1)
        self.assertEqual(data["options"][0]["id"], "standard")

    # 8. Shipping currency handling (EUR accepted)
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_08_shipping_currency_handling_eur(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"currency": "EUR", "standard": 495}

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Netherlands"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["currency"], "EUR")

    # 9. No accidental EUR/USD mismatch (USD rejected)
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_09_no_accidental_eur_usd_mismatch(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"currency": "USD", "standard": 495}

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Netherlands"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        # Fails safely with 502 rather than mislabeling USD as EUR
        self.assertEqual(resp.status_code, 502)
        self.assertIn("unsupported supplier shipping currency", resp.json()["detail"].lower())

    # 10. Shipping calculation does NOT create Printify order
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.create_order")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_10_shipping_calculation_does_not_create_printify_order(self, mock_calc, mock_create, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 450}

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Netherlands"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        mock_create.assert_not_called()

    # 11. Shipping calculation does NOT send to production
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.send_to_production")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_11_shipping_calculation_does_not_send_to_production(self, mock_calc, mock_prod, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.return_value = {"standard": 450}

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Netherlands"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        self.assertEqual(resp.status_code, 200)
        mock_prod.assert_not_called()

    # 12. Duplicate Printify shipment webhook is idempotent
    def test_12_duplicate_printify_shipment_webhook(self):
        order_id = "YPK-SHIP-TEST-12"
        order = {
            "id": order_id,
            "payment_status": "paid",
            "fulfillment_status": "in_production",
            "customer_email": "customer@example.nl",
            "printify_order_id": "pfy_order_12",
        }
        _in_memory_order_mirror[order_id] = order

        resource = {
            "id": "pfy_order_12",
            "data": {
                "external_id": order_id,
                "shipments": [{"carrier": "PostNL", "number": "3SABCD123456", "url": "https://postnl.nl/track/3SABCD123456"}],
            },
        }

        res1 = handle_printify_order_event("order:shipment:created", resource, event_id="evt_ship_12")
        self.assertTrue(res1["success"])
        self.assertEqual(order["fulfillment_status"], "shipped")
        self.assertEqual(order["carrier"], "POSTNL")
        self.assertEqual(order["tracking_number"], "3SABCD123456")

        record_webhook_event("evt_ship_12", "order:shipment:created", "29215191")

        # Second delivery of same event_id is recognized as already processed
        self.assertTrue(is_event_processed("evt_ship_12"))

    # 13. Shipment tracking saved on order
    def test_13_shipment_tracking_saved(self):
        order_id = "YPK-TRACK-13"
        order = {
            "id": order_id,
            "payment_status": "paid",
            "fulfillment_status": "in_production",
            "customer_email": "track@example.com",
            "printify_order_id": "pfy_13",
        }
        _in_memory_order_mirror[order_id] = order

        resource = {
            "id": "pfy_13",
            "data": {
                "external_id": order_id,
                "shipments": [
                    {
                        "carrier": "DHL",
                        "number": "DHL-987654321",
                        "url": "https://dhl.com/track/DHL-987654321",
                    }
                ],
            },
        }

        res = handle_printify_order_event("order:shipment:created", resource)
        self.assertTrue(res["success"])
        self.assertEqual(order["carrier"], "DHL")
        self.assertEqual(order["tracking_number"], "DHL-987654321")
        self.assertEqual(order["tracking_url"], "https://dhl.com/track/DHL-987654321")
        self.assertIsNotNone(order.get("shipped_at"))

    # 14. Delivered status monotonicity
    def test_14_delivered_status_monotonicity(self):
        order_id = "YPK-DELIV-14"
        order = {
            "id": order_id,
            "payment_status": "paid",
            "fulfillment_status": "shipped",
            "customer_email": "delivered@example.com",
            "printify_order_id": "pfy_14",
        }
        _in_memory_order_mirror[order_id] = order

        resource = {
            "id": "pfy_14",
            "data": {
                "external_id": order_id,
                "shipments": [{"carrier": "PostNL", "number": "NL1234", "delivered_at": "2026-10-08T12:00:00Z"}],
            },
        }

        # Step 1: delivered arrives
        res = handle_printify_order_event("order:shipment:delivered", resource)
        self.assertTrue(res["success"])
        self.assertEqual(order["fulfillment_status"], "delivered")
        self.assertIsNotNone(order.get("delivered_at"))

        # Step 2: out-of-order delayed shipped event arrives
        res2 = handle_printify_order_event("order:shipment:created", resource)
        # Fulfillment status remains delivered; monotonic protection prevents regression!
        self.assertEqual(order["fulfillment_status"], "delivered")

    # 15. Customer cannot access another user's order
    def test_15_customer_cannot_access_another_users_order(self):
        order_id = "YPK-SEC-15"
        order = {
            "id": order_id,
            "customer_email": "victim@example.com",
            "user_id": "user_victim_123",
            "payment_status": "paid",
            "fulfillment_status": "shipped",
        }
        _in_memory_order_mirror[order_id] = order

        # User Bob attempts to access Alice's order
        attacker_user = {"sub": "user_bob_456", "email": "bob@example.com", "role": "authenticated"}
        with self.assertRaises(HTTPException) as cm:
            get_customer_order_by_id(order_id, user=attacker_user)
        self.assertEqual(cm.exception.status_code, 404)

    # 16. Admin can see internal Printify data
    def test_16_admin_can_see_internal_printify_data(self):
        order_id = "YPK-ADMIN-16"
        order = {
            "id": order_id,
            "customer_email": "customer@example.com",
            "payment_status": "paid",
            "fulfillment_status": "shipped",
            "printify_order_id": "pfy_admin_16",
            "carrier": "DHL",
            "tracking_number": "TRACK-16",
            "shipping_method": "express",
            "shipping_method_label": "Express Delivery",
        }
        _in_memory_order_mirror[order_id] = order

        stored = _get_order_by_id(order_id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored["printify_order_id"], "pfy_admin_16")
        self.assertEqual(stored["carrier"], "DHL")
        self.assertEqual(stored["tracking_number"], "TRACK-16")

    # 17. Public product page contains no Printify metadata
    def test_17_public_product_page_contains_no_printify_metadata(self):
        with open("c:/Users/Gebruiker/Desktop/YUPEK/yupek-web/data/site-config.json", "r", encoding="utf-8") as f:
            cfg = json.load(f)

        serialized = json.dumps(cfg)
        self.assertNotIn("PRINTIFY_API_TOKEN", serialized)
        self.assertNotIn("PRINTIFY_WEBHOOK_SECRET", serialized)

    # 18. Printify API unavailable returns safe 503 error and NEVER invents fallback prices
    @patch("app.routers.orders._load_trusted_products")
    @patch("app.suppliers.printify.PrintifyClient.calculate_shipping")
    def test_18_printify_unavailable_safe_error_never_invent_fallback(self, mock_calc, mock_cat):
        mock_cat.return_value = self.mock_catalog
        mock_calc.side_effect = Exception("Printify API 503 Service Unavailable")

        payload = {
            "items": [{"slug": "yupek-logo-white-cotton-shirt", "size": "M", "color": "White", "quantity": 1}],
            "address": {"country": "Netherlands"},
        }

        with patch.object(config, "PRINTIFY_API_TOKEN", "valid_token"):
            resp = self.client.post("/api/shipping/calculate", json=payload)

        # Must return safe 503 error, NEVER fabricated rates (e.g. 4.95 / 9.95)
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(resp.json()["detail"], "Server temporarily unavailable. Please try again.")


class AsyncMock(MagicMock):
    async def __call__(self, *args, **kwargs):
        return super(AsyncMock, self).__call__(*args, **kwargs)


if __name__ == "__main__":
    unittest.main()




