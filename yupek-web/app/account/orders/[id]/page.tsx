"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import AuthGate from "@/components/account/AuthGate";
import AccountNav from "@/components/account/AccountNav";
import OrderStatusTimeline from "@/components/account/OrderStatusTimeline";
import TrackingCard from "@/components/account/TrackingCard";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/catalog";
import {
  mapFulfillmentStatus,
  mapPaymentStatus,
  getPaymentBadgeClass,
  getFulfillmentBadgeClass,
  formatOrderDate,
} from "@/lib/orderStatus";

interface OrderDetail {
  id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    street: string;
    address2?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  vat_cents: number;
  total_cents: number;
  payment_status: "pending" | "paid" | "failed" | "refunded";
  fulfillment_status: string;
  items: Array<{
    slug?: string;
    title?: string;
    name?: string;
    color?: string;
    size?: string;
    quantity: number;
    unit_price_cents: number;
    image?: string;
  }>;
  tracking_number?: string | null;
  carrier?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  created_at: string;
}

function OrderDetailContent() {
  const params = useParams();
  const orderId = (params?.id as string) || "";
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const isNl = locale === "nl";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchOrderDetail = useCallback(async () => {
    if (!orderId || !user) return;
    setLoading(true);
    setNotFound(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/customer/orders/${encodeURIComponent(orderId)}`, {
        headers,
      });

      if (res.status === 404 || res.status === 401 || res.status === 403) {
        setNotFound(true);
        return;
      }

      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrder(data.order);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  if (loading) {
    return (
      <div className="wrap py-28 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brown/30 border-t-brown" />
        <p className="mt-3 text-xs tracking-widest text-brown/60 uppercase">
          {isNl ? "Bestellingsdetails ophalen..." : "Loading order details..."}
        </p>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="wrap py-20 text-center">
        <div className="mx-auto max-w-md border border-brown/20 bg-cream p-8 shadow-sm">
          <span className="font-mono text-2xl font-bold text-burgundy">404</span>
          <h2 className="font-serif text-2xl text-brown mt-2">
            {isNl ? "Bestelling niet gevonden" : "Order Not Found"}
          </h2>
          <p className="mt-2 text-xs text-brown/60 leading-relaxed">
            {isNl
              ? "Deze bestelling bestaat niet of hoort niet bij uw persoonlijke account."
              : "This order could not be found or belongs to another private account."}
          </p>
          <Link href="/account/orders" className="btn btn-dark mt-6 inline-block">
            &larr; {isNl ? "Terug naar Bestellingen" : "Back to Orders"}
          </Link>
        </div>
      </div>
    );
  }

  const subtotalEuro = order.subtotal_cents / 100;
  const shippingEuro = order.shipping_cents / 100;
  const vatEuro = order.vat_cents / 100;
  const totalEuro = order.total_cents / 100;
  const placedDate = formatOrderDate(order.created_at, locale, true);

  return (
    <div className="wrap py-10 md:py-16">
      <AccountNav />

      <div className="mt-6">
        <Link
          href="/account/orders"
          className="text-xs tracking-wider uppercase text-brown/70 hover:text-burgundy inline-flex items-center gap-1.5 mb-6"
        >
          <span>&larr;</span>
          <span>{isNl ? "Terug naar Bestellingen" : "Back to Orders"}</span>
        </Link>

        {/* 1. Header Banner */}
        <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-serif text-2xl sm:text-3xl text-brown font-semibold">
                #{order.id}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-semibold border ${getPaymentBadgeClass(
                  order.payment_status
                )}`}
              >
                {mapPaymentStatus(order.payment_status, locale)}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-semibold border ${getFulfillmentBadgeClass(
                  order.fulfillment_status
                )}`}
              >
                {mapFulfillmentStatus(order.fulfillment_status, locale)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-brown/65">
              {t.account.placedOn} {placedDate}
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[10px] uppercase tracking-widest text-brown/50 block">
              {isNl ? "Totaalbedrag" : "Total Amount"}
            </span>
            <span className="font-mono text-2xl font-bold text-brown">
              {eur(totalEuro)}
            </span>
          </div>
        </div>

        {/* 2. Order Lifecycle Timeline */}
        <div className="mt-6">
          <OrderStatusTimeline order={order} />
        </div>

        {/* 3. Tracking Notification Card (if applicable) */}
        <div className="mt-6">
          <TrackingCard
            carrier={order.carrier}
            trackingNumber={order.tracking_number}
            trackingUrl={order.tracking_url}
            shippedAt={order.shipped_at}
            deliveredAt={order.delivered_at}
            fulfillmentStatus={order.fulfillment_status}
          />
        </div>

        {/* 4. Main Details Grid: Items (Left) + Breakdown & Shipping Address (Right) */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Purchased Items Section */}
          <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-xl text-brown border-b border-brown/10 pb-3">
              {isNl ? "Bestelde Artikelen" : "Purchased Garments"} ({order.items?.length || 0})
            </h3>

            <div className="divide-y divide-brown/10 mt-4">
              {(order.items || []).map((item, idx) => {
                const itemTotal = (item.unit_price_cents * item.quantity) / 100;
                const displayName = item.title || item.name || "YUPEK Garment";

                return (
                  <div key={idx} className="py-4 flex gap-4">
                    <div className="relative h-20 w-16 bg-sand/30 overflow-hidden shrink-0 border border-brown/10">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={displayName}
                          width={64}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-brown/40">
                          YPK
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {item.slug ? (
                        <Link
                          href={`/product/${item.slug}`}
                          className="font-medium text-xs uppercase tracking-wider text-brown hover:text-burgundy truncate block"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <p className="font-medium text-xs uppercase tracking-wider text-brown truncate">
                          {displayName}
                        </p>
                      )}

                      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-brown/65">
                        {item.color && (
                          <span>
                            {t.product.colorLabel}: <strong className="text-brown">{item.color}</strong>
                          </span>
                        )}
                        {item.size && (
                          <span>
                            {t.product.sizeLabel}: <strong className="text-brown">{item.size}</strong>
                          </span>
                        )}
                        <span>
                          {isNl ? "Aantal" : "Qty"}: <strong className="text-brown">{item.quantity}</strong>
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-mono text-brown flex items-center justify-between">
                        <span className="text-[11px] text-brown/60">
                          {eur(item.unit_price_cents / 100)} each
                        </span>
                        <span className="font-semibold">{eur(itemTotal)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown & Shipping details */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="border border-brown/15 bg-cream p-6 shadow-sm">
              <h3 className="font-serif text-lg text-brown border-b border-brown/10 pb-3">
                {isNl ? "Kostenoverzicht" : "Order Summary"}
              </h3>

              <div className="mt-4 space-y-2.5 text-xs text-brown/80 font-mono">
                <div className="flex justify-between">
                  <span>{isNl ? "Subtotaal" : "Subtotal"}</span>
                  <span>{eur(subtotalEuro)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{isNl ? "Verzendkosten" : "Shipping"}</span>
                  <span>{shippingEuro === 0 ? (isNl ? "Gratis" : "Free") : eur(shippingEuro)}</span>
                </div>
                {vatEuro > 0 && (
                  <div className="flex justify-between text-brown/60 text-[11px]">
                    <span>{isNl ? "Inbegrepen BTW (21%)" : "Included VAT (21%)"}</span>
                    <span>{eur(vatEuro)}</span>
                  </div>
                )}
                <div className="border-t border-brown/15 pt-3 flex justify-between font-bold text-sm text-brown font-serif">
                  <span>{isNl ? "Totaal" : "Total"}</span>
                  <span className="font-mono">{eur(totalEuro)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address (Read-only) */}
            <div className="border border-brown/15 bg-cream p-6 shadow-sm">
              <h3 className="font-serif text-lg text-brown border-b border-brown/10 pb-3">
                {isNl ? "Bezorgadres" : "Delivery Address"}
              </h3>

              <div className="mt-4 text-xs text-brown/80 space-y-1 leading-relaxed">
                <p className="font-semibold text-brown">
                  {order.shipping_address?.first_name} {order.shipping_address?.last_name}
                </p>
                <p>{order.shipping_address?.street}</p>
                {order.shipping_address?.address2 && <p>{order.shipping_address.address2}</p>}
                <p>
                  {order.shipping_address?.postalCode} {order.shipping_address?.city}
                </p>
                <p>{order.shipping_address?.country}</p>
                {order.shipping_address?.phone && (
                  <p className="pt-2 text-brown/60 font-mono">
                    Tel: {order.shipping_address.phone}
                  </p>
                )}
                <p className="text-brown/60 font-mono">
                  Email: {order.customer_email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthGate>
      <OrderDetailContent />
    </AuthGate>
  );
}
