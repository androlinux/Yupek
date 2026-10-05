from .. import config


class PaymentsNotConfigured(Exception):
    pass


def create_payment(order: dict) -> dict:
    """Swap this module's body to add PayPal/Mollie/etc. Returns data the frontend needs."""
    if not config.STRIPE_SECRET_KEY:
        raise PaymentsNotConfigured("Payments not configured")
    import stripe
    stripe.api_key = config.STRIPE_SECRET_KEY
    intent = stripe.PaymentIntent.create(
        amount=order["total_cents"], currency="eur",
        automatic_payment_methods={"enabled": True},
        receipt_email=order["email"], metadata={"order_id": order["id"]},
        idempotency_key=f"order-{order['id']}")
    return {"provider": "stripe", "ref": intent.id, "client_secret": intent.client_secret}


def verify_webhook(payload: bytes, signature: str) -> dict:
    import stripe
    if not config.STRIPE_WEBHOOK_SECRET:
        raise PaymentsNotConfigured("Webhook secret missing")
    return stripe.Webhook.construct_event(payload, signature, config.STRIPE_WEBHOOK_SECRET)
