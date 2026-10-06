import logging
import os
import random
from datetime import datetime, timezone
from typing import Any, Literal
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel, EmailStr
from .. import config
from ..auth import optional_user
from ..db import get_db
from ..payments.provider import (
    PaymentsNotConfigured,
    InvalidSignature,
    create_payment_intent,
    verify_webhook_signature,
    retrieve_payment_intent,
)
from ..suppliers.printify import PrintifyClient

logger = logging.getLogger("orders")
router = APIRouter(tags=["orders"])


# =====================================================================
# PYDANTIC SCHEMAS
# =====================================================================

class CustomerShippingAddress(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    street: str
    address2: str | None = ""
    city: str
    postalCode: str
    country: str = "Netherlands"
    region: str | None = ""


class CheckoutItemInput(BaseModel):
    product_id: str | None = None
    supplier_product_id: str | None = None
    slug: str | None = None
    variant_id: str | int | None = None
    color: str | None = None
    size: str | None = None
    quantity: int = 1


class CreateIntentRequest(BaseModel):
    customer: CustomerShippingAddress
    items: list[CheckoutItemInput]
    delivery: Literal["standard", "express"] = "standard"
    order_id: str | None = None
    user_id: str | None = None


# =====================================================================
# TRUSTED CATALOG & PRICING HELPERS
# =====================================================================

def _load_trusted_products() -> list[dict[str, Any]]:
    """Load trusted products strictly from Supabase site_config (or local mirror fallback)."""
    try:
        db = get_db()
        row = db.table("site_config").select("value").eq("key", "global").maybe_single().execute().data
        if row and isinstance(row.get("value"), dict):
            return row["value"].get("customProducts") or []
    except Exception as exc:
        logger.warning(f"Could not load site_config from Supabase: {exc}")

    # Fallback to local site-config.json
    try:
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "yupek-web", "data", "site-config.json"
        )
        if os.path.exists(config_path):
            import json
            with open(config_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("customProducts") or []
    except Exception:
        pass
    return []


def _resolve_and_validate_items(items: list[CheckoutItemInput]) -> tuple[list[dict[str, Any]], int]:
    """Validate requested items against trusted catalog and calculate subtotal strictly in integer cents.
    
    NEVER trusts browser-provided prices or totals.
    """
    if not items:
        raise HTTPException(400, "Your bag is empty.")

    trusted_catalog = _load_trusted_products()
    if not trusted_catalog:
        raise HTTPException(500, "Catalog is currently unavailable. Please try again.")

    validated_items: list[dict[str, Any]] = []
    subtotal_cents = 0

    for item in items:
        if item.quantity < 1 or item.quantity > 10:
            raise HTTPException(400, f"Invalid quantity ({item.quantity}) for item.")

        # Find product by supplierProductId, id, or slug
        matched_product = None
        for p in trusted_catalog:
            p_supplier_id = str(p.get("supplierProductId", ""))
            p_id = str(p.get("id", ""))
            p_slug = str(p.get("slug", ""))
            
            if (item.supplier_product_id and p_supplier_id == str(item.supplier_product_id)) or \
               (item.product_id and p_id == str(item.product_id)) or \
               (item.slug and p_slug == str(item.slug)):
                matched_product = p
                break

        if not matched_product:
            raise HTTPException(404, f"Product '{item.slug or item.product_id}' not found in trusted catalog.")

        # Find variant in product
        variants = matched_product.get("variants") or []
        matched_variant = None

        for v in variants:
            v_id = str(v.get("variant_id", ""))
            v_size = str(v.get("size", "")).strip().lower()
            v_color = str(v.get("color", "")).strip().lower()

            # Match by variant_id if provided
            if item.variant_id and v_id == str(item.variant_id):
                matched_variant = v
                break
            
            # Match by size and color
            if item.size and item.color:
                if v_size == item.size.strip().lower() and v_color == item.color.strip().lower():
                    matched_variant = v
                    break

        if not matched_variant:
            # Fallback to first available variant if only size/color provided
            for v in variants:
                if item.size and str(v.get("size", "")).strip().lower() == item.size.strip().lower():
                    matched_variant = v
                    break

        if not matched_variant:
            raise HTTPException(400, f"Selected variant is unavailable for '{matched_product.get('name')}'.")

        if matched_variant.get("is_enabled") is False or matched_variant.get("is_available") is False:
            raise HTTPException(400, f"Variant '{matched_variant.get('title')}' is currently out of stock.")

        # Authoritative price strictly from catalog (in integer cents)
        unit_price_cents = matched_variant.get("price_cents")
        if unit_price_cents is None or unit_price_cents <= 0:
            unit_price_cents = int(round(float(matched_product.get("price", 0)) * 100))

        if unit_price_cents <= 0:
            raise HTTPException(500, f"Invalid pricing detected for '{matched_product.get('name')}'.")

        subtotal_cents += unit_price_cents * item.quantity

        validated_items.append({
            "product_id": matched_product.get("id"),
            "supplier_product_id": matched_product.get("supplierProductId"),
            "variant_id": matched_variant.get("variant_id"),
            "sku": matched_variant.get("sku", ""),
            "title": matched_product.get("name"),
            "color": matched_variant.get("color") or item.color or "",
            "size": matched_variant.get("size") or item.size or "",
            "quantity": item.quantity,
            "unit_price_cents": unit_price_cents,
            "image": (matched_product.get("images") or [""])[0],
        })

    return validated_items, subtotal_cents


# =====================================================================
# ORDER PERSISTENCE DUAL-LAYER (TABLE + SITE_CONFIG)
# =====================================================================

_in_memory_order_mirror: dict[str, Any] = {}


def _save_order_record(order: dict[str, Any]) -> None:
    """Persist order to in-memory cache, Supabase orders table, and site_config.storeOrders."""
    now_iso = datetime.now(timezone.utc).isoformat()
    order["updated_at"] = now_iso
    order_id = str(order.get("id"))
    _in_memory_order_mirror[order_id] = dict(order)

    # 1. Attempt dedicated orders table
    try:
        db = get_db()
        db.table("orders").upsert({
            "id": order_id,
            "customer_email": order.get("customer_email", ""),
            "customer_name": order.get("customer_name", ""),
            "shipping_address": order.get("shipping_address", {}),
            "currency": order.get("currency", "EUR"),
            "subtotal_cents": order.get("subtotal_cents", 0),
            "shipping_cents": order.get("shipping_cents", 0),
            "vat_cents": order.get("vat_cents", 0),
            "total_cents": order.get("total_cents", 0),
            "payment_status": order.get("payment_status", "pending"),
            "fulfillment_status": order.get("fulfillment_status", "pending_payment"),
            "stripe_payment_intent_id": order.get("stripe_payment_intent_id"),
            "printify_order_id": order.get("printify_order_id"),
            "items": order.get("items", []),
            "notes": order.get("notes"),
            "user_id": order.get("user_id"),
            "created_at": order.get("created_at", now_iso),
            "updated_at": now_iso,
        }, on_conflict="id").execute()
    except Exception as exc:
        logger.info(f"Orders table write notice (table may not be created yet): {exc}")

    # 2. Always persist into site_config.storeOrders for storefront & admin compatibility
    try:
        db = get_db()
        row = db.table("site_config").select("value").eq("key", "global").maybe_single().execute().data
        if row and isinstance(row.get("value"), dict):
            cfg = row["value"]
            existing = cfg.get("storeOrders", [])
            # Store formatted object compatible with existing Admin panel
            admin_order = {
                "id": order_id,
                "orderNumber": order_id,
                "createdAt": order.get("created_at", now_iso),
                "status": "Processing" if order.get("payment_status") == "paid" else "New",
                "payment_status": order.get("payment_status", "pending"),
                "fulfillment_status": order.get("fulfillment_status", "pending_payment"),
                "stripe_payment_intent_id": order.get("stripe_payment_intent_id"),
                "printify_order_id": order.get("printify_order_id"),
                "total": round(order.get("total_cents", 0) / 100.0, 2),
                "subtotal": round(order.get("subtotal_cents", 0) / 100.0, 2),
                "shipping": round(order.get("shipping_cents", 0) / 100.0, 2),
                "paymentMethod": "Stripe",
                "deliveryMethod": order.get("delivery_method", "Standard Courier"),
                "customer": order.get("shipping_address", {}),
                "items": [
                    {
                        "name": i.get("title", "Garment"),
                        "size": i.get("size", "M"),
                        "color": i.get("color", "Default"),
                        "qty": i.get("quantity", 1),
                        "price": round(i.get("unit_price_cents", 0) / 100.0, 2),
                        "image": i.get("image", ""),
                        "productId": i.get("product_id"),
                        "supplierProductId": i.get("supplier_product_id"),
                        "variantId": i.get("variant_id"),
                    }
                    for i in order.get("items", [])
                ],
            }
            updated = [admin_order] + [o for o in existing if o.get("id") != order_id]
            cfg["storeOrders"] = updated
            db.table("site_config").upsert({
                "key": "global",
                "value": cfg,
                "updated_at": now_iso,
            }).execute()
    except Exception as exc:
        logger.error(f"Failed to sync order to site_config.storeOrders: {exc}")


def _get_order_by_id(order_id: str) -> dict[str, Any] | None:
    """Retrieve order by YUPEK order ID from in-memory cache, orders table, or site_config."""
    if str(order_id) in _in_memory_order_mirror:
        return _in_memory_order_mirror[str(order_id)]

    db = get_db()
    # 1. Try orders table
    try:
        res = db.table("orders").select("*").eq("id", order_id).maybe_single().execute().data
        if res:
            _in_memory_order_mirror[str(order_id)] = res
            return res
    except Exception:
        pass

    # 2. Try site_config.storeOrders
    try:
        row = db.table("site_config").select("value").eq("key", "global").maybe_single().execute().data
        if row and isinstance(row.get("value"), dict):
            orders = row["value"].get("storeOrders", [])
            for o in orders:
                if str(o.get("id")) == str(order_id) or str(o.get("orderNumber")) == str(order_id):
                    return {
                        "id": o.get("id"),
                        "customer_email": o.get("customer", {}).get("email"),
                        "customer_name": f"{o.get('customer', {}).get('firstName', '')} {o.get('customer', {}).get('lastName', '')}".strip(),
                        "shipping_address": o.get("customer", {}),
                        "subtotal_cents": int(round(o.get("subtotal", 0) * 100)),
                        "shipping_cents": int(round(o.get("shipping", 0) * 100)),
                        "vat_cents": round(int(round(o.get("total", 0) * 100)) - int(round(o.get("total", 0) * 100)) / 1.21),
                        "total_cents": int(round(o.get("total", 0) * 100)),
                        "payment_status": o.get("payment_status", "pending"),
                        "fulfillment_status": o.get("fulfillment_status", "pending_payment"),
                        "stripe_payment_intent_id": o.get("stripe_payment_intent_id"),
                        "printify_order_id": o.get("printify_order_id"),
                        "items": [
                            {
                                "title": i.get("name"),
                                "size": i.get("size"),
                                "color": i.get("color"),
                                "quantity": i.get("qty", 1),
                                "unit_price_cents": int(round(i.get("price", 0) * 100)),
                                "supplier_product_id": i.get("supplierProductId"),
                                "variant_id": i.get("variantId"),
                                "image": i.get("image", ""),
                            }
                            for i in o.get("items", [])
                        ],
                        "created_at": o.get("createdAt"),
                    }
    except Exception:
        pass
    return None


_in_memory_processed_events: set[str] = set()


def _is_webhook_event_processed(event_id: str) -> bool:
    """Check database-level idempotency for Stripe webhook events."""
    if not event_id:
        return False
    if event_id in _in_memory_processed_events:
        return True
    db = get_db()
    try:
        res = db.table("stripe_webhook_events").select("id").eq("stripe_event_id", event_id).limit(1).execute().data
        if res and len(res) > 0:
            _in_memory_processed_events.add(event_id)
            return True
    except Exception:
        pass
    return False


def _record_webhook_event(event_id: str, event_type: str, status: str = "processed", error: str | None = None) -> None:
    """Record webhook event in stripe_webhook_events table."""
    if event_id:
        _in_memory_processed_events.add(event_id)
    db = get_db()
    try:
        db.table("stripe_webhook_events").upsert({
            "stripe_event_id": event_id,
            "event_type": event_type,
            "status": status,
            "error": error,
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }, on_conflict="stripe_event_id").execute()
    except Exception as exc:
        logger.info(f"Notice recording stripe_webhook_events: {exc}")



# =====================================================================
# API ENDPOINTS
# =====================================================================

@router.post("/api/checkout/create-intent")
async def create_checkout_intent(body: CreateIntentRequest, user=Depends(optional_user)):
    """Create or reuse a verified Stripe PaymentIntent and record/update a pending order.
    
    1. Reuses existing YUPEK order and PaymentIntent if retryable.
    2. Loads product & variant prices from trusted catalog in integer cents.
    3. Validates stock, availability, and delivery options.
    4. Calculates authoritative totals strictly server-side.
    5. Records order in Supabase with payment_status='pending', fulfillment_status='pending_payment'.
    6. Returns client_secret and authoritative order summary.
    """
    if body.customer.country not in config.COUNTRIES:
        raise HTTPException(400, f"Shipping to {body.customer.country} is currently not supported.")

    # 1. Check for existing order to reuse
    existing_order = None
    order_id = body.order_id
    if order_id:
        existing_order = _get_order_by_id(order_id)
        if existing_order and existing_order.get("payment_status") == "paid":
            raise HTTPException(400, "This order has already been paid.")

    if not existing_order or not order_id:
        order_id = f"YPK-2026-{random.randint(1000, 9999)}"

    # 2. Authoritative price & variant verification
    validated_items, subtotal_cents = _resolve_and_validate_items(body.items)

    # 3. Shipping calculation (Free over 10000 cents for standard)
    free_shipping = body.delivery == "standard" and subtotal_cents >= config.FREE_SHIPPING_OVER
    shipping_cents = 0 if free_shipping else config.DELIVERY.get(body.delivery, 495)
    total_cents = subtotal_cents + shipping_cents
    vat_cents = round(total_cents - total_cents / (1 + config.VAT_RATE))

    now_iso = datetime.now(timezone.utc).isoformat()

    # 4. Create or reuse Stripe PaymentIntent
    intent_client_secret = ""
    payment_intent_id = ""

    if existing_order and existing_order.get("stripe_payment_intent_id"):
        try:
            existing_pi = retrieve_payment_intent(existing_order["stripe_payment_intent_id"])
            pi_status = existing_pi.get("status")
            if pi_status in ("requires_payment_method", "requires_confirmation", "requires_action"):
                # Reuse existing retryable PaymentIntent
                intent_client_secret = existing_pi.get("client_secret", "")
                payment_intent_id = existing_pi.get("id", "")
            elif pi_status == "succeeded":
                raise HTTPException(400, "Payment for this order has already succeeded.")
        except PaymentsNotConfigured:
            raise HTTPException(503, "Payments not configured")
        except HTTPException:
            raise
        except Exception as exc:
            logger.info(f"Could not reuse existing PaymentIntent {existing_order.get('stripe_payment_intent_id')}: {exc}")

    if not intent_client_secret:
        try:
            intent = create_payment_intent(
                order_id=order_id,
                yupek_order_id=order_id,
                amount_cents=total_cents,
                currency="eur",
                customer_email=body.customer.email,
            )
            intent_client_secret = intent["client_secret"]
            payment_intent_id = intent["payment_intent_id"]
        except PaymentsNotConfigured as exc:
            raise HTTPException(503, str(exc))
        except Exception as exc:
            logger.error(f"Stripe PaymentIntent creation failed: {exc}")
            raise HTTPException(500, "Unable to initialize secure payment. Please try again.")

    # 5. Save or update order in Supabase
    order_record = {
        "id": order_id,
        "customer_email": body.customer.email,
        "customer_name": f"{body.customer.first_name} {body.customer.last_name}".strip(),
        "shipping_address": body.customer.model_dump(),
        "currency": "EUR",
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "vat_cents": vat_cents,
        "total_cents": total_cents,
        "delivery_method": "Express Courier" if body.delivery == "express" else "Standard Courier",
        "payment_status": "pending",
        "fulfillment_status": "pending_payment",
        "stripe_payment_intent_id": payment_intent_id,
        "printify_order_id": existing_order.get("printify_order_id") if existing_order else None,
        "items": validated_items,
        "user_id": body.user_id or (user.get("sub") if isinstance(user, dict) else None) or (existing_order.get("user_id") if existing_order else None),
        "created_at": existing_order.get("created_at") if existing_order else now_iso,
    }
    _save_order_record(order_record)

    return {
        "order_id": order_id,
        "client_secret": intent_client_secret,
        "payment_intent_id": payment_intent_id,
        "currency": "EUR",
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "vat_cents": vat_cents,
        "total_cents": total_cents,
    }



@router.post("/api/webhooks/stripe")
@router.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    """Authoritative Stripe Webhook Handler.
    
    1. Verifies cryptographic signature using raw body and STRIPE_WEBHOOK_SECRET.
    2. Enforces database-level idempotency via stripe_webhook_events.
    3. On payment_intent.succeeded:
       - Verifies currency is EUR and amount matches authoritative order total.
       - Updates order payment_status='paid'.
       - Idempotently creates Printify order (STOPS if printify_order_id already exists).
       - Sets fulfillment_status='printify_order_created'.
    4. On payment_intent.payment_failed:
       - Sets payment_status='failed'. Never sends unpaid orders to Printify.
    """
    payload = await request.body()
    signature_header = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook_signature(payload, signature_header)
    except PaymentsNotConfigured:
        raise HTTPException(503, "Payments not configured")
    except InvalidSignature as exc:
        raise HTTPException(400, f"Invalid signature: {exc}")

    event_id = event.get("id")
    event_type = event.get("type")

    # 1. Idempotency Check
    if _is_webhook_event_processed(event_id):
        logger.info(f"Stripe event {event_id} already processed. Returning 200.")
        return {"received": True, "status": "already_processed"}

    _record_webhook_event(event_id, event_type, status="processing")

    try:
        if event_type == "payment_intent.succeeded":
            intent = event["data"]["object"]
            order_id = intent.get("metadata", {}).get("order_id") or intent.get("metadata", {}).get("yupek_order_id")

            if not order_id:
                logger.error(f"PaymentIntent {intent.get('id')} has no order_id metadata.")
                _record_webhook_event(event_id, event_type, status="error", error="Missing order_id")
                return {"received": True, "error": "Missing order_id"}

            order = _get_order_by_id(order_id)
            if not order:
                logger.error(f"Order {order_id} not found in database.")
                _record_webhook_event(event_id, event_type, status="error", error="Order not found")
                return {"received": True, "error": "Order not found"}

            # Validate currency and amount received
            if intent.get("currency", "").lower() != "eur":
                raise ValueError(f"Currency mismatch: expected eur, got {intent.get('currency')}")

            if intent.get("amount_received") != order["total_cents"]:
                raise ValueError(f"Amount mismatch: received {intent.get('amount_received')}, expected {order['total_cents']}")

            # Update payment status
            order["payment_status"] = "paid"
            order["stripe_payment_intent_id"] = intent.get("id")

            # 2. Check if Printify order has already been created (Critical Idempotency)
            if order.get("printify_order_id"):
                logger.warning(f"Printify order already exists for {order_id}: {order['printify_order_id']}. Skipping Printify creation.")
                _save_order_record(order)
                _record_webhook_event(event_id, event_type, status="processed")
                return {"received": True, "printify_order_id": order["printify_order_id"]}

            # 3. Create Printify Order
            printify_client = PrintifyClient()
            shipping_addr = order.get("shipping_address") or {}

            # Map line items with real Printify product_id and variant_id
            printify_line_items = []
            for item in order.get("items", []):
                prod_id = item.get("supplier_product_id")
                var_id = item.get("variant_id")
                if prod_id and var_id:
                    printify_line_items.append({
                        "product_id": str(prod_id),
                        "variant_id": int(var_id),
                        "quantity": int(item.get("quantity", 1)),
                    })

            if printify_line_items:
                printify_order_payload = {
                    "external_id": str(order_id),
                    "label": str(order_id),
                    "line_items": printify_line_items,
                    "shipping_method": 2 if order.get("delivery_method") == "Express Courier" else 1,
                    "send_shipping_notification": False,
                    "address_to": {
                        "first_name": shipping_addr.get("first_name") or shipping_addr.get("firstName", ""),
                        "last_name": shipping_addr.get("last_name") or shipping_addr.get("lastName", ""),
                        "email": order.get("customer_email"),
                        "phone": shipping_addr.get("phone", ""),
                        "country": shipping_addr.get("country", "Netherlands"),
                        "region": shipping_addr.get("region", ""),
                        "address1": shipping_addr.get("address1") or shipping_addr.get("street", ""),
                        "address2": shipping_addr.get("address2", ""),
                        "city": shipping_addr.get("city", ""),
                        "zip": shipping_addr.get("zip") or shipping_addr.get("postalCode", ""),
                    },
                }

                try:
                    printify_res = printify_client.create_order(
                        order_data=printify_order_payload,
                        shop_id=config.PRINTIFY_SHOP_ID,
                    )
                    created_printify_id = printify_res.get("id")
                    if created_printify_id:
                        order["printify_order_id"] = str(created_printify_id)
                        order["fulfillment_status"] = "printify_order_created"
                        logger.info(f"Printify order {created_printify_id} created for YUPEK {order_id}")
                except Exception as p_err:
                    logger.error(f"Printify order creation failed for {order_id}: {p_err}")
                    order["fulfillment_status"] = "paid"  # Payment is safe; fulfillment pending admin retry
            else:
                logger.info(f"No Printify line items present for order {order_id}")
                order["fulfillment_status"] = "paid"

            _save_order_record(order)
            _record_webhook_event(event_id, event_type, status="processed")
            return {"received": True, "order_id": order_id, "payment_status": "paid"}

        elif event_type == "payment_intent.payment_failed":
            intent = event["data"]["object"]
            order_id = intent.get("metadata", {}).get("order_id")
            if order_id:
                order = _get_order_by_id(order_id)
                if order:
                    order["payment_status"] = "failed"
                    _save_order_record(order)
            _record_webhook_event(event_id, event_type, status="processed")
            return {"received": True, "status": "payment_failed"}

        else:
            _record_webhook_event(event_id, event_type, status="ignored")
            return {"received": True, "status": "unhandled_event"}

    except Exception as exc:
        logger.error(f"Error handling Stripe webhook event {event_id}: {exc}")
        _record_webhook_event(event_id, event_type, status="error", error=str(exc))
        raise HTTPException(500, f"Webhook processing error: {exc}")


@router.get("/api/orders/{order_id}")
def get_order_status(order_id: str):
    """Retrieve authoritative order status for customer success page."""
    order = _get_order_by_id(order_id)
    if not order:
        raise HTTPException(404, f"Order '{order_id}' not found.")

    return {
        "order_id": order.get("id"),
        "customer_email": order.get("customer_email"),
        "customer_name": order.get("customer_name"),
        "currency": order.get("currency", "EUR"),
        "total_cents": order.get("total_cents"),
        "subtotal_cents": order.get("subtotal_cents"),
        "shipping_cents": order.get("shipping_cents"),
        "payment_status": order.get("payment_status", "pending"),
        "fulfillment_status": order.get("fulfillment_status", "pending_payment"),
        "printify_order_id": order.get("printify_order_id"),
        "created_at": order.get("created_at"),
        "items": order.get("items", []),
    }
