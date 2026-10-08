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
      timeout: 15000, // 15 seconds HTTP timeout for outbound Stripe API calls
      maxNetworkRetries: 2, // Automatic safe idempotency retry on network drops
    });
  }
  return stripeServerInstance;
}
