"""python -m app.seed  -> inserts the 8 placeholder YUPEK products."""
from .db import get_db

ITEMS = [
    ("yupek-heritage-tee", "YUPEK Heritage Tee", "Everyday cotton tee", "tees", "unisex", 4900, ["XS", "S", "M", "L", "XL", "XXL"], ["Black"], True, True),
    ("yupek-eastern-oversized-tee", "YUPEK Eastern Oversized Tee", "Oversized silhouette", "tees", "unisex", 5900, ["S", "M", "L", "XL"], ["Black", "Sand"], True, True),
    ("yupek-heritage-sweatshirt", "YUPEK Heritage Sweatshirt", "Heavyweight fleece", "sweatshirts", "unisex", 8900, ["S", "M", "L", "XL"], ["Black", "Burgundy"], True, False),
    ("yupek-signature-shirt", "YUPEK Signature Shirt", "Relaxed woven shirt", "shirts", "men", 7900, ["S", "M", "L", "XL"], ["Ivory"], True, False),
    ("yupek-heritage-trousers", "YUPEK Heritage Trousers", "Tapered everyday trouser", "trousers", "unisex", 8900, ["S", "M", "L", "XL"], ["Charcoal"], False, True),
    ("yupek-eastern-denim", "YUPEK Eastern Denim", "Straight-leg denim", "denim", "unisex", 9900, ["S", "M", "L", "XL"], ["Indigo"], False, False),
    ("yupek-silk-inspired-shirt", "YUPEK Silk-Inspired Shirt", "Fluid drape", "shirts", "women", 8900, ["XS", "S", "M", "L"], ["Olive", "Ivory"], True, True),
    ("yupek-heritage-tote", "YUPEK Heritage Tote", "Canvas carry-all", "accessories", "unisex", 3900, ["ONE SIZE"], ["Natural"], False, False),
]

def _run() -> None:
    db = get_db()
    for slug, name, desc, cat, gen, price, sizes, colors, feat, new in ITEMS:
        p = db.table("products").upsert({"slug": slug, "name": name, "short_descriptor": desc, "description": desc,
                                         "category": cat, "gender": gen, "featured": feat, "new_arrival": new,
                                         "status": "active", "tags": ["yupek", cat, gen]}, on_conflict="slug").execute().data[0]
        db.table("product_images").delete().eq("product_id", p["id"]).execute()
        db.table("product_images").insert([{"product_id": p["id"], "url": f"/products/{slug}-{n}.jpg", "alt": name, "position": n} for n in (1, 2)]).execute()
        db.table("product_variants").upsert([{"product_id": p["id"], "sku": f"{slug}-{c[:3]}-{s}".upper().replace(" ", ""), "size": s, "color": c,
                                              "price_cents": price, "inventory": 50} for s in sizes for c in colors], on_conflict="sku").execute()
    db.table("suppliers").upsert({"name": "Mock Supplier", "type": "mock", "active": True}, on_conflict="name").execute()
    print("Seeded.")


_run()
