from fastapi import APIRouter, Depends
from ..auth import current_user
from ..db import get_db

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])


@router.get("")
def get_wishlist(user=Depends(current_user)):
    ids = [r["product_id"] for r in get_db().table("wishlists").select("product_id").eq("user_id", user["sub"]).execute().data]
    if not ids:
        return {"items": []}
    return {"items": get_db().table("product_cards").select("*").in_("id", ids).execute().data}


@router.put("/{product_id}")
def add(product_id: str, user=Depends(current_user)):
    get_db().table("wishlists").upsert({"user_id": user["sub"], "product_id": product_id}, on_conflict="user_id,product_id").execute()
    return {"ok": True}


@router.delete("/{product_id}")
def remove(product_id: str, user=Depends(current_user)):
    get_db().table("wishlists").delete().eq("user_id", user["sub"]).eq("product_id", product_id).execute()
    return {"ok": True}
