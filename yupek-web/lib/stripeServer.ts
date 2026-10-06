import Stripe from "stripe";

let stripeServerInstance: Stripe | null = null;

export function getStripeServer(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  if (!stripeServerInstance) {
    stripeServerInstance = new Stripe(secretKey, {
      apiVersion: "2024-06-20" as any,
      typescript: true,
    });
  }
  return stripeServerInstance;
}
