from collections import defaultdict
from ..db import get_db
from .registry import get_adapter


def fulfil_order(order_id: str) -> None:
    """Send a paid order to each supplier involved. Called once per paid order."""
    db = get_db()
    order = db.table("orders").select("*").eq("id", order_id).single().execute().data
    items = db.table("order_items").select("*, product_variants(supplier_variant_id, products(supplier_id))") \
        .eq("order_id", order_id).execute().data
    by_supplier = defaultdict(list)
    for i in items:
        sid = i["product_variants"]["products"]["supplier_id"]
        if sid:
            by_supplier[sid].append({"supplier_variant_id": i["product_variants"]["supplier_variant_id"], "quantity": i["quantity"]})
    refs = {}
    errors = {}
    for sid, lines in by_supplier.items():
        supplier = db.table("suppliers").select("*").eq("id", sid).single().execute().data
        try:
            refs[sid] = get_adapter(supplier).create_order(order, lines)
        except Exception as e:  # order stays paid; collect all errors before deciding status
            errors[sid] = str(e)[:300]
    if errors:
        # Flag for manual retry; include all supplier error messages
        combined = "; ".join(f"{sid}: {msg}" for sid, msg in errors.items())
        db.table("orders").update({"status": "fulfilment_error", "notes": combined[:500]}).eq("id", order_id).execute()
    else:
        ref_str = ",".join(refs.values()) if refs else ""
        db.table("orders").update({"status": "processing", "supplier_order_ref": ref_str}).eq("id", order_id).execute()
