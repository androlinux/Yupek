"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthGate from "@/components/account/AuthGate";
import AccountNav from "@/components/account/AccountNav";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/catalog";
import Icon from "@/components/ui/Icon";
import {
  mapFulfillmentStatus,
  mapPaymentStatus,
  getPaymentBadgeClass,
  getFulfillmentBadgeClass,
  formatOrderDate,
} from "@/lib/orderStatus";

interface OrderSummary {
  id: string;
  customer_email: string;
  customer_name: string;
  currency: string;
  total_cents: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  fulfillment_status: string;
  items: Array<{
    title?: string;
    name?: string;
    slug?: string;
    size?: string;
    color?: string;
    quantity: number;
    unit_price_cents: number;
    image?: string;
  }>;
  created_at: string;
}

function OrdersListContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Get current auth session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/customer/orders", {
        headers,
      });

      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setError(data.error || "Failed to load orders");
      }
    } catch {
      setError("Network error loading orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="wrap py-10 md:py-16">
      <AccountNav />

      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-brown/10 pb-4">
          <div>
            <span className="label tracking-[.25em] text-burgundy text-[10px] uppercase font-semibold">
              {locale === "nl" ? "Aankoopgeschiedenis" : "Purchase History"}
            </span>
            <h2 className="font-serif text-2xl text-brown mt-1">
              {locale === "nl" ? "Mijn Bestellingen" : "My Orders"}
            </h2>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="text-[11px] uppercase tracking-wider text-brown/70 hover:text-brown inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Icon name="refresh" className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span>{locale === "nl" ? "Vernieuwen" : "Refresh"}</span>
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-4 p-3 bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brown/30 border-t-brown" />
            <p className="mt-3 text-xs tracking-widest text-brown/60 uppercase">
              {locale === "nl" ? "Bestellingen ophalen..." : "Loading orders..."}
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-8 py-16 text-center border border-dashed border-brown/20 bg-sand/10 p-8">
            <p className="font-serif text-2xl text-brown">{t.account.noOrdersTitle}</p>
            <p className="mt-2 text-xs text-brown/60 max-w-sm mx-auto">
              {t.account.noOrdersSubtitle}
            </p>
            <Link href="/shop" className="btn btn-dark mt-6 inline-block">
              {t.account.exploreBtn}
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => {
              const totalEuro = order.total_cents / 100;
              const dateFormatted = formatOrderDate(order.created_at, locale);

              return (
                <div
                  key={order.id}
                  className="border border-brown/15 bg-cream p-5 md:p-6 shadow-sm hover:border-brown/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brown/10 pb-4 gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-semibold text-brown tracking-wider">
                          #{order.id}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold border ${getPaymentBadgeClass(
                            order.payment_status
                          )}`}
                        >
                          {mapPaymentStatus(order.payment_status, locale)}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold border ${getFulfillmentBadgeClass(
                            order.fulfillment_status
                          )}`}
                        >
                          {mapFulfillmentStatus(order.fulfillment_status, locale)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-brown/60">
                        {t.account.placedOn} {dateFormatted}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between">
                      <span className="font-mono text-base font-semibold text-brown">
                        {eur(totalEuro)}
                      </span>
                      <Link
                        href={`/account/orders/${encodeURIComponent(order.id)}`}
                        className="text-xs uppercase tracking-wider text-burgundy hover:underline font-medium mt-1 inline-flex items-center gap-1"
                      >
                        <span>{locale === "nl" ? "Bekijk details" : "View Details"}</span>
                        <span>&rarr;</span>
                      </Link>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    {(order.items || []).slice(0, 4).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <div className="relative h-12 w-10 bg-sand/30 overflow-hidden shrink-0 border border-brown/10">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title || item.name || "Garment"}
                              width={40}
                              height={48}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-brown/40">
                              YPK
                            </div>
                          )}
                        </div>
                        <div className="text-xs">
                          <p className="font-medium text-brown truncate max-w-[150px]">
                            {item.title || item.name || "Garment"}
                          </p>
                          <p className="text-[10px] text-brown/60">
                            {item.size && `${item.size} • `}
                            {item.color && `${item.color} • `}
                            x{item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(order.items || []).length > 4 && (
                      <span className="text-xs text-brown/50 font-mono">
                        +{(order.items.length - 4)} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountOrdersPage() {
  return (
    <AuthGate>
      <OrdersListContent />
    </AuthGate>
  );
}
