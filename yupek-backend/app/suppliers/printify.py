import hashlib
import hmac
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any
import httpx
from app import config

logger = logging.getLogger("printify")


class PrintifyCache:
    """Lightweight in-memory cache with time-to-live expiration.
    Guaranteed not to store credentials or tokens.
    """

    def __init__(self, default_ttl_seconds: int = 600):  # 10 minutes default
        self.default_ttl = default_ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        if key in self._store:
            timestamp, data = self._store[key]
            if time.time() - timestamp < self.default_ttl:
                return data
            del self._store[key]
        return None

    def set(self, key: str, data: Any, ttl: int | None = None) -> None:
        self._store[key] = (time.time(), data)

    def clear(self) -> None:
        self._store.clear()


# Module-level cache instance (10-minute cache)
_cache = PrintifyCache(default_ttl_seconds=600)


def slugify(text: str) -> str:
    """Generate a clean URL slug from title string."""
    clean = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    return re.sub(r"[\s-]+", "-", clean)


def infer_category(title: str, tags: list[str]) -> str:
    """Infer Yupek category from title and tags."""
    content = f"{title.lower()} {' '.join(t.lower() for t in tags)}"
    if any(k in content for k in ("hoodie", "sweatshirt", "fleece", "crewneck")):
        return "sweatshirts"
    if any(k in content for k in ("woven shirt", "button", "silk-inspired", "dress shirt")):
        return "shirts"
    if any(k in content for k in ("t-shirt", "tee", "tank")):
        return "tees"
    if any(k in content for k in ("trouser", "pant", "chino", "jogger")):
        return "trousers"
    if any(k in content for k in ("denim", "jean")):
        return "denim"
    if any(k in content for k in ("tote", "bag", "cap", "hat", "accessory", "beanie")):
        return "accessories"
    return "tees"


def verify_webhook_signature(
    raw_body: bytes,
    signature_header: str | None,
    secret: str | None = None,
) -> bool:
    """Verify Printify HMAC-SHA256 webhook signature.

    Printify sends:
    Header: X-Pfy-Signature: sha256=<hex_digest> (or <hex_digest>)
    """
    signing_secret = secret or config.PRINTIFY_WEBHOOK_SECRET
    if not signing_secret or not signature_header:
        logger.warning("Webhook verification skipped or failed: missing secret or header.")
        return False

    try:
        expected = hmac.new(
            signing_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()

        candidate = signature_header.strip()
        if candidate.lower().startswith("sha256="):
            candidate = candidate[7:].strip()

        return hmac.compare_digest(expected.lower(), candidate.lower())
    except Exception as exc:
        logger.error(f"Error computing HMAC webhook signature: {exc}")
        return False


def normalize_printify_product(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize raw Printify product into Yupek's internal product schema.

    - Converts variant prices from cents to EUR floats (e.g. 1999 -> 19.99).
    - Preserves mockup image URLs without downloading.
    - Strips internal supplier secrets.
    """
    pid = str(raw.get("id", ""))
    title = (raw.get("title") or "Untitled Product").strip()
    slug = slugify(f"{title}-{pid}")

    # Process variants
    raw_variants = raw.get("variants") or []
    norm_variants: list[dict[str, Any]] = []
    active_prices_eur: list[float] = []

    for v in raw_variants:
        var_id = v.get("id")
        var_title = v.get("title", "")

        # Exclude oversized garments (3XL, 4XL, 5XL)
        upper_title = var_title.upper()
        if any(bad in upper_title for bad in ["3XL", "4XL", "5XL", "XXXL", "XXXXL", "XXXXXL"]):
            continue

        sku = v.get("sku", "")
        price_cents = int(v.get("price") or 0)
        price_eur = round(price_cents / 100.0, 2)
        is_enabled = bool(v.get("is_enabled", True))
        is_available = bool(v.get("is_available", True))

        if is_enabled and is_available and price_eur > 0:
            active_prices_eur.append(price_eur)

        norm_variants.append({
            "variant_id": var_id,
            "title": var_title,
            "sku": sku,
            "price": price_eur,
            "price_cents": price_cents,
            "is_enabled": is_enabled,
            "is_available": is_available,
            "options": v.get("options", []),
        })

    # Base starting price (in EUR)
    if active_prices_eur:
        base_price = min(active_prices_eur)
    elif norm_variants:
        base_price = norm_variants[0]["price"]
    else:
        base_price = 0.0

    # Process images (mockup URLs directly from Printify)
    raw_images = raw.get("images") or []
    norm_images: list[dict[str, Any]] = []
    for idx, img in enumerate(raw_images):
        src = img.get("src", "")
        if src:
            norm_images.append({
                "src": src,
                "position": img.get("position", idx),
                "variant_ids": img.get("variant_ids", []),
                "is_default": bool(img.get("is_default", idx == 0)),
            })

    # Sku of first variant or fallback
    first_sku = norm_variants[0]["sku"] if norm_variants else ""
    available = len(active_prices_eur) > 0 and bool(raw.get("visible", True))

    return {
        "printify_product_id": pid,
        "title": title,
        "slug": slug,
        "description": raw.get("description", ""),
        "tags": raw.get("tags") or [],
        "price": base_price,
        "currency": "EUR",
        "images": norm_images,
        "variants": norm_variants,
        "sku": first_sku,
        "available": available,
        "visible": bool(raw.get("visible", True)),
        # Original metadata
        "blueprint_id": raw.get("blueprint_id"),
        "print_provider_id": raw.get("print_provider_id"),
        "options": raw.get("options") or [],
        "created_at": raw.get("created_at"),
        "updated_at": raw.get("updated_at"),
    }


class PrintifyClient:
    """Printify REST API v1 Client.

    Provides a secure and resilient connection to Printify API (https://api.printify.com/v1/).
    Never logs or exposes the API token or secrets.
    """

    def __init__(
        self,
        api_token: str | None = None,
        base_url: str | None = None,
        timeout: float = 15.0,
    ):
        self.api_token = api_token or config.PRINTIFY_API_TOKEN
        self.base_url = (base_url or config.PRINTIFY_BASE_URL).rstrip("/")
        self.timeout = timeout

    def _get_headers(self) -> dict[str, str]:
        if not self.api_token:
            raise ValueError("PRINTIFY_API_TOKEN is not configured in backend environment.")
        return {
            "Authorization": f"Bearer {self.api_token}",
            "User-Agent": "Yupek/1.0 (https://www.yupek.shop; contact@yupek.shop)",
            "Content-Type": "application/json",
        }

    def _safe_request(
        self,
        method: str,
        url: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
    ) -> Any:
        headers = self._get_headers()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.request(method, url, headers=headers, params=params, json=json_data)
                response.raise_for_status()
                if response.status_code == 204:
                    return {}
                return response.json()
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            try:
                error_body = exc.response.json()
                msg = error_body.get("message") or error_body.get("error") or str(error_body)
            except Exception:
                msg = exc.response.text[:200]

            logger.error(f"Printify API HTTP {status_code} error: {msg}")

            if status_code == 401:
                raise RuntimeError("Printify API 401 Unauthorized: Invalid or expired API token.") from None
            if status_code == 403:
                raise RuntimeError("Printify API 403 Forbidden: Insufficient store permissions.") from None
            if status_code == 404:
                raise RuntimeError("Printify API 404 Not Found: Requested resource does not exist.") from None
            if status_code == 429:
                raise RuntimeError("Printify API 429 Rate Limit: Too many requests. Please retry in a few moments.") from None
            if status_code >= 500:
                raise RuntimeError(f"Printify API {status_code} Server Error. Please try again later.") from None

            raise RuntimeError(f"Printify API error ({status_code}): {msg}") from None

        except httpx.TimeoutException:
            logger.error("Printify API request timed out.")
            raise RuntimeError("Printify API request timed out. Please try again.") from None

        except httpx.RequestError as exc:
            logger.error(f"Printify API network error: {exc.__class__.__name__}")
            raise RuntimeError(f"Unable to connect to Printify API ({exc.__class__.__name__}).") from None

    def get_shops(self, force_refresh: bool = False) -> list[dict[str, Any]]:
        """Fetch all shops connected to the Printify account."""
        cache_key = "shops"
        if not force_refresh:
            cached = _cache.get(cache_key)
            if cached is not None:
                return cached

        url = f"{self.base_url}/shops.json"
        data = self._safe_request("GET", url)

        if not isinstance(data, list):
            raise ValueError(
                f"Unexpected response format from Printify API: expected list, got {type(data).__name__}"
            )

        sanitized_shops: list[dict[str, Any]] = []
        for shop in data:
            if isinstance(shop, dict):
                safe_shop = {
                    k: v
                    for k, v in shop.items()
                    if not any(
                        sensitive in k.lower()
                        for sensitive in ("token", "secret", "auth", "key", "password")
                    )
                }
                sanitized_shops.append(safe_shop)

        _cache.set(cache_key, sanitized_shops)
        return sanitized_shops

    def get_products(
        self,
        shop_id: str | int | None = None,
        page: int = 1,
        limit: int = 50,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        """Fetch paginated products from a Printify shop and return normalized format."""
        target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "").strip()
        if not target_shop:
            raise ValueError("No Printify shop_id provided or configured in PRINTIFY_SHOP_ID.")

        safe_page = max(1, page)
        safe_limit = max(1, min(limit, 50))

        cache_key = f"products_{target_shop}_{safe_page}_{safe_limit}"
        if not force_refresh:
            cached = _cache.get(cache_key)
            if cached is not None:
                return cached

        url = f"{self.base_url}/shops/{target_shop}/products.json"
        params = {"page": safe_page, "limit": safe_limit}

        raw_data = self._safe_request("GET", url, params=params)

        if isinstance(raw_data, dict):
            raw_products = raw_data.get("data") or []
            total = int(raw_data.get("total", len(raw_products)))
            current_page = int(raw_data.get("current_page", safe_page))
            last_page = int(raw_data.get("last_page", 1))
            per_page = int(raw_data.get("per_page", safe_limit))
        elif isinstance(raw_data, list):
            raw_products = raw_data
            total = len(raw_products)
            current_page = safe_page
            last_page = 1
            per_page = safe_limit
        else:
            raise ValueError(f"Unexpected products response type: {type(raw_data).__name__}")

        normalized = [normalize_printify_product(p) for p in raw_products]

        result = {
            "shop_id": target_shop,
            "total": total,
            "current_page": current_page,
            "last_page": last_page,
            "per_page": per_page,
            "products": normalized,
        }

        _cache.set(cache_key, result)
        return result

    def get_product(
        self,
        product_id: str,
        shop_id: str | int | None = None,
        force_refresh: bool = False,
    ) -> dict[str, Any]:
        """Fetch single product details from Printify."""
        target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "").strip()
        if not target_shop:
            raise ValueError("No Printify shop_id provided or configured in PRINTIFY_SHOP_ID.")

        cache_key = f"product_{target_shop}_{product_id}"
        if not force_refresh:
            cached = _cache.get(cache_key)
            if cached is not None:
                return cached

        url = f"{self.base_url}/shops/{target_shop}/products/{product_id}.json"
        raw_product = self._safe_request("GET", url)
        if not isinstance(raw_product, dict):
            raise ValueError(f"Invalid product response type: {type(raw_product).__name__}")

        normalized = normalize_printify_product(raw_product)
        _cache.set(cache_key, normalized)
        return normalized

    def list_webhooks(self, shop_id: str | int | None = None) -> list[dict[str, Any]]:
        """List registered webhooks for the shop. Never exposes webhook secret."""
        target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "29215191").strip()
        url = f"{self.base_url}/shops/{target_shop}/webhooks.json"
        hooks = self._safe_request("GET", url)
        if not isinstance(hooks, list):
            return []

        # Sanitize to never leak secret
        sanitized = []
        for h in hooks:
            if isinstance(h, dict):
                sanitized.append({
                    "id": h.get("id"),
                    "topic": h.get("topic"),
                    "url": h.get("url"),
                    "shop_id": h.get("shop_id"),
                })
        return sanitized

    def create_webhook(
        self,
        topic: str,
        url: str,
        secret: str,
        shop_id: str | int | None = None,
    ) -> dict[str, Any]:
        """Register a new webhook subscription with Printify."""
        target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "29215191").strip()
        endpoint = f"{self.base_url}/shops/{target_shop}/webhooks.json"
        payload = {"topic": topic, "url": url, "secret": secret}
        res = self._safe_request("POST", endpoint, json_data=payload)
        return {
            "id": res.get("id"),
            "topic": res.get("topic"),
            "url": res.get("url"),
            "shop_id": res.get("shop_id"),
        }

    def delete_webhook(self, webhook_id: str, shop_id: str | int | None = None) -> dict[str, Any]:
        """Delete an existing webhook subscription."""
        target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "29215191").strip()
        endpoint = f"{self.base_url}/shops/{target_shop}/webhooks/{webhook_id}.json"
        return self._safe_request("DELETE", endpoint)

    def ensure_webhooks(
        self,
        shop_id: str | int | None = None,
        target_url: str = "https://www.yupek.shop/api/printify/webhook",
    ) -> list[dict[str, Any]]:
        """Ensure all required topics are registered for the target shop. Reuses existing webhooks."""
        target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "29215191").strip()
        required_topics = [
            "product:created",
            "product:updated",
            "product:deleted",
            "product:publish:started",
        ]
        existing = self.list_webhooks(target_shop)
        existing_by_topic = {
            h.get("topic"): h for h in existing if h.get("url") == target_url
        }

        registered = []
        for topic in required_topics:
            if topic in existing_by_topic:
                registered.append(existing_by_topic[topic])
            else:
                new_hook = self.create_webhook(
                    topic=topic,
                    url=target_url,
                    secret=config.PRINTIFY_WEBHOOK_SECRET,
                    shop_id=target_shop,
                )
                registered.append(new_hook)
        return registered


# Idempotency and Sync Persistence
_WORKSPACE_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
_SYNC_EVENTS_FILE = os.path.join(
    _WORKSPACE_ROOT,
    "yupek-web",
    "data",
    "printify-sync-status.json",
)


def _load_sync_metadata() -> dict[str, Any]:
    try:
        if os.path.exists(_SYNC_EVENTS_FILE):
            with open(_SYNC_EVENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "processed_event_ids": [],
        "last_webhook_received": None,
        "last_sync": None,
        "products_synced": 0,
        "sync_errors": 0,
        "events": [],
    }


def _save_sync_metadata(meta: dict[str, Any]) -> None:
    try:
        os.makedirs(os.path.dirname(_SYNC_EVENTS_FILE), exist_ok=True)
        # Keep last 100 events to avoid unbounded file growth
        if len(meta.get("processed_event_ids", [])) > 200:
            meta["processed_event_ids"] = meta["processed_event_ids"][-200:]
        if len(meta.get("events", [])) > 50:
            meta["events"] = meta["events"][-50:]
        with open(_SYNC_EVENTS_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)
    except Exception as exc:
        logger.error(f"Error saving sync metadata: {exc}")


def is_event_processed(event_id: str) -> bool:
    """Check whether a webhook event_id was already processed (Idempotency)."""
    if not event_id:
        return False

    # Check Supabase first if configured
    try:
        from app.db import get_db
        db = get_db()
        res = db.table("webhook_events").select("id").eq("event_id", event_id).limit(1).execute()
        if res.data and len(res.data) > 0:
            return True
    except Exception:
        pass

    # Fallback to persistent metadata store
    meta = _load_sync_metadata()
    return event_id in meta.get("processed_event_ids", [])


def record_webhook_event(
    event_id: str,
    event_type: str,
    shop_id: str,
    resource_id: str | None = None,
    status: str = "processed",
    error_message: str | None = None,
) -> None:
    """Record webhook event in database and sync metadata for idempotency and audit."""
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Supabase record
    try:
        from app.db import get_db
        db = get_db()
        db.table("webhook_events").upsert({
            "event_id": event_id,
            "event_type": event_type,
            "shop_id": str(shop_id),
            "resource_id": str(resource_id or ""),
            "status": status,
            "error_message": error_message,
            "processed_at": now_iso,
        }, on_conflict="event_id").execute()
    except Exception:
        pass

    # 2. Local JSON metadata store
    meta = _load_sync_metadata()
    if event_id and event_id not in meta.get("processed_event_ids", []):
        meta.setdefault("processed_event_ids", []).append(event_id)
    meta["last_webhook_received"] = now_iso
    meta.setdefault("events", []).append({
        "event_id": event_id,
        "event_type": event_type,
        "shop_id": shop_id,
        "resource_id": resource_id,
        "status": status,
        "time": now_iso,
    })
    if status == "error":
        meta["sync_errors"] = meta.get("sync_errors", 0) + 1
    _save_sync_metadata(meta)


def _get_site_config_path() -> str:
    return os.path.join(_WORKSPACE_ROOT, "yupek-web", "data", "site-config.json")


def _read_site_config() -> dict[str, Any]:
    try:
        from app.db import get_db
        db = get_db()
        res = db.table("site_config").select("value").eq("key", "global").execute()
        if res.data and len(res.data) > 0 and isinstance(res.data[0].get("value"), dict):
            return res.data[0]["value"]
    except Exception as exc:
        logger.error(f"Error reading site_config from Supabase: {exc}")

    path = _get_site_config_path()
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as exc:
        logger.error(f"Error reading site-config.json: {exc}")
    return {}


def _write_site_config(cfg: dict[str, Any]) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        from app.db import get_db
        db = get_db()
        db.table("site_config").upsert({
            "key": "global",
            "value": cfg,
            "updated_at": now_iso
        }).execute()
    except Exception as exc:
        logger.error(f"Error writing site_config to Supabase: {exc}")

    path = _get_site_config_path()
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as exc:
        logger.error(f"Error writing site-config.json: {exc}")


def sync_printify_product(
    product_id: str,
    event_type: str = "manual",
    shop_id: str = "29215191",
) -> dict[str, Any]:
    """Shared product synchronization logic.

    Used by:
    - Automatic Webhook Sync (product:created, product:updated, product:deleted, product:publish:started)
    - Manual SYNC FRESH DATA button

    Shop ID validation:
    Only processes events for Shop ID = 29215191.
    Never touches Etsy store (29193770).
    """
    target_shop = str(shop_id or config.PRINTIFY_SHOP_ID or "29215191").strip()
    if target_shop != "29215191":
        logger.info(f"Ignoring Printify sync for shop_id {target_shop} (only 29215191 is synchronized).")
        return {
            "status": "ignored",
            "reason": "shop_mismatch",
            "shop_id": target_shop,
            "product_id": product_id,
        }

    now_iso = datetime.now(timezone.utc).isoformat()
    client = PrintifyClient()

    # Handle PRODUCT DELETED (Soft Delete)
    if event_type == "product:deleted":
        logger.info(f"Soft-deleting Printify product {product_id} (is_active=false / archived).")

        # 1. Update Supabase products table if exists
        try:
            from app.db import get_db
            db = get_db()
            db.table("products").update({
                "status": "archived",
            }).or_(f"supplier_product_id.eq.{product_id},printify_product_id.eq.{product_id}").execute()
        except Exception:
            pass

        # 2. Update site-config.json
        cfg = _read_site_config()
        overrides = cfg.setdefault("productOverrides", {})
        custom_products = cfg.setdefault("customProducts", [])

        # Find matching product in customProducts
        for p in custom_products:
            if str(p.get("supplierProductId")) == str(product_id) or str(p.get("id")) == f"printify-{product_id}":
                slug = p.get("slug")
                if slug:
                    overrides.setdefault(slug, {})["deleted"] = True

        cfg["updatedAt"] = now_iso
        _write_site_config(cfg)

        # Update metadata stats
        meta = _load_sync_metadata()
        meta["last_sync"] = now_iso
        _save_sync_metadata(meta)

        return {
            "status": "archived",
            "action": "soft_deleted",
            "product_id": product_id,
            "shop_id": target_shop,
        }

    # Fetch complete product details from Printify
    raw_normalized = client.get_product(product_id, shop_id=target_shop, force_refresh=True)
    norm_title = raw_normalized["title"]
    norm_slug = raw_normalized["slug"]
    norm_tags = raw_normalized["tags"]
    norm_category = infer_category(norm_title, norm_tags)

    # Extract distinct sizes and colors from options & variants metadata
    raw_options = raw_normalized.get("options") or []
    color_opt = next((o for o in raw_options if o.get("type") == "color" or "color" in o.get("name", "").lower()), None)
    size_opt = next((o for o in raw_options if o.get("type") == "size" or "size" in o.get("name", "").lower()), None)

    color_map: dict[int, str] = {}
    if color_opt and color_opt.get("values"):
        for val in color_opt["values"]:
            color_map[val["id"]] = str(val.get("title", "")).strip()

    size_map: dict[int, str] = {}
    if size_opt and size_opt.get("values"):
        for val in size_opt["values"]:
            size_map[val["id"]] = str(val.get("title", "")).strip()

    norm_variants_list = []
    for v in raw_normalized.get("variants", []):
        variant_options = v.get("options", [])
        size = ""
        color = ""
        for opt_id in variant_options:
            if opt_id in color_map:
                color = color_map[opt_id]
            if opt_id in size_map:
                size = size_map[opt_id]

        if not color or not size:
            title_parts = [p.strip() for p in v.get("title", "").split("/") if p.strip()]
            for p in title_parts:
                if not color and p in color_map.values():
                    color = p
                elif not size and p in size_map.values():
                    size = p

        norm_variants_list.append({
            "variant_id": v.get("id"),
            "title": v.get("title", ""),
            "size": size,
            "color": color,
            "price_cents": int(v.get("price") or 0),
            "is_enabled": bool(v.get("is_enabled", True)),
            "is_available": bool(v.get("is_available", True)),
            "sku": v.get("sku", ""),
            "options": variant_options,
        })

    enabled_variants = [v for v in norm_variants_list if v["is_enabled"] and v["is_available"]]

    if size_opt and size_opt.get("values"):
        present_sizes = {v["size"] for v in enabled_variants if v["size"]}
        distinct_sizes = [str(val["title"]).strip() for val in size_opt["values"] if str(val["title"]).strip() in present_sizes]
    else:
        distinct_sizes = list(dict.fromkeys(v["size"] for v in enabled_variants if v["size"]))
    if not distinct_sizes:
        distinct_sizes = ["S", "M", "L", "XL"]

    if color_opt and color_opt.get("values"):
        present_colors = {v["color"] for v in enabled_variants if v["color"]}
        distinct_colors = [str(val["title"]).strip() for val in color_opt["values"] if str(val["title"]).strip() in present_colors]
    else:
        distinct_colors = list(dict.fromkeys(v["color"] for v in enabled_variants if v["color"]))
    if not distinct_colors:
        distinct_colors = ["White"]

    detailed_images = [
        {
            "src": img["src"],
            "variant_ids": img.get("variant_ids", []),
            "position": img.get("position", "front"),
            "is_default": bool(img.get("is_default", False)),
        }
        for img in raw_normalized.get("images", []) if img.get("src")
    ]
    image_urls = [img["src"] for img in detailed_images]

    # Determine publication status
    # product:publish:started -> 'draft' (awaiting publication review, not immediately public)
    # product:created -> 'draft'
    # product:updated / manual -> preserve existing status if active, otherwise 'draft'
    initial_status = "draft"
    if event_type == "product:publish:started":
        initial_status = "draft"  # Awaiting admin review

    # Build internal Yupek product payload
    yupek_product = {
        "id": f"printify-{product_id}",
        "slug": norm_slug,
        "name": norm_title,
        "descriptor": "",
        "price": raw_normalized["price"],
        "currency": "EUR",
        "category": norm_category,
        "gender": "unisex",
        "sizes": distinct_sizes,
        "colors": distinct_colors,
        "description": raw_normalized.get("description") or "Contemporary garment crafted from premium textiles with Eastern heritage and European tailoring.",
        "material": "100% premium quality fabric tailored for modern living.",
        "images": image_urls,
        "variants": norm_variants_list,
        "featured": False,
        "newArrival": True,
        "badge": "NEW" if event_type == "product:created" else None,
        "tags": norm_tags,
        "supplier": "Printify",
        "supplierProductId": product_id,
        "supplierPrice": raw_normalized["price"],
        "inventory": 50,
        "isDraft": initial_status == "draft",
    }

    # 1. Update Supabase if available
    try:
        from app.db import get_db
        db = get_db()
        db.table("products").upsert({
            "slug": norm_slug,
            "name": norm_title,
            "description": raw_normalized.get("description", ""),
            "category": norm_category,
            "gender": "unisex",
            "tags": norm_tags,
            "status": "draft" if initial_status == "draft" else "active",
            "supplier_product_id": product_id,
            "printify_product_id": product_id,
            "supplier_price_cents": int(raw_normalized["price"] * 100),
        }, on_conflict="supplier_product_id").execute()
    except Exception:
        pass

    # 2. Update site-config.json (stores custom products for Next.js storefront)
    cfg = _read_site_config()
    custom_products: list[dict[str, Any]] = cfg.setdefault("customProducts", [])
    overrides = cfg.setdefault("productOverrides", {})

    # Check if product already exists by supplierProductId or slug
    existing_idx = -1
    for idx, cp in enumerate(custom_products):
        if str(cp.get("supplierProductId")) == str(product_id) or cp.get("slug") == norm_slug:
            existing_idx = idx
            break

    if existing_idx >= 0:
        # Update existing product in place
        existing = custom_products[existing_idx]
        was_deleted = overrides.get(existing.get("slug", ""), {}).get("deleted", False)
        # If product:publish:started or updated, keep or refresh data
        merged = {**existing, **yupek_product}
        custom_products[existing_idx] = merged
        if not was_deleted and norm_slug in overrides:
            overrides[norm_slug]["deleted"] = False
        action = "updated"
    else:
        # Insert new product
        custom_products.append(yupek_product)
        action = "created"

    cfg["updatedAt"] = now_iso
    _write_site_config(cfg)

    # 3. Update sync metadata counters
    meta = _load_sync_metadata()
    meta["last_sync"] = now_iso
    meta["products_synced"] = len([p for p in custom_products if p.get("supplier") == "Printify"])
    _save_sync_metadata(meta)

    logger.info(f"Successfully synchronized Printify product {product_id} ({norm_title}) action={action}.")

    return {
        "status": "success",
        "action": action,
        "product_id": product_id,
        "slug": norm_slug,
        "title": norm_title,
        "category": norm_category,
        "price": raw_normalized["price"],
        "status_code": initial_status,
        "shop_id": target_shop,
    }


def get_printify_sync_status() -> dict[str, Any]:
    """Retrieve full synchronization health and metrics for the Admin Panel."""
    client = PrintifyClient()
    meta = _load_sync_metadata()

    # Check Printify API connection
    api_connected = False
    shops = []
    try:
        shops = client.get_shops()
        api_connected = True
    except Exception:
        pass

    # Check registered webhooks
    webhooks = []
    webhook_status = "NOT CONNECTED"
    try:
        webhooks = client.list_webhooks(shop_id="29215191")
        required_topics = {"product:created", "product:updated", "product:deleted", "product:publish:started"}
        existing_topics = {h.get("topic") for h in webhooks}
        if required_topics.issubset(existing_topics):
            webhook_status = "CONNECTED"
        elif len(existing_topics) > 0:
            webhook_status = "PARTIAL"
    except Exception:
        pass

    return {
        "api_connection": "CONNECTED" if api_connected else "ERROR",
        "shop_id": "29215191",
        "shop_name": "Yupek",
        "sales_channel": "custom_integration",
        "webhook_status": webhook_status,
        "registered_webhooks": webhooks,
        "last_webhook_received": meta.get("last_webhook_received"),
        "last_sync": meta.get("last_sync"),
        "products_synced": meta.get("products_synced", 0),
        "sync_errors": meta.get("sync_errors", 0),
        "recent_events": meta.get("events", [])[-10:],
    }
