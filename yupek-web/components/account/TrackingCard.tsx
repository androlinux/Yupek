"use client";

import { useLanguage } from "@/components/LanguageContext";
import { isSafeExternalUrl, formatOrderDate } from "@/lib/orderStatus";
import Icon from "@/components/ui/Icon";

interface TrackingCardProps {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  fulfillmentStatus: string;
}

export default function TrackingCard({
  carrier,
  trackingNumber,
  trackingUrl,
  shippedAt,
  deliveredAt,
  fulfillmentStatus,
}: TrackingCardProps) {
  const { locale } = useLanguage();
  const isNl = locale === "nl";

  const hasTrackingData = Boolean(
    trackingNumber ||
    (trackingUrl && isSafeExternalUrl(trackingUrl)) ||
    shippedAt ||
    deliveredAt
  );

  // If no tracking data exists and order is still before shipment, return null or a gentle note
  if (!hasTrackingData) {
    if (fulfillmentStatus === "in_production" || fulfillmentStatus === "sent_to_production" || fulfillmentStatus === "printify_order_created") {
      return (
        <div className="border border-brown/10 bg-sand/10 p-4 text-xs text-brown/70 flex items-center gap-3">
          <Icon name="truck" className="h-4 w-4 text-brown/50 shrink-0" />
          <span>
            {isNl
              ? "Volgnummer wordt beschikbaar zodra uw pakket is overhandigd aan de bezorgdienst."
              : "Tracking information will be provided as soon as your package is dispatched with the courier."}
          </span>
        </div>
      );
    }
    return null;
  }

  const isDelivered = Boolean(deliveredAt || fulfillmentStatus === "delivered");
  const validUrl = isSafeExternalUrl(trackingUrl) ? trackingUrl : null;

  return (
    <div className="border border-gold/40 bg-gold/10 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        <div className="rounded-full bg-sand/60 p-2.5 text-brown border border-brown/20 shrink-0">
          <Icon name={isDelivered ? "check" : "truck"} className="h-5 w-5 text-brown" />
        </div>

        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded border ${
                isDelivered
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-blue-100 text-blue-800 border-blue-200"
              }`}
            >
              {isDelivered
                ? isNl
                  ? "Bezorgd"
                  : "Delivered"
                : isNl
                ? "Verzonden"
                : "Shipped"}
            </span>

            {carrier && (
              <span className="text-xs font-semibold text-brown uppercase tracking-wider">
                {carrier}
              </span>
            )}
          </div>

          {trackingNumber && (
            <p className="font-mono text-xs text-brown/90 break-all">
              <span className="text-brown/60 uppercase text-[10px] tracking-wider mr-1">
                {isNl ? "Volgnummer:" : "Tracking:"}
              </span>
              <span className="font-semibold">{trackingNumber}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 text-[11px] text-brown/65">
            {shippedAt && (
              <span>
                {isNl ? "Verzonden op:" : "Shipped on:"}{" "}
                <strong>{formatOrderDate(shippedAt, locale)}</strong>
              </span>
            )}
            {deliveredAt && (
              <span className="text-green-800">
                {isNl ? "Bezorgd op:" : "Delivered on:"}{" "}
                <strong>{formatOrderDate(deliveredAt, locale)}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {validUrl && (
        <a
          href={validUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-brown text-cream px-5 py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 shadow-sm"
        >
          <span>{isNl ? "Pakket Volgen" : "Track Package"}</span>
          <span>&rarr;</span>
        </a>
      )}
    </div>
  );
}
