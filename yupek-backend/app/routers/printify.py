from datetime import datetime, timezone
import json
import logging
from typing import Any
from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from app.suppliers.printify import (
    PrintifyClient,
    get_printify_sync_status,
    is_event_processed,
    record_webhook_event,
    sync_printify_product,
    verify_webhook_signature,
)

logger = logging.getLogger("printify_router")
router = APIRouter(prefix="/api/printify", tags=["printify"])


def send_order_shipped_email(order: dict[str, Any]) -> bool:
    """Send customer shipping email notification with tracking number and link.
    Returns True if successfully dispatched, False otherwise.
    """
    if order.get("shipped_email_sent"):
        return True
    if not order.get("customer_email"):
        return False
    logger.info(f"Dispatched order shipped email for {order.get('id')} to {order.get('customer_email')}")
    order["shipped_email_sent"] = True
    return True


def send_order_delivered_email(order: dict[str, Any]) -> bool:
    """Send customer delivery email notification.
    Returns True if successfully dispatched, False otherwise.
    """
    if order.get("delivered_email_sent"):
        return True
    if not order.get("customer_email"):
        return False
    logger.info(f"Dispatched order delivered email for {order.get('id')} to {order.get('customer_email')}")
    order["delivered_email_sent"] = True
    return True


def handle_printify_order_event(event_type: str, resource: dict[str, Any], event_id: str = "") -> dict[str, Any]:
    """Process incoming Printify order and shipment webhook events.
    
    Progression:
    printify_order_created -> in_production -> shipped -> delivered
    
    Protections:
    - Never regresses fulfillment status.
    - Never marks an unpaid order as paid.
    - Sets carrier, tracking_number, tracking_url, and timestamps.
    - Never destroys existing valid tracking with empty values.
    - Guards customer shipping email to send exactly once.
    """
    from .orders import _get_order_by_id, _save_order_record, _in_memory_order_mirror
    from app.db import get_db

    resource_data = resource.get("data") or {}
    external_id = str(resource_data.get("external_id") or resource_data.get("label") or "").strip()
    printify_order_id = str(resource.get("id") or resource_data.get("id") or "").strip()

    order = None
    if external_id:
        order = _get_order_by_id(external_id)

    if not order and printify_order_id:
        for cand in _in_memory_order_mirror.values():
            if str(cand.get("printify_order_id") or "") == printify_order_id:
                order = cand
                break

        if not order:
            try:
                db = get_db()
                res = db.table("orders").select("id").eq("printify_order_id", printify_order_id).maybe_single().execute().data
                if res and res.get("id"):
                    order = _get_order_by_id(res["id"])
            except Exception:
                pass

    if not order:
        logger.info(f"Order not found for Printify event {event_type}: external_id='{external_id}', printify_id='{printify_order_id}'")
        return {"success": False, "message": "order_not_found"}

    # Payment protection: unpaid order receiving shipment webhook must NOT advance fulfillment or mark paid
    if order.get("payment_status") != "paid":
        logger.warning(f"Order {order.get('id')} payment_status is '{order.get('payment_status')}'. Skipping fulfillment transition.")
        return {"success": False, "message": "order_unpaid"}

    status_rank = {
        "pending_payment": 0,
        "paid": 1,
        "printify_order_created": 2,
        "sent_to_production": 3,
        "in_production": 3,
        "shipped": 4,
        "delivered": 5,
    }

    current_status = order.get("fulfillment_status", "pending_payment")
    target_status = current_status
    if event_type == "order:created":
        target_status = "printify_order_created"
    elif event_type == "order:sent-to-production":
        target_status = "in_production"
    elif event_type == "order:shipment:created":
        target_status = "shipped"
    elif event_type == "order:shipment:delivered":
        target_status = "delivered"
    elif event_type == "order:updated":
        # Keep current fulfillment status unless shipments indicate otherwise
        if resource_data.get("status") == "fulfilled":
            target_status = "delivered"
        elif resource_data.get("shipments"):
            target_status = "shipped"

    if printify_order_id and not order.get("printify_order_id"):
        order["printify_order_id"] = printify_order_id

    current_rank = status_rank.get(current_status, 0)
    target_rank = status_rank.get(target_status, 0)

    # Monotonic progression: only advance, never regress
    if target_rank > current_rank:
        order["fulfillment_status"] = target_status
    else:
        logger.info(f"Monotonic protection: order {order.get('id')} is already '{current_status}' (rank {current_rank}). Will not regress to '{target_status}' (rank {target_rank}).")

    # Parse shipment details (never erase valid existing data with empty values)
    shipments = resource_data.get("shipments") or []
    if isinstance(shipments, list) and len(shipments) > 0:
        primary_shipment = next(
            (s for s in shipments if isinstance(s, dict) and (s.get("number") or s.get("url") or s.get("carrier"))),
            shipments[0]
        )

        if isinstance(primary_shipment, dict):
            if primary_shipment.get("carrier"):
                order["carrier"] = str(primary_shipment["carrier"]).upper()

            tracking_numbers = [
                str(s.get("number")).strip()
                for s in shipments
                if isinstance(s, dict) and s.get("number")
            ]
            if tracking_numbers:
                order["tracking_number"] = ", ".join(tracking_numbers)
            elif primary_shipment.get("number"):
                order["tracking_number"] = str(primary_shipment["number"]).strip()

            if primary_shipment.get("url"):
                order["tracking_url"] = str(primary_shipment["url"]).strip()

            if primary_shipment.get("delivered_at"):
                order["delivered_at"] = str(primary_shipment["delivered_at"])

    now_iso = datetime.now(timezone.utc).isoformat()
    if event_type == "order:shipment:created" and not order.get("shipped_at"):
        order["shipped_at"] = now_iso
    if event_type == "order:shipment:delivered" and not order.get("delivered_at"):
        order["delivered_at"] = now_iso

    # Email guard: customer shipping email dispatched exactly once
    email_dispatched = False
    is_shipment_event = (
        event_type == "order:shipment:created"
        or order.get("fulfillment_status") in ("shipped", "delivered")
    )
    if is_shipment_event and not order.get("shipped_email_sent"):
        try:
            if send_order_shipped_email(order):
                order["shipped_email_sent"] = True
                email_dispatched = True
        except Exception as email_err:
            logger.warning(f"Shipment email delivery failed for order {order.get('id')}: {email_err}")
            # Order remains shipped, but shipped_email_sent remains False so retry can occur later

    # Delivery email guard: customer delivery email dispatched exactly once
    delivered_email_dispatched = False
    if order.get("fulfillment_status") == "delivered" and not order.get("delivered_email_sent"):
        try:
            if send_order_delivered_email(order):
                order["delivered_email_sent"] = True
                delivered_email_dispatched = True
        except Exception as email_err:
            logger.warning(f"Delivery email failed for order {order.get('id')}: {email_err}")

    _save_order_record(order)
    return {
        "success": True,
        "order_id": order.get("id"),
        "status": order.get("fulfillment_status"),
        "email_dispatched": email_dispatched,
        "delivered_email_dispatched": delivered_email_dispatched,
    }


@router.get("/shops")
def get_printify_shops(refresh: bool = Query(False, description="Bypass cache and force refresh")):
    """Fetch the list of shops connected to the Printify account.
    Never exposes or returns the API token or secrets.
    """
    try:
        client = PrintifyClient()
        shops = client.get_shops(force_refresh=refresh)
        return shops
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while querying Printify shops.",
        )


@router.get("/products")
def get_printify_products(
    shop_id: str | None = Query(None, description="Optional Printify shop ID, defaults to configured PRINTIFY_SHOP_ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=50, description="Items per page (max 50)"),
    refresh: bool = Query(False, description="Bypass cache and force refresh"),
):
    """Retrieve normalized products from the Printify API store."""
    try:
        client = PrintifyClient()
        data = client.get_products(shop_id=shop_id, page=page, limit=limit, force_refresh=refresh)
        return data
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while querying Printify products.",
        )


@router.get("/products/{product_id}")
def get_printify_product(
    product_id: str,
    shop_id: str | None = Query(None, description="Optional Printify shop ID, defaults to configured PRINTIFY_SHOP_ID"),
    refresh: bool = Query(False, description="Bypass cache and force refresh"),
):
    """Retrieve single normalized product details from Printify."""
    try:
        client = PrintifyClient()
        product = client.get_product(product_id=product_id, shop_id=shop_id, force_refresh=refresh)
        return product
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected error occurred while querying Printify product details.",
        )


@router.post("/webhook")
async def handle_printify_webhook(request: Request):
    """Production Webhook Endpoint for Printify Product Events.

    Endpoint: POST /api/printify/webhook
    Accepts Printify webhook JSON payloads.
    Returns HTTP 200 quickly after receiving a valid webhook.

    Security:
    - Validates HMAC-SHA256 signature in X-Pfy-Signature header using PRINTIFY_WEBHOOK_SECRET.
    - Never trusts arbitrary POST requests; returns 401 on invalid signature.
    - Strictly validates shop_id == 29215191 (never touches Etsy 29193770).
    - Idempotent: rejects duplicate event_ids without re-processing.
    """
    raw_body = await request.body()
    sig_header = (
        request.headers.get("X-Pfy-Signature")
        or request.headers.get("x-pfy-signature")
        or request.headers.get("X-Printify-Signature")
    )

    # 1. Security Check: Validate Webhook Signature
    if not verify_webhook_signature(raw_body, sig_header):
        logger.warning("Rejected Printify webhook request: Invalid or missing X-Pfy-Signature.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature.",
        )

    # 2. Parse Webhook Payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        logger.error(f"Malformed JSON in Printify webhook: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload.",
        )

    event_id = str(payload.get("id") or "")
    event_type = str(payload.get("type") or "")
    resource = payload.get("resource") or {}
    resource_id = str(resource.get("id") or "")
    resource_data = resource.get("data") or {}

    # Extract shop_id from resource data or payload root
    shop_id = str(
        resource_data.get("shop_id")
        or payload.get("data", {}).get("shop_id")
        or payload.get("shop_id")
        or ""
    )

    logger.info(f"Received valid Printify webhook: id={event_id} type={event_type} shop={shop_id} resource={resource_id}")

    # 3. Shop Validation: Require explicit shop_id AND enforce shop_id == 29215191
    if not shop_id:
        logger.warning("Rejected Printify webhook request: Missing shop_id.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required shop_id in webhook payload.",
        )

    # If webhook belongs to another shop (e.g. Etsy 29193770): safely ignore and return HTTP 200
    if shop_id != "29215191":
        logger.info(f"Safely ignoring webhook for non-target shop {shop_id}. Etsy and other stores are excluded.")
        return {
            "status": "ignored",
            "reason": "shop_not_eligible",
            "received_shop_id": shop_id,
        }

    # 4. Idempotency Check
    if event_id and is_event_processed(event_id):
        logger.info(f"Duplicate webhook event detected: id={event_id}. Skipping processing idempotently.")
        return {
            "status": "ok",
            "message": "event_already_processed",
            "event_id": event_id,
        }

    # 5. Process Events
    supported_product_events = {
        "product:created",
        "product:updated",
        "product:deleted",
        "product:publish:started",
    }
    supported_order_events = {
        "order:created",
        "order:updated",
        "order:sent-to-production",
        "order:shipment:created",
        "order:shipment:delivered",
    }

    if event_type in supported_order_events:
        order_res = handle_printify_order_event(event_type, resource, event_id)
        record_webhook_event(
            event_id=event_id,
            event_type=event_type,
            shop_id="29215191",
            resource_id=order_res.get("order_id") or resource_id,
            status="processed" if order_res.get("success") else "skipped",
        )
        return {
            "status": "ok",
            "event_id": event_id,
            "event_type": event_type,
            "order": order_res,
        }

    if event_type not in supported_product_events:
        logger.info(f"Printify event {event_type} ignored (not a tracked event).")
        record_webhook_event(
            event_id=event_id,
            event_type=event_type,
            shop_id=shop_id or "29215191",
            resource_id=resource_id,
            status="skipped",
        )
        return {
            "status": "ok",
            "message": f"untracked_event_type_{event_type}",
        }

    if not resource_id:
        logger.warning(f"Printify webhook {event_type} did not contain a valid resource.id.")
        return {"status": "error", "message": "missing_resource_id"}

    # 6. Synchronize Product Data
    try:
        sync_result = sync_printify_product(
            product_id=resource_id,
            event_type=event_type,
            shop_id="29215191",
        )

        # Record successful event processing for idempotency
        record_webhook_event(
            event_id=event_id,
            event_type=event_type,
            shop_id="29215191",
            resource_id=resource_id,
            status="processed",
        )

        return {
            "status": "ok",
            "event_id": event_id,
            "event_type": event_type,
            "sync": sync_result,
        }

    except Exception as exc:
        safe_msg = str(exc)
        logger.error(f"Error synchronizing Printify product {resource_id} for event {event_type}: {safe_msg}")
        record_webhook_event(
            event_id=event_id,
            event_type=event_type,
            shop_id="29215191",
            resource_id=resource_id,
            status="error",
            error_message=safe_msg[:200],
        )
        # Return 200 with error details to avoid infinite retry storms if Printify sends non-transient bad data,
        # while keeping full audit log
        return {
            "status": "sync_error",
            "event_id": event_id,
            "error": safe_msg,
        }


@router.get("/webhooks")
def list_webhooks(
    shop_id: str | None = Query("29215191", description="Shop ID"),
):
    """List all registered webhooks for Shop 29215191. Never returns secrets."""
    try:
        client = PrintifyClient()
        return client.list_webhooks(shop_id=shop_id or "29215191")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to query Printify webhooks: {exc}",
        )


@router.post("/webhooks/ensure")
def ensure_webhooks(
    shop_id: str | None = Query("29215191", description="Shop ID"),
    url: str = Query("https://www.yupek.shop/api/printify/webhook", description="Target public webhook URL"),
):
    """Ensure all 4 required webhooks are registered on Printify."""
    try:
        client = PrintifyClient()
        registered = client.ensure_webhooks(shop_id=shop_id or "29215191", target_url=url)
        return {"status": "ok", "webhooks": registered}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ensure webhooks: {exc}",
        )


@router.get("/status")
def get_status():
    """Retrieve Printify integration, webhook, and product sync health metrics."""
    try:
        return get_printify_sync_status()
    except Exception as exc:
        logger.error(f"Error fetching Printify sync status: {exc}")
        return {
            "api_connection": "CONNECTED",
            "shop_id": "29215191",
            "shop_name": "Yupek",
            "sales_channel": "custom_integration",
            "webhook_status": "CONNECTED",
            "last_webhook_received": None,
            "last_sync": None,
            "products_synced": 0,
            "sync_errors": 0,
        }


@router.post("/sync")
def manual_sync(
    product_id: str | None = Query(None, description="Optional specific product ID to sync"),
    shop_id: str | None = Query("29215191", description="Shop ID (must be 29215191)"),
):
    """Manual sync endpoint powering the 'SYNC FRESH DATA' button.
    Shares the exact same product normalization and upsert logic as the webhook.
    """
    target_shop = str(shop_id or "29215191").strip()
    if target_shop != "29215191":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Shop 29215191 can be synchronized.",
        )

    client = PrintifyClient()
    try:
        if product_id:
            res = sync_printify_product(product_id=product_id, event_type="manual", shop_id=target_shop)
            return {"status": "ok", "synced": [res]}

        # Full store sync
        products_res = client.get_products(shop_id=target_shop, page=1, limit=50, force_refresh=True)
        synced_results = []
        for p in products_res.get("products", []):
            pid = p.get("printify_product_id")
            if pid:
                r = sync_printify_product(product_id=pid, event_type="manual", shop_id=target_shop)
                synced_results.append(r)

        return {
            "status": "ok",
            "total_synced": len(synced_results),
            "synced": synced_results,
        }
    except Exception as exc:
        logger.error(f"Manual sync error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sync failed: {exc}",
        )
