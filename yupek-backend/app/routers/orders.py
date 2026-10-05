from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from .. import config
from ..auth import current_user
from ..db import get_db
from ..payments.provider import PaymentsNotConfigured, create_payment, verify_webhook
from ..suppliers.fulfil import fulfil_order

router = APIRouter(tags=["orders"])


class Checkout(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    address: str
    city: str
    postcode: str
    country: str
    phone: str
    delivery: Literal["standard", "express"] = "standard"


@router.post("/api/checkout")
def checkout(body: Checkout, user=Depends(current_user)):
    if body.country not in config.COUNTRIES:
        raise HTTPException(400, "Country not supported")
    if not config.STRIPE_SECRET_KEY:
        raise HTTPException(503, "Payments not configured")
    db = get_db()
    cart = db.table("cart_items").select("variant_id, quantity, product_variants(id,price_cents,inventory,product_id)") \
        .eq("user_id", user["sub"]).execute().data
    if not cart:
        raise HTTPException(400, "Your bag is empty")
    subtotal = 0
    for c in cart:  # prices ALWAYS come from the DB, never from the client
        v = c["product_variants"]
        if v["inventory"] is not None and v["inventory"] < c["quantity"]:
            raise HTTPException(409, "An item is out of stock")
        subtotal += v["price_cents"] * c["quantity"]
    free = body.delivery == "standard" and subtotal >= config.FREE_SHIPPING_OVER
    shipping = 0 if free else config.DELIVERY[body.delivery]
    total = subtotal + shipping
    vat = round(total - total / (1 + config.VAT_RATE))  # prices include VAT
    order = db.table("orders").insert({
        "user_id": user["sub"], "email": body.email, "status": "pending",
        "subtotal_cents": subtotal, "shipping_cents": shipping, "vat_cents": vat, "total_cents": total,
        "address": body.model_dump(exclude={"email"}), "delivery": body.delivery}).execute().data[0]
    db.table("order_items").insert([{
        "order_id": order["id"], "variant_id": c["variant_id"], "quantity": c["quantity"],
        "unit_price_cents": c["product_variants"]["price_cents"]} for c in cart]).execute()
    try:
        pay = create_payment(order)
    except PaymentsNotConfigured:
        raise HTTPException(503, "Payments not configured")
    db.table("orders").update({"payment_provider": pay["provider"], "payment_ref": pay["ref"]}).eq("id", order["id"]).execute()
    return {"order_id": order["id"], "total_cents": total, "client_secret": pay["client_secret"]}


@router.get("/api/orders")
def my_orders(user=Depends(current_user)):
    return get_db().table("orders").select("*, order_items(*)").eq("user_id", user["sub"]).order("created_at", desc=True).execute().data


@router.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    try:
        event = verify_webhook(payload, request.headers.get("stripe-signature", ""))
    except PaymentsNotConfigured:
        raise HTTPException(503, "Payments not configured")
    except Exception:
        raise HTTPException(400, "Invalid signature")
    if event["type"] == "payment_intent.succeeded":
        order_id = event["data"]["object"]["metadata"].get("order_id")
        db = get_db()
        # idempotent: only the first webhook flips pending -> paid
        res = db.table("orders").update({"status": "paid"}).eq("id", order_id).eq("status", "pending").execute().data
        if res:
            db.table("cart_items").delete().eq("user_id", res[0]["user_id"]).execute()
            fulfil_order(order_id)
    return {"received": True}
