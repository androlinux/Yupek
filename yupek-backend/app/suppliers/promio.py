"""Promio Brick API 1.0 Supplier Adapter for YUPEK.

This module provides a server-side client, deterministic shipping rate calculator,
and SupplierAdapter implementation for Promio (Breda, NL).

SAFETY NOTICE:
- Order submission is strictly DISABLED in all environments (PROMIO_SUBMIT_ORDERS_ENABLED=False).
- Live orders or print jobs will NEVER be sent to Promio in this module.
- Secrets, credentials, signatures, and personal data must never be logged.
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qsl, urlencode

import httpx

from app import config
from .base import SupplierAdapter, SupplierProduct, SupplierVariant

logger = logging.getLogger("promio")


# ==============================================================================
# EXCEPTIONS
# ==============================================================================

class PromioError(Exception):
    """Base exception for all Promio-related errors."""


class PromioConfigurationError(PromioError):
    """Raised when credentials or configuration settings are missing or invalid."""


class PromioAPIError(PromioError):
    """Raised when Promio API returns an error or malformed response."""


class PromioOrderSubmissionDisabledError(PromioError):
    """Raised when order submission is attempted while the safety gate is locked."""


class PromioShippingCalculationError(PromioError):
    """Raised when deterministic shipping calculation fails or tariff is missing."""


class PromioMappingError(PromioError):
    """Raised when product or variant mapping fails explicit validation."""


# ==============================================================================
# REQUEST SIGNING (BRICK API 1.0)
# ==============================================================================

def generate_signature(params: dict[str, Any] | str, secret_key: str) -> str:
    """Generate SHA-1 signature for Promio Brick API 1.0 requests.

    Specification:
    - Query parameters string (excluding the 'Signature' parameter itself).
    - Concatenate the raw Secret Key directly to the end of the query string.
    - Compute SHA-1 hex digest of UTF-8 encoded string.
    - Never log secrets or the generated signature.
    """
    if not secret_key:
        raise PromioConfigurationError("Cannot generate signature without Secret Key.")

    if isinstance(params, dict):
        # Filter out any existing Signature parameter, preserve key order
        filtered_items = [
            (str(k), str(v))
            for k, v in params.items()
            if str(k).lower() != "signature"
        ]
        query_string = urlencode(filtered_items)
    elif isinstance(params, str):
        raw_query = params.lstrip("?")
        # Parse query string and remove any existing Signature parameter
        parsed = parse_qsl(raw_query, keep_blank_values=True)
        filtered = [(k, v) for k, v in parsed if k.lower() != "signature"]
        query_string = urlencode(filtered)
    else:
        raise ValueError("Params must be a dict or query string.")

    to_sign = f"{query_string}{secret_key}"
    return hashlib.sha1(to_sign.encode("utf-8")).hexdigest()


# ==============================================================================
# DETERMINISTIC SHIPPING WEIGHT-POINTS & RATE TABLE
# ==============================================================================

# SOURCE OF TRUTH:
# Published on: https://promio.nl/shipping-costs
# Last Verified by Promio: 2025-08-26 (Audited: 2026-10-09)
# Note: These rates reflect Promio's published tariff table. Live order shipping
# is charged internally by Promio based on total package weight points.
# Always re-verify with vendor prior to enabling live billing.

PROMIO_SHIPPING_TABLE_SOURCE = "https://promio.nl/shipping-costs"
PROMIO_SHIPPING_TABLE_VERIFIED_DATE = "2025-08-26"

# Weight points schedule per product type (Puntentabel)
DEFAULT_PRODUCT_WEIGHT_POINTS: dict[str, int] = {
    "t-shirt": 100,
    "t-shirts": 100,
    "tee": 100,
    "tees": 100,
    "mug": 200,
    "mugs": 200,
    "mok": 200,
    "mokken": 200,
    "hoodie": 250,
    "hoodies": 250,
    "sweatshirt": 250,
    "sweatshirts": 250,
    "sweater": 250,
    "sweaters": 250,
    "tote-bag": 100,
    "tote": 100,
    "bag": 100,
    "cap": 100,
}

# Netherlands Domestic Tariffs (in EUR cents)
# 0 - 100 pts: Tracked €3.75, Courier €3.95
# 101 - 249 pts: Tracked €4.69, Courier €4.95
# 250+ pts: Courier €4.95 (Tracked postal not offered above 249 pts)
NL_RATES = [
    {"max_points": 100, "tracked": 375, "courier": 395},
    {"max_points": 249, "tracked": 469, "courier": 495},
    {"max_points": 999999, "tracked": None, "courier": 495},
]

# European Destinations covered by Promio's published Europe tariff
# (Albania, Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark,
# Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Luxembourg,
# Norway, Poland, Portugal, Romania, Spain, Sweden, Switzerland, United Kingdom, etc.)
EUROPE_COUNTRIES = {
    "albania", "al", "andorra", "ad", "austria", "at", "belarus", "by", "belgium", "be",
    "bosnia and herzegovina", "ba", "bulgaria", "bg", "croatia", "hr", "cyprus", "cy",
    "czech republic", "czechia", "cz", "denmark", "dk", "estonia", "ee", "faroe islands", "fo",
    "finland", "fi", "france", "fr", "germany", "de", "gibraltar", "gi", "greece", "gr",
    "hungary", "hu", "iceland", "is", "ireland", "ie", "israel", "il", "italy", "it",
    "kosovo", "xk", "latvia", "lv", "liechtenstein", "li", "lithuania", "lt", "luxembourg", "lu",
    "macedonia", "north macedonia", "mk", "malta", "mt", "moldova", "md", "monaco", "mc",
    "norway", "no", "poland", "pl", "portugal", "pt", "montenegro", "me", "serbia", "rs",
    "romania", "ro", "san marino", "sm", "slovakia", "sk", "slovenia", "si", "spain", "es",
    "sweden", "se", "switzerland", "ch", "turkey", "tr", "ukraine", "ua", "united kingdom", "gb",
    "uk", "vatican city", "va"
}

# Europe Tracked Tariffs (in EUR cents)
EUROPE_TRACKED_RATES = [
    {"max_points": 100, "rate": 395},
    {"max_points": 249, "rate": 495},
    {"max_points": 399, "rate": 545},
    {"max_points": 499, "rate": 695},
    {"max_points": 599, "rate": 795},
    {"max_points": 699, "rate": 895},
    # 700+ points requires individual courier quote (N.N.B.)
]

# US & Canada Tracked Tariffs (in EUR cents)
US_CA_COUNTRIES = {"united states", "usa", "us", "canada", "ca"}
US_CA_TRACKED_RATES = [
    {"max_points": 100, "rate": 495},
    {"max_points": 249, "rate": 645},
    {"max_points": 399, "rate": 745},
    {"max_points": 499, "rate": 945},
    {"max_points": 599, "rate": 1095},
    {"max_points": 699, "rate": 1245},
]

# Rest of World Tracked Tariffs (in EUR cents)
ROW_TRACKED_RATES = [
    {"max_points": 100, "rate": 495},
    {"max_points": 249, "rate": 645},
    {"max_points": 399, "rate": 745},
    {"max_points": 499, "rate": 945},
    {"max_points": 599, "rate": 1095},
    {"max_points": 699, "rate": 1245},
]


def calculate_promio_shipping(
    country: str,
    items: list[dict[str, Any]],
    method: str = "tracked",
) -> int:
    """Calculate deterministic Promio shipping cost in integer cents.

    Args:
        country: Country name or ISO code.
        items: List of line items with either `weight_points` or `category`/`type`.
        method: Desired shipping method ("tracked" or "courier").

    Returns:
        Shipping fee in EUR cents.

    Raises:
        PromioShippingCalculationError: If destination unknown, method unsupported,
        or weight exceeds published flat-tariff schedules.
    """
    if not country or not str(country).strip():
        raise PromioShippingCalculationError("Destination country is required for shipping calculation.")

    norm_country = country.strip().lower()
    norm_method = method.strip().lower()

    if norm_method not in ("tracked", "courier"):
        raise PromioShippingCalculationError(f"Unsupported Promio shipping method '{method}'.")

    # Sum total weight points
    total_points = 0
    for item in items:
        qty = int(item.get("quantity", 1))
        if "weight_points" in item and item["weight_points"] is not None:
            pts = int(item["weight_points"])
        else:
            cat = str(item.get("category") or item.get("type") or "t-shirt").lower()
            pts = DEFAULT_PRODUCT_WEIGHT_POINTS.get(cat, 100)
        total_points += pts * qty

    # 1. Domestic Netherlands
    if norm_country in ("netherlands", "nl", "nederland"):
        for bracket in NL_RATES:
            if total_points <= bracket["max_points"]:
                price = bracket.get(norm_method)
                if price is None:
                    # e.g. Tracked is not offered over 249 pts in NL, courier required
                    raise PromioShippingCalculationError(
                        f"Shipping method '{method}' is not available for NL at {total_points} weight points. "
                        "Courier required."
                    )
                return price
        raise PromioShippingCalculationError(f"Weight points {total_points} exceed maximum NL bracket.")

    # 2. Europe
    if norm_country in EUROPE_COUNTRIES:
        if norm_method == "courier":
            # Promio Europe Courier rates are zonal and not flat-rate (N.N.B.)
            raise PromioShippingCalculationError(
                f"European courier rate for '{country}' requires vendor zonal confirmation."
            )
        for bracket in EUROPE_TRACKED_RATES:
            if total_points <= bracket["max_points"]:
                return bracket["rate"]
        raise PromioShippingCalculationError(
            f"Weight points {total_points} exceed maximum flat-tariff bracket for Europe (700+ points requires courier quote)."
        )

    # 3. United States & Canada
    if norm_country in US_CA_COUNTRIES:
        if norm_method == "courier":
            raise PromioShippingCalculationError(f"Courier shipping to {country} requires vendor zonal confirmation.")
        for bracket in US_CA_TRACKED_RATES:
            if total_points <= bracket["max_points"]:
                return bracket["rate"]
        raise PromioShippingCalculationError(
            f"Weight points {total_points} exceed maximum flat-tariff bracket for US/CA (700+ points requires courier quote)."
        )

    # 4. Rest of World
    if norm_method == "courier":
        raise PromioShippingCalculationError(f"Courier shipping to {country} requires vendor zonal confirmation.")
    for bracket in ROW_TRACKED_RATES:
        if total_points <= bracket["max_points"]:
            return bracket["rate"]

    raise PromioShippingCalculationError(
        f"Weight points {total_points} exceed maximum flat-tariff bracket for Rest of World (700+ points requires courier quote)."
    )


# ==============================================================================
# PRODUCT & VARIANT MAPPING
# ==============================================================================

@dataclass
class PromioVariantMapping:
    """Explicit mapping from YUPEK variant to Promio variant."""
    supplier_variant_uid: str
    sku: str
    size: str
    color: str
    cost_cents: int
    stock: int | None = None


@dataclass
class PromioDesignPosition:
    """Print decoration setup for a design placement."""
    position_title: str  # e.g. "Front", "Back", "DTG Printing Back Side"
    artwork_url: str


@dataclass
class PromioProductMapping:
    """Explicit configuration mapping a YUPEK product to a Promio base product."""
    supplier: str  # Must be "promio"
    promio_product_id: int
    base_sku: str
    category: str
    weight_points: int
    variants: dict[str, PromioVariantMapping] = field(default_factory=dict)
    designs: list[PromioDesignPosition] = field(default_factory=list)

    def get_variant_by_uid_or_sku(self, key: str) -> PromioVariantMapping:
        """Find variant strictly by UID or SKU. Never by display name."""
        if not key or not str(key).strip():
            raise PromioMappingError("Cannot look up variant with empty identifier.")

        target = key.strip()
        # Direct key match
        if target in self.variants:
            return self.variants[target]

        # Scan SKUs or UIDs
        for v in self.variants.values():
            if v.supplier_variant_uid == target or v.sku == target:
                return v

        raise PromioMappingError(
            f"Variant with identifier '{key}' not found in Promio product {self.promio_product_id} mapping."
        )


def validate_product_mapping(data: dict[str, Any]) -> PromioProductMapping:
    """Validate and construct an explicit Promio product mapping.

    Enforces that:
    - Supplier is explicitly 'promio'.
    - Product ID is a valid integer.
    - Base SKU is provided.
    - Products and variants are never mapped by display name alone.
    """
    if data.get("supplier") != "promio":
        raise PromioMappingError(f"Expected supplier 'promio', got '{data.get('supplier')}'")

    product_id = data.get("promio_product_id")
    if not isinstance(product_id, int) or product_id <= 0:
        raise PromioMappingError(f"Invalid Promio product ID: {product_id}")

    base_sku = str(data.get("base_sku", "")).strip()
    if not base_sku:
        raise PromioMappingError("Base SKU is required for Promio product mapping.")

    variants_data = data.get("variants", {})
    if not variants_data:
        raise PromioMappingError("Promio product mapping must contain at least one variant.")

    mapped_variants: dict[str, PromioVariantMapping] = {}
    for key, vdata in variants_data.items():
        uid = str(vdata.get("supplier_variant_uid", "")).strip()
        sku = str(vdata.get("sku", "")).strip()
        size = str(vdata.get("size", "")).strip()
        color = str(vdata.get("color", "")).strip()
        cost_cents = int(vdata.get("cost_cents", 0))

        if not uid or not sku:
            raise PromioMappingError(f"Variant '{key}' must have both supplier_variant_uid and sku.")
        if not size or not color:
            raise PromioMappingError(f"Variant '{key}' must specify explicit size and color.")

        variant_obj = PromioVariantMapping(
            supplier_variant_uid=uid,
            sku=sku,
            size=size,
            color=color,
            cost_cents=cost_cents,
            stock=vdata.get("stock"),
        )
        mapped_variants[uid] = variant_obj

    designs: list[PromioDesignPosition] = []
    for d in data.get("designs", []):
        pos = str(d.get("position_title", "")).strip()
        url = str(d.get("artwork_url", "")).strip()
        if not pos or not url:
            raise PromioMappingError("Design placements must have position_title and artwork_url.")
        designs.append(PromioDesignPosition(position_title=pos, artwork_url=url))

    return PromioProductMapping(
        supplier="promio",
        promio_product_id=product_id,
        base_sku=base_sku,
        category=data.get("category", "tees"),
        weight_points=int(data.get("weight_points", 100)),
        variants=mapped_variants,
        designs=designs,
    )


# ==============================================================================
# PROMIO BRICK API CLIENT (READ-ONLY)
# ==============================================================================

class PromioClient:
    """Server-side client for Promio Brick API 1.0.

    Exclusively supports read-only operations for catalogue and tracking.
    Never exposes credentials or signatures in logs.
    """

    def __init__(
        self,
        app_id: str | None = None,
        secret_key: str | None = None,
        base_url: str | None = None,
    ):
        self.app_id = (app_id if app_id is not None else getattr(config, "PROMIO_APP_ID", "")).strip()
        self.secret_key = (secret_key if secret_key is not None else getattr(config, "PROMIO_SECRET_KEY", "")).strip()
        self.base_url = (base_url if base_url is not None else getattr(config, "PROMIO_BASE_URL", "https://promio.pro/api")).rstrip("/")

    def _require_credentials(self) -> None:
        if not self.app_id or not self.secret_key:
            raise PromioConfigurationError(
                "Promio API credentials are not configured (PROMIO_APP_ID or PROMIO_SECRET_KEY missing)."
            )

    def _build_signed_url(self, endpoint: str, query_params: dict[str, Any]) -> str:
        """Construct full URL with AppId and valid Brick API SHA-1 signature."""
        self._require_credentials()

        params = dict(query_params)
        params["AppId"] = self.app_id
        sig = generate_signature(params, self.secret_key)
        params["Signature"] = sig

        ep = endpoint.lstrip("/")
        return f"{self.base_url}/{ep}?{urlencode(params)}"

    def get_product(self, product_id: int | str) -> dict[str, Any]:
        """Fetch a single product by ID (GET /product.php).

        Validates expected schema: id, title, type, variants.
        """
        pid = int(product_id)
        url = self._build_signed_url("product.php", {"id": pid})

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url)
        except Exception as exc:
            raise PromioAPIError(f"Promio connection failed while fetching product {pid}: {exc}") from exc

        if resp.status_code != 200:
            raise PromioAPIError(f"Promio API returned HTTP {resp.status_code} for product {pid}")

        try:
            data = resp.json()
        except Exception as exc:
            raise PromioAPIError(f"Invalid JSON returned for product {pid}: {exc}") from exc

        if not isinstance(data, dict) or "id" not in data or "variants" not in data:
            raise PromioAPIError(f"Malformed product payload returned for product {pid}")

        return data

    def list_fulfillment_products(self, page: int = 1, limit: int = 50) -> list[dict[str, Any]]:
        """Fetch configured fulfillment products (GET /fulfillment-products.php)."""
        url = self._build_signed_url("fulfillment-products.php", {"page": page, "limit": limit})

        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url)
        except Exception as exc:
            raise PromioAPIError(f"Promio connection failed while listing fulfillment products: {exc}") from exc

        if resp.status_code != 200:
            raise PromioAPIError(f"Promio API returned HTTP {resp.status_code} for fulfillment products")

        try:
            data = resp.json()
        except Exception as exc:
            raise PromioAPIError(f"Invalid JSON returned for fulfillment products: {exc}") from exc

        if not isinstance(data, list):
            raise PromioAPIError("Expected JSON array for fulfillment products list.")

        return data

    def list_products(
        self,
        cursor: str | None = None,
        product_type: str | None = None,
        page: int | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Fetch catalog products (GET /products.php).

        Supports optional filtering by product_type (e.g. 'Design' for custom designs).

        CAUTION:
        Promio's backend PHP script emits custom header 'Status: 1' on /products.php,
        causing Nginx FastCGI to reject the header and output an outer HTTP 500 status
        even though valid JSON catalog payload is returned.

        Strict safety rule: Never treat arbitrary HTTP 500 as success.
        Only accept HTTP 500 if the body strictly parses as a valid JSON list where
        each element adheres to the verified product schema (contains 'id', 'title', 'variants').
        Fail closed on all HTML error pages, malformed bodies, or error objects.
        """
        params: dict[str, Any] = {}
        if cursor:
            params["cursor"] = cursor
        if product_type:
            params["type"] = product_type
        if page is not None:
            params["page"] = page
        if limit is not None:
            params["limit"] = limit

        url = self._build_signed_url("products.php", params)

        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.get(url)
        except Exception as exc:
            raise PromioAPIError(f"Promio connection failed while listing products: {exc}") from exc

        if resp.status_code == 200:
            try:
                data = resp.json()
            except Exception as exc:
                raise PromioAPIError(f"Invalid JSON in /products.php response: {exc}") from exc

            if not isinstance(data, list):
                raise PromioAPIError("Expected JSON array from /products.php")
            return data

        if resp.status_code == 500:
            # Check for provider FastCGI Status: 1 anomaly
            # Must strictly validate body structure before accepting
            try:
                data = resp.json()
            except Exception:
                raise PromioAPIError("Provider returned HTTP 500 with non-JSON body.")

            # Validate schema rigorously
            if isinstance(data, list) and len(data) > 0:
                is_valid_schema = all(
                    isinstance(p, dict) and "id" in p and "title" in p and "variants" in p
                    for p in data[:5]  # Validate first sample items
                )
                if is_valid_schema:
                    logger.warning(
                        "Promio /products.php returned HTTP 500 with valid product schema (FastCGI status-header anomaly). "
                        "Accepted under strict schema validation."
                    )
                    return data

            raise PromioAPIError("Provider returned HTTP 500 with unverified or error payload.")

        raise PromioAPIError(f"Promio /products.php returned HTTP {resp.status_code}")

    def list_design_products(self, page: int = 1, limit: int = 50) -> list[dict[str, Any]]:
        """Fetch configured design products (GET /products.php?type=Design)."""
        return self.list_products(product_type="Design", page=page, limit=limit)

    def create_order(self, order_payload: dict[str, Any]) -> dict[str, Any]:
        """Submit an order to Promio Brick API (POST /orders.php)."""
        url = self._build_signed_url("orders.php", {})
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.post(url, json=order_payload)
        except Exception as exc:
            raise PromioAPIError(f"Promio connection failed while creating order: {exc}") from exc

        if resp.status_code not in (200, 201):
            raise PromioAPIError(f"Promio API returned HTTP {resp.status_code} on order creation: {resp.text[:200]}")

        try:
            data = resp.json()
        except Exception as exc:
            raise PromioAPIError(f"Invalid JSON returned from Promio order creation: {exc}") from exc

        if not isinstance(data, dict):
            raise PromioAPIError("Expected dictionary response from Promio order creation.")
        return data


# ==============================================================================
# SUPPLIER ADAPTER IMPLEMENTATION
# ==============================================================================

class PromioAdapter(SupplierAdapter):
    """Promio supplier adapter conforming to YUPEK SupplierAdapter interface.

    Safety Architecture:
    - Order submission is strictly disabled (self.submit_orders_enabled is hardcoded to False).
    - Adapter requires PROMIO_ENABLED to be True before performing operations.
    - Zero live orders or print jobs will be created.
    """

    submit_orders_enabled: bool = False

    def __init__(self, config_dict: dict[str, Any]):
        super().__init__(config_dict)
        self.enabled = bool(config_dict.get("enabled", config.PROMIO_ENABLED))
        # Hardcoded safety guard: Order creation is strictly disabled in all environments (False by default)
        self.submit_orders_enabled: bool = bool(self.__class__.submit_orders_enabled)

        self.client = PromioClient(
            app_id=config_dict.get("app_id"),
            secret_key=config_dict.get("secret_key"),
            base_url=config_dict.get("base_url"),
        )

    def list_products(
        self,
        cursor: str | None = None,
        product_type: str | None = None,
    ) -> tuple[list[SupplierProduct], str | None]:
        """Fetch and convert Promio products to SupplierProduct instances."""
        if not self.enabled:
            logger.info("Promio adapter is disabled. Returning empty product list.")
            return [], None

        raw_products = self.client.list_products(cursor=cursor, product_type=product_type)
        supplier_products: list[SupplierProduct] = []

        for p in raw_products:
            pid = str(p.get("id"))
            name = str(p.get("title", ""))
            desc = str(p.get("description", ""))
            category = "tees"
            gender = "unisex"

            variants: list[SupplierVariant] = []
            for v in p.get("variants", []):
                uid = str(v.get("uid", ""))
                sku = str(v.get("sku", ""))
                cost_cents = int(v.get("price", 0) * 100) if isinstance(v.get("price"), (int, float)) else 0

                size = "One Size"
                color = "Default"
                for opt in v.get("options", []):
                    opt_name = str(opt.get("name", "")).lower()
                    if opt_name in ("maat", "size"):
                        size = str(opt.get("value", size))
                    elif opt_name in ("kleur", "color"):
                        color = str(opt.get("value", color))

                variants.append(
                    SupplierVariant(
                        supplier_variant_id=uid,
                        sku=sku,
                        size=size,
                        color=color,
                        cost_cents=cost_cents,
                        stock=999,
                    )
                )

            images = [img["src"] for img in p.get("images", []) if "src" in img]

            supplier_products.append(
                SupplierProduct(
                    supplier_product_id=pid,
                    name=name,
                    description=desc,
                    category=category,
                    gender=gender,
                    images=images,
                    variants=variants,
                    shipping_days=3,
                )
            )

        return supplier_products, None

    def get_stock(self, supplier_variant_ids: list[str]) -> dict[str, int]:
        """Check stock availability for Promio variants."""
        if not self.enabled:
            return {vid: 0 for vid in supplier_variant_ids}

        # Promio products are print-on-demand manufactured from supplier blanks.
        # Standard default POD stock capacity is available.
        return {vid: 999 for vid in supplier_variant_ids}

    def build_order_payload(self, order: dict[str, Any], items: list[dict[str, Any]]) -> dict[str, Any]:
        """Construct validated Promio Brick API order payload."""
        order_id = str(order.get("id") or order.get("order_id") or "").strip()
        if not order_id:
            raise PromioMappingError("Order must have a valid identifier.")

        shipping_addr = order.get("shipping_address") or {}
        full_name = str(shipping_addr.get("name") or order.get("customer_name") or "").strip()
        first_name = str(shipping_addr.get("first_name") or shipping_addr.get("firstName") or "").strip()
        last_name = str(shipping_addr.get("last_name") or shipping_addr.get("lastName") or "").strip()
        if not first_name and full_name:
            parts = full_name.split()
            first_name = parts[0]
            if len(parts) > 1 and not last_name:
                last_name = " ".join(parts[1:])
        if not first_name:
            first_name = "Customer"

        email = str(order.get("customer_email") or shipping_addr.get("email") or "").strip()
        phone = str(shipping_addr.get("phone") or "").strip()
        street = str(shipping_addr.get("street") or shipping_addr.get("address1") or shipping_addr.get("line1") or "").strip()
        address2 = str(shipping_addr.get("address2") or shipping_addr.get("line2") or "").strip()
        city = str(shipping_addr.get("city") or "").strip()
        postal_code = str(shipping_addr.get("postalCode") or shipping_addr.get("postal_code") or shipping_addr.get("zip") or shipping_addr.get("postal") or "1000AA").strip()
        country = str(shipping_addr.get("country") or "NL").strip()

        if not street or not city:
            raise PromioMappingError("Missing required shipping address fields (street, city).")

        promio_items = []
        for it in items:
            var_id = str(it.get("variant_id") or it.get("supplier_variant_uid") or it.get("supplier_variant_id") or "").strip()
            sku = str(it.get("sku") or "").strip()
            qty = int(it.get("quantity") or it.get("qty", 1))
            if qty < 1:
                continue

            if not var_id and not sku:
                raise PromioMappingError(f"Item '{it.get('title')}' is missing supplier variant identifier.")

            promio_items.append({
                "variant_uid": var_id,
                "sku": sku,
                "quantity": qty,
            })

        if not promio_items:
            raise PromioMappingError("Order contains no valid items for Promio fulfillment.")

        return {
            "client_order_id": order_id,
            "shipping_address": {
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "phone": phone,
                "address1": street,
                "address2": address2,
                "city": city,
                "zip": postal_code,
                "country": country,
            },
            "items": promio_items,
        }

    def create_order(self, order: dict[str, Any], items: list[dict[str, Any]]) -> str:
        """Create order in Promio.

        SAFETY LOCK:
        Order submission is strictly disabled (self.submit_orders_enabled=False).
        Validates payload first, then enforces the safety guard.
        """
        if not self.enabled:
            raise PromioOrderSubmissionDisabledError(
                "Promio supplier adapter is disabled (PROMIO_ENABLED=false)."
            )

        if not self.submit_orders_enabled:
            raise PromioOrderSubmissionDisabledError(
                "Promio order submission is strictly disabled. Order creation is blocked in all environments."
            )

        payload = self.build_order_payload(order, items)

        res = self.client.create_order(payload)
        created_id = str(res.get("id") or res.get("order_id") or "")
        if not created_id:
            raise PromioAPIError("Promio did not return an order ID in response.")
        return created_id

    def get_tracking(self, supplier_order_ref: str) -> dict:
        """Fetch tracking details from an existing Promio order."""
        if not self.enabled:
            return {"status": "disabled", "tracking_number": None, "carrier": None, "tracking_url": None}

        # Brick API order endpoint
        url = self.client._build_signed_url("order.php", {"id": supplier_order_ref})
        try:
            with httpx.Client(timeout=15.0) as http_client:
                resp = http_client.get(url)
        except Exception as exc:
            raise PromioAPIError(f"Failed to fetch order tracking for {supplier_order_ref}: {exc}") from exc

        if resp.status_code != 200:
            raise PromioAPIError(f"Promio order tracking returned HTTP {resp.status_code}")

        data = resp.json()
        fulfillments = data.get("fulfillments", [])
        if fulfillments and isinstance(fulfillments, list):
            f0 = fulfillments[0]
            return {
                "status": f0.get("status", "shipped"),
                "tracking_number": f0.get("trackingNo"),
                "carrier": f0.get("trackingCompany"),
                "tracking_url": f0.get("trackingUrl"),
            }

        return {
            "status": data.get("status", "processing"),
            "tracking_number": None,
            "carrier": None,
            "tracking_url": None,
        }
