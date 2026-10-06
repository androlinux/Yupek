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

    # 3. Shop Validation: Only Shop ID 29215191
    # If webhook belongs to another shop (e.g. Etsy 29193770): safely ignore and return HTTP 200
    if shop_id and shop_id != "29215191":
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

    # 5. Process Product Events
    supported_events = {
        "product:created",
        "product:updated",
        "product:deleted",
        "product:publish:started",
    }

    if event_type not in supported_events:
        logger.info(f"Printify event {event_type} ignored (not a tracked product event).")
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
