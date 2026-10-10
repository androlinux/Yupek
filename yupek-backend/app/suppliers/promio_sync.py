"""Promio Catalog Synchronization Service for YUPEK.

Safely synchronizes custom YUPEK designs configured in Promio (type=Design)
into the YUPEK storefront catalog (site_config.customProducts and Supabase).

SAFETY ARCHITECTURE:
- Feature flag: PROMIO_CATALOG_SYNC_ENABLED (default: False).
- Order submission is strictly DISABLED in all environments.
- Zero orders or fulfillment jobs can ever be triggered here.
- Never log or expose API credentials, signatures, or customer data.
- New products are strictly created as unpublished/draft candidates (isDraft=True)
  requiring explicit admin pricing approval.
- Preserves existing retail prices, product slugs, custom descriptions, and images.
- Stable supplier identifiers (supplier_product_id, variant uid, sku) are strictly enforced;
  never matches by display name alone.
- Idempotent: repeated syncs never create duplicate records.
- Missing supplier products are never automatically deleted from the storefront.
"""

from __future__ import annotations

import copy
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from app import config
from app.suppliers.promio import PromioClient, PromioAPIError, PromioConfigurationError

logger = logging.getLogger("promio_sync")

_WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

# Canonical apparel size sorting order
SIZE_ORDER = [
    "XX-Small",
    "XXS",
    "X-Small",
    "XS",
    "Small",
    "S",
    "Medium",
    "M",
    "Large",
    "L",
    "X-Large",
    "XL",
    "2X-Large",
    "2XL",
    "XXL",
    "3X-Large",
    "3XL",
    "4X-Large",
    "4XL",
    "5X-Large",
    "5XL",
    "One Size",
]


class PromioSyncError(Exception):
    """Base exception for Promio catalog synchronization errors."""


class PromioSyncDisabledError(PromioSyncError):
    """Raised when catalog synchronization is disabled by feature flag."""


class PromioSyncValidationError(PromioSyncError):
    """Raised when a Promio product or variant fails data normalization/validation."""


# ==============================================================================
# HELPER STORAGE PATHS & SITE CONFIG I/O
# ==============================================================================

def _get_site_config_path() -> str:
    """Return absolute path to yupek-web/data/site-config.json."""
    return os.path.join(_WORKSPACE_ROOT, "yupek-web", "data", "site-config.json")


def _get_sync_status_path() -> str:
    """Return absolute path to yupek-web/data/promio-sync-status.json."""
    return os.path.join(_WORKSPACE_ROOT, "yupek-web", "data", "promio-sync-status.json")


def _read_site_config() -> dict[str, Any]:
    """Read site_config from Supabase if accessible, merging with local site-config.json customProducts."""
    cfg: dict[str, Any] = {}
    try:
        from app.db import get_db
        db = get_db()
        res = db.table("site_config").select("value").eq("key", "global").execute()
        if res.data and len(res.data) > 0 and isinstance(res.data[0].get("value"), dict):
            cfg = dict(res.data[0]["value"])
    except Exception as exc:
        logger.debug(f"Could not read site_config from Supabase (using local mirror): {exc}")

    path = _get_site_config_path()
    local_cfg: dict[str, Any] = {}
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                local_cfg = json.load(f)
    except Exception as exc:
        logger.error(f"Error reading local site-config.json: {exc}")

    if not cfg:
        return local_cfg

    # Merge customProducts from local_cfg if missing from Supabase record
    if local_cfg.get("customProducts"):
        existing_ids = {
            str(p.get("supplierProductId") or p.get("id"))
            for p in cfg.get("customProducts", [])
        }
        for lp in local_cfg.get("customProducts", []):
            lid = str(lp.get("supplierProductId") or lp.get("id"))
            if lid not in existing_ids:
                if "customProducts" not in cfg:
                    cfg["customProducts"] = []
                cfg["customProducts"].append(lp)
                existing_ids.add(lid)

    return cfg


def _is_serverless_readonly() -> bool:
    """Return True if running in a serverless environment (e.g. Vercel) with read-only root."""
    return bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))


def _write_site_config(cfg: dict[str, Any]) -> None:
    """Write site_config to Supabase and mirror to local site-config.json."""
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
        logger.debug(f"Notice: Supabase site_config write skipped or unavailable: {exc}")

    # Local filesystem mirror is preserved for local development, but skipped on serverless
    if _is_serverless_readonly():
        logger.debug("Serverless environment detected (VERCEL); local disk mirror skipped, Supabase persistence active.")
        return

    path = _get_site_config_path()
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
    except OSError as exc:
        logger.warning(f"Notice: Local site-config.json write skipped on read-only filesystem ({exc})")
    except Exception as exc:
        logger.error(f"Error writing local site-config.json: {exc}")


def _load_sync_metadata() -> dict[str, Any]:
    """Load Promio catalog sync status metadata."""
    path = _get_sync_status_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "supplier": "Promio",
        "last_sync": None,
        "sync_status": "IDLE",
        "total_synced": 0,
        "active_designs_count": 0,
        "products": [],
        "errors": [],
    }


def _save_sync_metadata(meta: dict[str, Any]) -> None:
    """Save Promio catalog sync status metadata."""
    if _is_serverless_readonly():
        logger.debug("Serverless environment detected (VERCEL); promio-sync-status.json local write skipped.")
        return

    path = _get_sync_status_path()
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)
    except OSError as exc:
        logger.warning(f"Notice: Local promio-sync-status.json write skipped on read-only filesystem ({exc})")
    except Exception as exc:
        logger.error(f"Error writing promio-sync-status.json: {exc}")


def _generate_slug(text: str) -> str:
    """Generate clean URL slug from string."""
    clean = re.sub(r"[^\w\s-]", "", text.lower())
    clean = re.sub(r"[\s_-]+", "-", clean).strip("-")
    return clean or "promio-product"


# ==============================================================================
# PRODUCT NORMALIZATION & VALIDATION
# ==============================================================================

def infer_garment_metadata(raw_title: str, variants: list[dict[str, Any]]) -> dict[str, str]:
    """Infer garment base model, SKU prefix, category, and decoration technique."""
    title_lower = raw_title.lower()

    # Check variant SKU prefixes
    skus = [str(v.get("sku", "")).upper() for v in variants if v.get("sku")]
    first_sku = skus[0] if skus else ""

    # 1. Stanley/Stella Crafter
    if first_sku.startswith("STTU") or "crafter" in title_lower:
        return {
            "base_garment": "Stanley/Stella Crafter 2.0 T-shirt",
            "base_sku_prefix": "STTU170",
            "category": "tees",
            "decoration_method": "DTG Front Side",
        }

    # 2. AWDis Sweatshirt JH030
    if first_sku.startswith("JH030") or "sweatshirt" in title_lower:
        return {
            "base_garment": "AWDis Sweatshirt JH030",
            "base_sku_prefix": "JH030",
            "category": "sweatshirts",
            "decoration_method": "DTG Front Side",
        }

    # 3. AWDis College Hoodie JH001 — Embroidery
    if "borduring" in title_lower or "embroidery" in title_lower:
        return {
            "base_garment": "AWDis College Hoodie JH001 (Embroidery)",
            "base_sku_prefix": "JH001",
            "category": "sweatshirts",
            "decoration_method": "Embroidery Left Chest",
        }

    # 4. AWDis College Hoodie JH001 — DTG
    if first_sku.startswith("JH001") or "hoodie" in title_lower:
        return {
            "base_garment": "AWDis College Hoodie JH001 (DTG)",
            "base_sku_prefix": "JH001",
            "category": "sweatshirts",
            "decoration_method": "DTG Front Side",
        }

    # Fallback
    return {
        "base_garment": raw_title.split()[0] if raw_title else "Promio Garment",
        "base_sku_prefix": first_sku.split("-")[0] if "-" in first_sku else "PROMIO",
        "category": "tees",
        "decoration_method": "DTG Front Side",
    }


def normalize_promio_design_product(
    raw_p: dict[str, Any],
    existing_product: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Normalize and validate a raw Promio design product into YUPEK catalog schema.

    Strict Validations:
    - Must have a valid product ID.
    - Must be type == 'Design'.
    - Must have at least one valid variant with both non-empty UID and SKU.
    - Preserves existing retail price, slug, description, and manual overrides.
    - Sets new products as isDraft=True requiring manual pricing approval.
    """
    if not isinstance(raw_p, dict):
        raise PromioSyncValidationError("Raw product payload must be a dictionary.")

    raw_id = raw_p.get("id") or raw_p.get("product_id")
    if raw_id is None or not str(raw_id).strip():
        raise PromioSyncValidationError("Promio product missing required 'id'.")

    supplier_product_id = str(raw_id).strip()
    product_uid = f"promio-{supplier_product_id}"

    product_type = str(raw_p.get("type", "")).strip()
    if product_type != "Design":
        raise PromioSyncValidationError(
            f"Product {supplier_product_id} is type '{product_type}'. Only 'Design' products can be synchronized."
        )

    raw_title = str(raw_p.get("title", "")).strip()
    if not raw_title:
        raise PromioSyncValidationError(f"Product {supplier_product_id} has empty title.")

    # Design Identifier
    design_name = str(raw_p.get("design") or raw_p.get("designs") or "").strip()
    if not design_name:
        design_name = "Винтажная эмблема YUPEK с восточным орнаментом"

    # Normalize Variants
    raw_variants = raw_p.get("variants") or raw_p.get("all_variants")
    if not isinstance(raw_variants, list) or len(raw_variants) == 0:
        raise PromioSyncValidationError(f"Product {supplier_product_id} contains no variants.")

    normalized_variants: list[dict[str, Any]] = []
    sizes_set: set[str] = set()
    colors_set: set[str] = set()
    supplier_costs: list[float] = []

    for idx, v in enumerate(raw_variants):
        if not isinstance(v, dict):
            continue

        v_uid = str(v.get("uid", "")).strip()
        v_sku = str(v.get("sku", "")).strip()

        # Reject variants missing UID or SKU
        if not v_uid or not v_sku:
            logger.debug(f"Product {supplier_product_id} variant #{idx} skipped: missing UID or SKU.")
            continue

        # Extract size and color from options (dict or list format)
        size = ""
        color = ""
        options_data: dict[str, str] = {}
        raw_opts = v.get("options") or {}

        if isinstance(raw_opts, dict):
            for opt_name, opt_val in raw_opts.items():
                name_str = str(opt_name).strip()
                val_str = str(opt_val).strip()
                if name_str:
                    options_data[name_str] = val_str
                    opt_lower = name_str.lower()
                    if opt_lower in ("maat", "size"):
                        size = val_str
                    elif opt_lower in ("kleur", "color"):
                        color = val_str
        elif isinstance(raw_opts, list):
            for opt in raw_opts:
                if isinstance(opt, dict):
                    opt_name = str(opt.get("name", "")).strip()
                    opt_val = str(opt.get("value", "")).strip()
                    if opt_name:
                        options_data[opt_name] = opt_val
                        opt_lower = opt_name.lower()
                        if opt_lower in ("maat", "size"):
                            size = opt_val
                        elif opt_lower in ("kleur", "color"):
                            color = opt_val

        # Preserve canonical size string from Promio options
        size_clean = size.strip()
        if not size_clean:
            size = "One Size"
        else:
            size = size_clean

        if not color:
            color = "Default"

        sizes_set.add(size)
        colors_set.add(color)

        # Supplier wholesale cost
        cost_val = v.get("price")
        cost_float = 0.0
        try:
            if cost_val is not None:
                cost_float = round(float(cost_val), 2)
        except (ValueError, TypeError):
            cost_float = 0.0

        if cost_float > 0:
            supplier_costs.append(cost_float)

        cost_cents = int(round(cost_float * 100))

        retail_price = None
        if existing_product and existing_product.get("price") is not None:
            try:
                retail_price = float(existing_product["price"])
            except (ValueError, TypeError):
                retail_price = None

        retail_cents = int(round(retail_price * 100)) if retail_price and retail_price > 0 else cost_cents

        normalized_variants.append({
            "variant_id": v_uid,
            "supplier_variant_uid": v_uid,
            "title": f"{color} / {size}",
            "sku": v_sku,
            "size": size,
            "color": color,
            "price_cents": retail_cents,
            "price": retail_price,
            "cost_cents": cost_cents,
            "supplier_cost_eur": cost_float,
            "is_available": True,
            "is_enabled": True,
            "options": options_data,
        })

    if not normalized_variants:
        raise PromioSyncValidationError(
            f"Product {supplier_product_id} has zero valid variants with both UID and SKU."
        )

    # Sort sizes logically
    sorted_sizes = sorted(
        list(sizes_set),
        key=lambda s: SIZE_ORDER.index(s) if s in SIZE_ORDER else 99,
    )
    sorted_colors = sorted(list(colors_set))

    # Base garment and decoration technique
    garment_meta = infer_garment_metadata(raw_title, normalized_variants)

    # Images and Mockups
    mockups = [
        {"title": str(m.get("title", "Mockup")).strip(), "src": str(m.get("src", "")).strip()}
        for m in raw_p.get("mockups", [])
        if isinstance(m, dict) and m.get("src")
    ]
    images = [
        {"title": str(im.get("title", "Image")).strip(), "src": str(im.get("src", "")).strip()}
        for im in raw_p.get("images", [])
        if isinstance(im, dict) and im.get("src")
    ]

    # Prioritize mockups (which display the actual design) as primary storefront images
    mockup_urls = [m["src"] for m in mockups if m.get("src")]
    garment_urls = [im["src"] for im in images if im.get("src")]
    combined_image_urls = mockup_urls + garment_urls

    # Supplier wholesale unit price
    base_supplier_price = min(supplier_costs) if supplier_costs else 5.75

    # Retail Price Resolution:
    # 1. Strictly preserve existing retail price if already defined in the storefront.
    # Confirmed YUPEK Storefront Retail Prices (VAT incl. PROMIO-011):
    # - Stanley/Stella Crafter 2.0 T-shirt (25986528): €24.99
    # - AWDis JH030 Sweatshirt (25986529): €29.99
    # - AWDis JH001 DTG Hoodie (25986530): €36.99
    # - AWDis JH001 Embroidered Hoodie (25986531): €49.99
    CONFIRMED_DESIGN_PRICES = {
        "25986528": 24.99,
        "25986529": 29.99,
        "25986530": 36.99,
        "25986531": 49.99,
    }
    cat = garment_meta["category"]
    base_garment = garment_meta["base_garment"].lower()
    decor = garment_meta["decoration_method"].lower()
    if supplier_product_id in CONFIRMED_DESIGN_PRICES:
        established_category_price = CONFIRMED_DESIGN_PRICES[supplier_product_id]
    elif cat == "tees":
        established_category_price = 24.99
    elif "borduring" in base_garment or "embroidery" in decor:
        established_category_price = 49.99
    elif "hoodie" in base_garment:
        established_category_price = 36.99
    elif cat == "sweatshirts":
        established_category_price = 29.99
    else:
        established_category_price = 24.99

    if existing_product and existing_product.get("price") is not None and existing_product.get("price") > 0:
        final_price = existing_product.get("price")
    else:
        final_price = None

    # PRESERVATION OF EXISTING PRODUCT ATTRIBUTES
    # If the product already exists in YUPEK storefront, preserve its settings!
    if existing_product:
        final_slug = existing_product.get("slug") or _generate_slug(f"yupek-{garment_meta['category']}-{supplier_product_id}")
        final_description = existing_product.get("description") or raw_p.get("description")
        final_images = existing_product.get("images") if existing_product.get("images") else combined_image_urls
        is_draft = existing_product.get("isDraft", False)
        approval_status = "approved" if not is_draft else existing_product.get("approvalStatus", "approved")
    else:
        # NEW CANDIDATE:
        final_slug = _generate_slug(f"yupek-{garment_meta['category']}-{supplier_product_id}")
        final_description = (
            raw_p.get("description")
            or f"Contemporary {garment_meta['base_garment']} featuring the signature YUPEK emblem. "
            "Eastern textile heritage refined with modern European silhouette and precision tailoring."
        )
        final_images = combined_image_urls
        is_draft = True
        approval_status = "pending_pricing_approval"

    return {
        "id": product_uid,
        "name": raw_title,
        "slug": final_slug,
        "price": final_price,
        "suggestedRetailPrice": established_category_price,
        "currency": "EUR",
        "category": garment_meta["category"],
        "gender": "unisex",
        "sizes": sorted_sizes,
        "colors": sorted_colors,
        "description": final_description,
        "images": final_images,
        "mockups": mockups,
        "isDraft": is_draft,
        "approvalStatus": approval_status,
        "weight_points": 100 if garment_meta["category"] == "tees" else 250,
        "pricingNotice": (
            f"Supplier blank price is €{base_supplier_price:.2f}. "
            f"Suggested retail price is €{established_category_price:.2f}. "
            "Retail price requires manual approval before publishing."
        ) if is_draft else None,
        "supplier": "Promio",
        "supplierProductId": supplier_product_id,
        "supplierPrice": base_supplier_price,
        "baseGarment": garment_meta["base_garment"],
        "baseSkuPrefix": garment_meta["base_sku_prefix"],
        "decorationMethod": garment_meta["decoration_method"],
        "design": design_name,
        "variants": normalized_variants,
        "inventory": 50,
        "weight_kg": raw_p.get("weight"),
        "hs_code": raw_p.get("hsCode"),
        "country_of_origin": raw_p.get("countryOfOrigin", "NL"),
    }


# ==============================================================================
# DIFF & IDEMPOTENCY ENGINE
# ==============================================================================

def diff_promio_catalog(
    candidate_products: list[dict[str, Any]],
    current_custom_products: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compare candidate Promio products with current catalog to produce a dry-run diff.

    Matching is strictly based on supplier identifiers (supplierProductId == id).
    NEVER matches by display name alone.
    """
    # Index current Promio products strictly by supplierProductId and id
    existing_by_supplier_id: dict[str, dict[str, Any]] = {}
    for p in current_custom_products:
        if str(p.get("supplier", "")).lower() == "promio" or str(p.get("id", "")).startswith("promio-"):
            supp_id = str(p.get("supplierProductId", "")).strip()
            if supp_id:
                existing_by_supplier_id[supp_id] = p
            elif str(p.get("id", "")).startswith("promio-"):
                clean_id = str(p.get("id")).replace("promio-", "").strip()
                existing_by_supplier_id[clean_id] = p

    new_candidates: list[dict[str, Any]] = []
    updated_candidates: list[dict[str, Any]] = []
    unchanged_candidates: list[dict[str, Any]] = []

    seen_candidate_ids: set[str] = set()

    for cand in candidate_products:
        cand_id = cand["supplierProductId"]
        seen_candidate_ids.add(cand_id)

        if cand_id not in existing_by_supplier_id:
            new_candidates.append(cand)
        else:
            existing = existing_by_supplier_id[cand_id]
            # Check for structural changes: variants count, mockups count, etc.
            cand_variants = len(cand.get("variants", []))
            exist_variants = len(existing.get("variants", []))
            cand_mockups = len(cand.get("mockups", []))
            exist_mockups = len(existing.get("mockups", []))

            exist_variant_uids = {
                str(v.get("variant_id") or v.get("supplier_variant_uid") or v.get("uid", "")).strip()
                for v in existing.get("variants", [])
                if (v.get("variant_id") or v.get("supplier_variant_uid") or v.get("uid"))
            }
            cand_variant_uids = {
                str(v.get("variant_id") or v.get("supplier_variant_uid") or v.get("uid", "")).strip()
                for v in cand.get("variants", [])
                if (v.get("variant_id") or v.get("supplier_variant_uid") or v.get("uid"))
            }
            missing_variant_uids = sorted(list(exist_variant_uids - cand_variant_uids))

            has_changes = (
                cand_variants != exist_variants
                or cand_mockups != exist_mockups
                or cand.get("design") != existing.get("design")
                or len(missing_variant_uids) > 0
            )

            if has_changes:
                updated_candidates.append({
                    "candidate": cand,
                    "existing": existing,
                    "diff_summary": {
                        "variants": f"{exist_variants} -> {cand_variants}",
                        "mockups": f"{exist_mockups} -> {cand_mockups}",
                        "missing_variants_count": len(missing_variant_uids),
                        "missing_variant_uids": missing_variant_uids,
                    }
                })
            else:
                unchanged_candidates.append(cand)

    # Detect missing Promio products (which must be retained and NOT deleted)
    retained_missing: list[dict[str, Any]] = []
    for supp_id, exist_p in existing_by_supplier_id.items():
        if supp_id not in seen_candidate_ids:
            retained_missing.append(exist_p)

    total_missing_variants = sum(
        item["diff_summary"].get("missing_variants_count", 0)
        for item in updated_candidates
    )

    return {
        "new_candidates": new_candidates,
        "updated_candidates": updated_candidates,
        "unchanged_candidates": unchanged_candidates,
        "retained_missing_from_supplier": retained_missing,
        "summary": {
            "new_count": len(new_candidates),
            "updated_count": len(updated_candidates),
            "unchanged_count": len(unchanged_candidates),
            "retained_missing_count": len(retained_missing),
            "missing_variants_count": total_missing_variants,
            "total_candidates": len(candidate_products),
        }
    }


# ==============================================================================
# MAIN CATALOG SYNCHRONIZATION SERVICE
# ==============================================================================

def sync_promio_catalog(
    dry_run: bool = True,
    force_enable: bool = False,
    raw_products: list[dict[str, Any]] | None = None,
    client: PromioClient | None = None,
) -> dict[str, Any]:
    """Execute Promio design catalog synchronization or dry-run preview.

    Parameters:
    - dry_run: If True (default), generates inspection preview without modifying Supabase or JSON.
    - force_enable: Allows bypassing the feature flag check strictly for unit tests.
    - raw_products: Optional pre-fetched product list (used for deterministic unit testing).
    - client: Optional PromioClient instance.

    Guarantees:
    - If PROMIO_CATALOG_SYNC_ENABLED is False and dry_run is False and force_enable is False:
      aborts safely without making any writes.
    - Repeated syncs are strictly idempotent (no duplicates).
    - Preserves existing retail prices, slugs, descriptions, and manual overrides.
    - New products are strictly created as isDraft=True.
    - Missing products are retained in catalog.
    """
    is_sync_enabled = bool(getattr(config, "PROMIO_CATALOG_SYNC_ENABLED", False)) or force_enable

    # 1. Feature Flag Protection
    if not is_sync_enabled and not dry_run:
        logger.info("Promio catalog synchronization is disabled via feature flag (PROMIO_CATALOG_SYNC_ENABLED=false).")
        return {
            "status": "disabled",
            "message": "Promio catalog synchronization is disabled via feature flag (PROMIO_CATALOG_SYNC_ENABLED=false).",
            "dry_run": False,
            "feature_flag_enabled": False,
        }

    now_iso = datetime.now(timezone.utc).isoformat()

    # 2. Fetch Promio type=Design Products
    if raw_products is not None:
        fetched_raw = raw_products
    else:
        active_client = client or PromioClient()
        try:
            fetched_raw = active_client.list_products(product_type="Design")
        except Exception as exc:
            logger.error(f"Failed to fetch design products from Promio API: {exc}")
            raise PromioSyncError(f"Failed to fetch design products from Promio: {exc}") from exc

    if not isinstance(fetched_raw, list):
        raise PromioSyncError("Expected JSON array of products from Promio API.")

    # 3. Load Current Catalog
    current_cfg = _read_site_config()
    current_custom_products: list[dict[str, Any]] = list(current_cfg.get("customProducts", []))
    current_overrides: dict[str, Any] = dict(current_cfg.get("productOverrides", {}))

    # Index existing by supplierProductId for preservation during normalization
    existing_map: dict[str, dict[str, Any]] = {}
    for cp in current_custom_products:
        supp_id = str(cp.get("supplierProductId", "")).strip()
        if supp_id:
            existing_map[supp_id] = cp

    # 4. Normalize & Validate Candidate Products
    normalized_candidates: list[dict[str, Any]] = []
    invalid_candidates: list[dict[str, Any]] = []

    for item in fetched_raw:
        item_id = str(item.get("id", "")) if isinstance(item, dict) else "unknown"
        existing = existing_map.get(item_id)
        try:
            norm = normalize_promio_design_product(item, existing_product=existing)
            normalized_candidates.append(norm)
        except PromioSyncValidationError as val_err:
            logger.warning(f"Candidate product {item_id} validation rejected: {val_err}")
            invalid_candidates.append({
                "product_id": item_id,
                "error": str(val_err),
                "raw_title": item.get("title") if isinstance(item, dict) else None,
            })

    # 5. Calculate Diff
    diff_report = diff_promio_catalog(normalized_candidates, current_custom_products)

    # 6. DRY-RUN RETURN (No Writes)
    if dry_run:
        return {
            "status": "preview",
            "dry_run": True,
            "feature_flag_enabled": is_sync_enabled,
            "timestamp": now_iso,
            "summary": {
                "total_fetched": len(fetched_raw),
                "valid_candidates": len(normalized_candidates),
                "invalid_candidates": len(invalid_candidates),
                "invalid_count": len(invalid_candidates),
                **diff_report["summary"]
            },
            "new_candidates": diff_report["new_candidates"],
            "updated_candidates": diff_report["updated_candidates"],
            "unchanged_candidates": diff_report["unchanged_candidates"],
            "invalid_candidates": invalid_candidates,
            "retained_missing_from_supplier": diff_report["retained_missing_from_supplier"],
        }

    # 7. LIVE WRITE EXECUTION (Feature Flag Must Be Enabled)
    previous_cfg = copy.deepcopy(current_cfg)
    updated_custom_products = list(current_custom_products)
    synced_items_count = 0

    # Apply Updates
    for item in diff_report["updated_candidates"]:
        cand = item["candidate"]
        # Find index in updated_custom_products
        for idx, exist_p in enumerate(updated_custom_products):
            if str(exist_p.get("supplierProductId")) == cand["supplierProductId"]:
                # Merge candidate into existing, strictly preserving retail price and slug
                merged = {
                    **exist_p,
                    **cand,
                    "price": exist_p.get("price"),  # Retain retail price
                    "slug": exist_p.get("slug"),    # Retain slug
                    "description": exist_p.get("description") or cand.get("description"),
                }
                updated_custom_products[idx] = merged
                synced_items_count += 1
                break

    # Apply New Candidates
    for cand in diff_report["new_candidates"]:
        # Prevent any duplicate insertion
        if not any(str(p.get("supplierProductId")) == cand["supplierProductId"] for p in updated_custom_products):
            updated_custom_products.append(cand)
            synced_items_count += 1

    # Update site_config
    current_cfg["customProducts"] = updated_custom_products
    current_cfg["updatedAt"] = now_iso

    try:
        _write_site_config(current_cfg)

        # Upsert into Supabase products table as 'draft'
        try:
            from app.db import get_db
            db = get_db()
            for cand in diff_report["new_candidates"] + [u["candidate"] for u in diff_report["updated_candidates"]]:
                db.table("products").upsert({
                    "slug": cand["slug"],
                    "name": cand["name"],
                    "description": cand["description"],
                    "category": cand["category"],
                    "gender": cand["gender"],
                    "status": "draft",
                    "supplier_product_id": cand["supplierProductId"],
                    "supplier_price_cents": int(cand["supplierPrice"] * 100),
                }, on_conflict="supplier_product_id").execute()
        except RuntimeError as rt_exc:
            # Raised if database is unconfigured (offline development or unit testing)
            logger.debug(f"Notice: Supabase products table upsert skipped because database is unconfigured: {rt_exc}")
        except Exception as db_exc:
            err_str = str(db_exc)
            if "PGRST205" in err_str or "Could not find the table 'public.products'" in err_str:
                logger.warning("Notice: Supabase 'products' table not found in schema cache (unmigrated); relational mirror skipped.")
            else:
                logger.error(f"Relational products upsert failed: {db_exc}. Executing compensating rollback on site_config.")
                try:
                    _write_site_config(previous_cfg)
                    logger.info("Successfully executed compensating rollback on site_config.")
                except Exception as rollback_exc:
                    logger.critical(f"Compensating rollback failed: {rollback_exc}")
                raise PromioSyncError(f"Database upsert failed during live sync; site_config changes were rolled back: {db_exc}") from db_exc
    except PromioSyncError:
        raise
    except Exception as exc:
        logger.error(f"Failed to persist catalog synchronization writes: {exc}")
        raise PromioSyncError(f"Failed to persist catalog synchronization writes: {exc}") from exc

    # Save Sync Metadata
    meta = _load_sync_metadata()
    meta["last_sync"] = now_iso
    meta["sync_status"] = "SUCCESS"
    meta["total_synced"] = len([p for p in updated_custom_products if str(p.get("supplier", "")).lower() == "promio"])
    meta["active_designs_count"] = len(normalized_candidates)
    meta["missing_variants_count"] = diff_report["summary"].get("missing_variants_count", 0)
    meta["retained_missing_count"] = diff_report["summary"].get("retained_missing_count", 0)
    meta["products"] = [
        {
            "id": p["id"],
            "supplier_product_id": p.get("supplierProductId"),
            "name": p["name"],
            "category": p["category"],
            "variants_count": len(p.get("variants", [])),
            "is_draft": p.get("isDraft", True),
        }
        for p in updated_custom_products
        if str(p.get("supplier", "")).lower() == "promio"
    ]
    _save_sync_metadata(meta)

    logger.info(
        f"Promio catalog synchronization complete: {len(diff_report['new_candidates'])} new, "
        f"{len(diff_report['updated_candidates'])} updated, {len(diff_report['unchanged_candidates'])} unchanged, "
        f"{diff_report['summary'].get('missing_variants_count', 0)} missing variants, "
        f"{len(invalid_candidates)} errors."
    )

    return {
        "status": "success",
        "dry_run": False,
        "timestamp": now_iso,
        "summary": {
            "synced_count": synced_items_count,
            "new_count": len(diff_report["new_candidates"]),
            "updated_count": len(diff_report["updated_candidates"]),
            "unchanged_count": len(diff_report["unchanged_candidates"]),
            "missing_variants_count": diff_report["summary"].get("missing_variants_count", 0),
            "retained_missing_count": diff_report["summary"].get("retained_missing_count", 0),
            "invalid_count": len(invalid_candidates),
        },
    }


def get_promio_sync_status() -> dict[str, Any]:
    """Retrieve full synchronization health and status metrics."""
    meta = _load_sync_metadata()
    is_sync_enabled = bool(getattr(config, "PROMIO_CATALOG_SYNC_ENABLED", False))
    has_credentials = bool(getattr(config, "PROMIO_APP_ID", None) and getattr(config, "PROMIO_SECRET_KEY", None))

    return {
        "feature_flag_enabled": is_sync_enabled,
        "credentials_configured": has_credentials,
        "supplier_order_submission_enabled": False,  # Hardcoded locked
        "supplier": "Promio (Breda, NL)",
        "last_sync": meta.get("last_sync"),
        "sync_status": meta.get("sync_status", "IDLE"),
        "total_promio_products_in_catalog": meta.get("total_synced", 0),
        "active_designs_count": meta.get("active_designs_count", 0),
        "missing_variants_count": meta.get("missing_variants_count", 0),
        "products": meta.get("products", []),
    }
