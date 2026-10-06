import logging
from typing import Any
from .. import config

logger = logging.getLogger("payments")


class PaymentsNotConfigured(Exception):
    pass


class InvalidSignature(Exception):
    pass


def create_payment_intent(
    order_id: str,
    yupek_order_id: str,
    amount_cents: int,
    currency: str = "eur",
    customer_email: str | None = None,
) -> dict[str, Any]:
    """Create a Stripe PaymentIntent with strict integer cent amount and order reference metadata.
    
    NEVER includes sensitive personal data in Stripe metadata.
    """
    secret_key = config.STRIPE_SECRET_KEY
    if not secret_key:
        raise PaymentsNotConfigured("STRIPE_SECRET_KEY is not configured in backend environment.")

    import stripe
    stripe.api_key = secret_key

    metadata = {
        "order_id": str(order_id),
        "yupek_order_id": str(yupek_order_id),
    }

    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency=currency.lower(),
        automatic_payment_methods={"enabled": True},
        receipt_email=customer_email if customer_email else None,
        metadata=metadata,
        idempotency_key=f"intent-{yupek_order_id}",
    )

    return {
        "provider": "stripe",
        "payment_intent_id": intent.id,
        "client_secret": intent.client_secret,
        "amount_cents": intent.amount,
        "currency": intent.currency,
    }


def verify_webhook_signature(payload: bytes, signature_header: str) -> dict[str, Any]:
    """Verify raw request body and Stripe signature header.
    
    Rejects invalid signatures and unconfigured secrets.
    """
    webhook_secret = config.STRIPE_WEBHOOK_SECRET
    if not webhook_secret:
        raise PaymentsNotConfigured("STRIPE_WEBHOOK_SECRET is not configured in backend environment.")

    if not signature_header:
        raise InvalidSignature("Missing stripe-signature header")

    import stripe
    stripe.api_key = config.STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=signature_header,
            secret=webhook_secret,
        )
        return event
    except Exception as exc:
        logger.warning(f"Stripe signature verification failed: {exc}")
        raise InvalidSignature(str(exc)) from exc


def retrieve_payment_intent(payment_intent_id: str) -> dict[str, Any]:
    """Retrieve authoritative PaymentIntent state from Stripe."""
    secret_key = config.STRIPE_SECRET_KEY
    if not secret_key:
        raise PaymentsNotConfigured("STRIPE_SECRET_KEY is not configured.")

    import stripe
    stripe.api_key = secret_key
    return stripe.PaymentIntent.retrieve(payment_intent_id)
