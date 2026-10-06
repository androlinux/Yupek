"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import AuthGate from "@/components/account/AuthGate";
import AccountNav from "@/components/account/AccountNav";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import { supabase } from "@/lib/supabase";
import { eur } from "@/lib/catalog";
import Icon from "@/components/ui/Icon";

interface OrderDetail {
  id: string;
  customer_email: string;
  customer_name: string;
  shipping_address: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
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
  fulfillment_status:
    | "pending_payment"
    | "paid"
    | "printify_order_created"
    | "sent_to_production"
    | "in_production"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "failed";
  stripe_payment_intent_id?: string;
  printify_order_id?: string;
  items: Array<{
    product_id?: string;
    slug?: string;
    title?: string;
    color?: string;
    size?: string;
    quantity: number;
    unit_price_cents: number;
    image?: string;
  }>;
  tracking_number?: string;
  carrier?: string;
  tracking_url?: string;
  created_at: string;
}

function OrderDetailContent() {
  const params = useParams();
  const orderId = (params?.id as string) || "";
  const { user } = useAuth();
  const { t, locale } = useLanguage();

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

  const getFulfillmentDisplay = (status: string) => {
    switch (status) {
      case "printify_order_created":
        return locale === "nl" ? "Printify bestelling aangemaakt" : "Printify Order Created";
      case "sent_to_production":
      case "in_production":
        return locale === "nl" ? "In productie" : "In Production";
      case "shipped":
        return locale === "nl" ? "Verzonden" : "Shipped";
      case "delivered":
        return locale === "nl" ? "Bezorgd" : "Delivered";
      case "pending_payment":
        return locale === "nl" ? "In afwachting van betaling" : "Pending Payment";
      case "paid":
        return locale === "nl" ? "Betaald" : "Paid";
      case "cancelled":
        return locale === "nl" ? "Geannuleerd" : "Cancelled";
      default:
        return status.replace(/_/g, " ");
    }
  };

  const getPaymentStatusDisplay = (status: string) => {
    switch (status) {
      case "paid":
        return locale === "nl" ? "Betaald" : "Paid";
      case "failed":
        return locale === "nl" ? "Mislukt" : "Failed";
      case "refunded":
        return locale === "nl" ? "Terugbetaald" : "Refunded";
      default:
        return locale === "nl" ? "In behandeling" : "Pending";
    }
  };

  if (loading) {
    return (
      <div className="wrap py-28 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brown/30 border-t-brown" />
        <p className="mt-3 text-xs tracking-widest text-brown/60 uppercase">
          {locale === "nl" ? "Bestellingsdetails ophalen..." : "Loading order details..."}
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
            {locale === "nl" ? "Bestelling niet gevonden" : "Order Not Found"}
          </h2>
          <p className="mt-2 text-xs text-brown/60 leading-relaxed">
            {locale === "nl"
              ? "Deze bestelling bestaat niet of hoort niet bij uw persoonlijke account."
              : "This order could not be found or belongs to another private account."}
          </p>
          <Link href="/account/orders" className="btn btn-dark mt-6 inline-block">
            &larr; {locale === "nl" ? "Terug naar Bestellingen" : "Back to Orders"}
          </Link>
        </div>
      </div>
    );
  }

  const subtotalEuro = order.subtotal_cents / 100;
  const shippingEuro = order.shipping_cents / 100;
  const vatEuro = order.vat_cents / 100;
  const totalEuro = order.total_cents / 100;
  const placedDate = new Date(order.created_at).toLocaleDateString(
    locale === "nl" ? "nl-NL" : "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="wrap py-10 md:py-16">
      <AccountNav />

      <div className="mt-6">
        <Link
          href="/account/orders"
          className="text-xs tracking-wider uppercase text-brown/70 hover:text-burgundy inline-flex items-center gap-1.5 mb-6"
        >
          <span>&larr;</span>
          <span>{locale === "nl" ? "Terug naar Bestellingen" : "Back to Orders"}</span>
        </Link>

        {/* Header Banner */}
        <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-serif text-2xl sm:text-3xl text-brown font-semibold">
                #{order.id}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-semibold border ${
                  order.payment_status === "paid"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : order.payment_status === "failed"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : "bg-gold/20 text-brown border-gold/40"
                }`}
              >
                {getPaymentStatusDisplay(order.payment_status)}
              </span>
              <span className="rounded-full bg-sand/40 border border-brown/20 px-3 py-1 text-[10px] uppercase tracking-wider text-brown font-semibold">
                {getFulfillmentDisplay(order.fulfillment_status)}
              </span>
            </div>
            <p className="mt-1.5 text-xs text-brown/65">
              {t.account.placedOn} {placedDate}
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[10px] uppercase tracking-widest text-brown/50 block">
              {locale === "nl" ? "Totaalbedrag" : "Total Amount"}
            </span>
            <span className="font-mono text-2xl font-bold text-brown">
              {eur(totalEuro)}
            </span>
          </div>
        </div>

        {/* Tracking notification if exists */}
        {(order.tracking_number || order.fulfillment_status === "shipped") && (
          <div className="mt-6 border border-gold/40 bg-gold/10 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Icon name="truck" className="h-5 w-5 text-brown shrink-0" />
              <div>
                <p className="text-xs font-semibold text-brown uppercase tracking-wider">
                  {order.carrier || "DHL Express / PostNL"}
                </p>
                <p className="font-mono text-xs text-brown/80">
                  {locale === "nl" ? "Volgnummer:" : "Tracking Number:"} {order.tracking_number || `YUPEK-${order.id}`}
                </p>
              </div>
            </div>
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brown text-cream px-4 py-2 text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors self-start sm:self-auto"
              >
                {locale === "nl" ? "Pakket Volgen" : "Track Package"} &rarr;
              </a>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Items Section */}
          <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm">
            <h3 className="font-serif text-xl text-brown border-b border-brown/10 pb-3">
              {locale === "nl" ? "Bestelde Artikelen" : "Purchased Garments"} ({order.items?.length || 0})
            </h3>

            <div className="divide-y divide-brown/10 mt-4">
              {(order.items || []).map((item, idx) => {
                const itemTotal = (item.unit_price_cents * item.quantity) / 100;
                return (
                  <div key={idx} className="py-4 flex gap-4">
                    <div className="relative h-20 w-16 bg-sand/30 overflow-hidden shrink-0 border border-brown/10">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.title || "Garment"}
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
                          {item.title || "YUPEK Garment"}
                        </Link>
                      ) : (
                        <p className="font-medium text-xs uppercase tracking-wider text-brown truncate">
                          {item.title || "YUPEK Garment"}
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
                          {locale === "nl" ? "Aantal" : "Qty"}: <strong className="text-brown">{item.quantity}</strong>
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
                {locale === "nl" ? "Kostenoverzicht" : "Order Summary"}
              </h3>

              <div className="mt-4 space-y-2.5 text-xs text-brown/80 font-mono">
                <div className="flex justify-between">
                  <span>{locale === "nl" ? "Subtotaal" : "Subtotal"}</span>
                  <span>{eur(subtotalEuro)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{locale === "nl" ? "Verzendkosten" : "Shipping"}</span>
                  <span>{shippingEuro === 0 ? (locale === "nl" ? "Gratis" : "Free") : eur(shippingEuro)}</span>
                </div>
                <div className="flex justify-between text-brown/60 text-[11px]">
                  <span>{locale === "nl" ? "Waarvan BTW (21%)" : "Included VAT (21%)"}</span>
                  <span>{eur(vatEuro)}</span>
                </div>
                <div className="border-t border-brown/15 pt-3 flex justify-between font-bold text-sm text-brown font-serif">
                  <span>{locale === "nl" ? "Totaal" : "Total"}</span>
                  <span className="font-mono">{eur(totalEuro)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="border border-brown/15 bg-cream p-6 shadow-sm">
              <h3 className="font-serif text-lg text-brown border-b border-brown/10 pb-3">
                {locale === "nl" ? "Bezorgadres" : "Delivery Address"}
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
