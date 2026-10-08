import re
from fastapi import APIRouter, HTTPException, Query, Response
from ..db import get_db

router = APIRouter(prefix="/api/products", tags=["products"])
SORTS = {"newest": ("seq", True), "price_asc": ("min_price_cents", False), "price_desc": ("min_price_cents", True)}


@router.get("")
def list_products(
    response: Response,
    limit: int = Query(24, ge=1, le=48),
    cursor: str | None = None,
    sort: str = "newest",
    category: str | None = None,
    gender: str | None = None,
    size: str | None = None,
    color: str | None = None,
    min_price: int | None = Query(None, ge=0, description="cents"),
    max_price: int | None = Query(None, ge=0, description="cents"),
    featured: bool | None = None,
    new_arrival: bool | None = None,
    q: str | None = Query(None, max_length=60),
):
    if sort not in SORTS:
        raise HTTPException(400, "Invalid sort")
    field, desc = SORTS[sort]
    qb = get_db().table("product_cards").select("*")
    if category: qb = qb.eq("category", category)
    if gender: qb = qb.in_("gender", [gender, "unisex"])
    if size: qb = qb.contains("sizes", [size])
    if color: qb = qb.contains("colors", [color])
    if min_price is not None: qb = qb.gte("min_price_cents", min_price)
    if max_price is not None: qb = qb.lte("min_price_cents", max_price)
    if featured is not None: qb = qb.eq("featured", featured)
    if new_arrival is not None: qb = qb.eq("new_arrival", new_arrival)
    if q:
        term = re.sub(r"[^\w\s-]", "", q).strip()
        if term:
            qb = qb.or_(f"name.ilike.%{term}%,category.ilike.%{term}%,short_descriptor.ilike.%{term}%,tags_text.ilike.%{term}%")

    if cursor:  # keyset pagination: "seq" or "price|seq" (integers only)
        try:
            parts = [int(x) for x in cursor.split("|")]
        except ValueError:
            raise HTTPException(400, "Invalid cursor")
        op = "lt" if desc else "gt"
        if field == "seq" and len(parts) == 1:
            qb = qb.filter("seq", op, parts[0])
        elif field != "seq" and len(parts) == 2:
            qb = qb.or_(f"{field}.{op}.{parts[0]},and({field}.eq.{parts[0]},seq.{op}.{parts[1]})")
        else:
            raise HTTPException(400, "Invalid cursor")

    qb = qb.order(field, desc=desc)
    if field != "seq":
        qb = qb.order("seq", desc=desc)
    rows = qb.limit(limit + 1).execute().data
    more = len(rows) > limit
    items = rows[:limit]
    nxt = None
    if more:
        last = items[-1]
        nxt = str(last["seq"]) if field == "seq" else f"{last[field]}|{last['seq']}"
    response.headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300"
    return {"items": items, "nextCursor": nxt}


@router.get("/{slug}")
def get_product(slug: str, response: Response):
    db = get_db()
    res = db.table("products").select("*, product_variants(id,sku,size,color,price_cents,currency,inventory), product_images(url,alt,position)") \
        .eq("slug", slug).eq("status", "active").limit(1).execute().data
    if not res:
        raise HTTPException(404, "Product not found")
    p = res[0]
    for k in ("supplier_id", "supplier_product_id", "supplier_price_cents"):
        p.pop(k, None)  # never leak supplier data
    for v in p.get("product_variants", []):
        v.pop("supplier_variant_id", None)
    p["product_images"].sort(key=lambda i: i["position"])
    related = db.table("product_cards").select("*").eq("category", p["category"]).neq("id", p["id"]).limit(4).execute().data
    response.headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300"
    return {"product": p, "related": related}
