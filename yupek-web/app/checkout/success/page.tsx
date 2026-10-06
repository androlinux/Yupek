"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/components/Providers";

interface OrderStatusData {
  order_id: string;
  customer_email: string;
  customer_name: string;
  currency: string;
  total_cents: number;
  subtotal_cents: number;
  shipping_cents: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  fulfillment_status: string;
  printify_order_id?: string | null;
  items?: Array<{
    title?: string;
    size?: string;
    color?: string;
    quantity: number;
    unit_price_cents: number;
  }>;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const { clearCart } = useStore();

  const [order, setOrder] = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Poll authoritative backend/Supabase status
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("No order reference found.");
      return;
    }

    let isMounted = true;
    let pollCount = 0;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/orders/${orderId}?t=${Date.now()}`);
        if (!res.ok) {
          throw new Error("Unable to retrieve order status.");
        }
        const data: OrderStatusData = await res.json();
        if (isMounted) {
          setOrder(data);
          setLoading(false);

          // Once payment is confirmed, clear the client cart
          if (data.payment_status === "paid") {
            clearCart();
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Error fetching order status.");
          setLoading(false);
        }
      }
    }

    checkStatus();

    // Poll every 2.5 seconds if payment is still pending
    const interval = setInterval(() => {
      pollCount += 1;
      if (pollCount <= 12) {
        checkStatus();
      } else {
        clearInterval(interval);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId, clearCart]);

  const formatEur = (cents?: number) => {
    if (cents === undefined || cents === null) return "€0.00";
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="wrap max-w-2xl py-20 px-4">
      <div className="border border-gold/40 bg-sand/30 p-8 md:p-12 shadow-sm text-brown text-center rounded-sm">
        {loading ? (
          <div className="py-12 space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-burgundy border-t-transparent" />
            <p className="font-serif text-xl text-brown">Retrieving Order Details...</p>
            <p className="text-xs text-brown/60">Verifying authoritative transaction record</p>
          </div>
        ) : error && !order ? (
          <div className="py-8 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 font-bold">
              !
            </div>
            <h1 className="font-serif text-2xl text-brown">Order Lookup</h1>
            <p className="text-xs text-brown/70">{error}</p>
            <Link href="/shop" className="btn btn-dark text-xs mt-4 inline-block">
              Return to Boutique
            </Link>
          </div>
        ) : order ? (
          <>
            {/* Status Icon */}
            {order.payment_status === "paid" ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-800 mb-4 font-bold text-xl">
                ✓
              </div>
            ) : order.payment_status === "failed" ? (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-800 mb-4 font-bold text-xl">
                ✕
              </div>
            ) : (
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800 mb-4 font-bold text-xl animate-pulse">
                ⋯
              </div>
            )}

            {/* Authoritative Banner */}
            <div className="mb-2">
              {order.payment_status === "paid" ? (
                <span className="inline-block bg-green-800 text-white text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full">
                  Payment Confirmed
                </span>
              ) : order.payment_status === "failed" ? (
                <span className="inline-block bg-red-800 text-white text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full">
                  Payment Failed
                </span>
              ) : (
                <span className="inline-block bg-amber-700 text-white text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full animate-pulse">
                  Payment Processing with Stripe...
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl md:text-4xl text-brown mt-2">
              {order.payment_status === "paid" ? "Thank You for Your Order" : order.payment_status === "failed" ? "Payment Not Completed" : "Finalizing Order..."}
            </h1>

            <p className="mt-3 text-xs text-brown/80 max-w-md mx-auto leading-relaxed">
              {order.payment_status === "paid"
                ? `A confirmation receipt and order summary have been dispatched to ${order.customer_email}.`
                : order.payment_status === "failed"
                ? "Your card was not charged. Please try another payment method."
                : "Your payment authorization is being confirmed. The status will automatically refresh."}
            </p>

            {/* Authoritative Order Details Card */}
            <div className="mt-8 border-t border-b border-brown/20 py-6 text-left space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-brown/70 tracking-wider uppercase text-[11px]">YUPEK Order Reference:</span>
                <span className="font-mono font-bold text-brown text-sm">{order.order_id}</span>
              </div>

              {order.printify_order_id && (
                <div className="flex justify-between items-center text-green-900 bg-green-50 p-2 rounded">
                  <span className="font-semibold tracking-wider uppercase text-[10px]">Fulfillment Status:</span>
                  <span className="font-mono text-[11px] font-bold">
                    Queued for Production (Printify #{order.printify_order_id.slice(-6)})
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="font-semibold text-brown/70 tracking-wider uppercase text-[11px]">Authoritative Total:</span>
                <span className="font-bold text-burgundy text-base">{formatEur(order.total_cents)}</span>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mt-4 pt-3 border-t border-brown/10 space-y-2">
                  <p className="font-semibold text-[11px] uppercase tracking-wider text-brown/60">Items Ordered:</p>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-brown/90">
                      <span>
                        {item.title} &bull; <span className="text-brown/60">{item.color} / {item.size} &times; {item.quantity}</span>
                      </span>
                      <span className="font-semibold">{formatEur(item.unit_price_cents * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            {order.payment_status === "failed" ? (
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/checkout" className="btn btn-dark text-xs">
                  Try Again
                </Link>
                <Link href="/checkout" className="btn btn-line text-xs">
                  Change Payment Method
                </Link>
              </div>
            ) : (
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/account" className="btn btn-dark text-xs">
                  View in Account
                </Link>
                <Link href="/shop" className="btn btn-line text-xs">
                  Continue Browsing
                </Link>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="wrap max-w-2xl py-20 px-4 text-center">
          <div className="border border-gold/40 bg-sand/30 p-12 rounded-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-burgundy border-t-transparent mb-4" />
            <p className="font-serif text-xl text-brown">Retrieving Order Details...</p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
