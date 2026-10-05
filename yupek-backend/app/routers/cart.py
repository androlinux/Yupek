from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from ..auth import current_user
from ..db import get_db

router = APIRouter(prefix="/api/cart", tags=["cart"])


class Item(BaseModel):
    variant_id: str
    quantity: int = Field(ge=1, le=10)


def _get(uid: str):
    return get_db().table("cart_items").select("variant_id, quantity, product_variants(sku,size,color,price_cents,currency,products(name,slug))") \
        .eq("user_id", uid).execute().data


@router.get("")
def get_cart(user=Depends(current_user)):
    items = _get(user["sub"])
    subtotal = sum(i["quantity"] * i["product_variants"]["price_cents"] for i in items)
    return {"items": items, "subtotal_cents": subtotal}


@router.put("/items")
def upsert_item(item: Item, user=Depends(current_user)):
    get_db().table("cart_items").upsert(
        {"user_id": user["sub"], "variant_id": item.variant_id, "quantity": item.quantity},
        on_conflict="user_id,variant_id").execute()
    return get_cart(user)


@router.delete("/items/{variant_id}")
def remove_item(variant_id: str, user=Depends(current_user)):
    get_db().table("cart_items").delete().eq("user_id", user["sub"]).eq("variant_id", variant_id).execute()
    return get_cart(user)


@router.post("/merge")
def merge_guest_cart(items: list[Item], user=Depends(current_user)):
    """Call once after login with the localStorage cart."""
    if len(items) > 50:
        raise HTTPException(400, "Too many items")
    existing = {i["variant_id"]: i["quantity"] for i in _get(user["sub"])}
    rows = [{"user_id": user["sub"], "variant_id": i.variant_id,
             "quantity": min(10, existing.get(i.variant_id, 0) + i.quantity)} for i in items]
    if rows:
        get_db().table("cart_items").upsert(rows, on_conflict="user_id,variant_id").execute()
    return get_cart(user)
