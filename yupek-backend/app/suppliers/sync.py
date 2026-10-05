import re
from .. import config
from ..db import get_db
from .registry import get_adapter


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def retail_cents(cost_cents: int) -> int:
    """Markup rule, rounded to nearest euro + .90 (e.g. 3960 -> 3990). Never below cost."""
    price = cost_cents * config.SUPPLIER_MARKUP
    rounded = int(price // 100) * 100 + 90
    # Guarantee the retail price is always at least the cost
    return max(rounded, cost_cents)


def sync_supplier(supplier: dict) -> dict:
    db, adapter = get_db(), get_adapter(supplier)
    cursor, n_products, n_variants = None, 0, 0
    while True:
        products, cursor = adapter.list_products(cursor)
        for sp in products:
            row = db.table("products").upsert({
                "slug": _slug(f"{supplier['name']}-{sp.name}-{sp.supplier_product_id}"),
                "name": sp.name, "description": sp.description, "category": sp.category,
                "gender": sp.gender,
                # status is intentionally omitted: new products default to 'draft' via DB column default;
                # existing products retain whatever status an admin has set (active/archived).
                "supplier_id": supplier["id"], "supplier_product_id": sp.supplier_product_id,
                "supplier_price_cents": min((v.cost_cents for v in sp.variants), default=None),
                "shipping_days": sp.shipping_days,
            }, on_conflict="supplier_id,supplier_product_id").execute().data[0]
            if sp.variants:
                db.table("product_variants").upsert([{
                    "product_id": row["id"], "sku": v.sku, "size": v.size, "color": v.color,
                    "price_cents": retail_cents(v.cost_cents), "inventory": v.stock,
                    "supplier_variant_id": v.supplier_variant_id} for v in sp.variants], on_conflict="sku").execute()
            n_products += 1
            n_variants += len(sp.variants)
        if not cursor:
            break
    db.table("supplier_sync_log").insert({"supplier_id": supplier["id"], "products": n_products, "variants": n_variants}).execute()
    return {"products": n_products, "variants": n_variants}
