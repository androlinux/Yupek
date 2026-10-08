"use client";

import { useLanguage } from "@/components/LanguageContext";
import { getOrderTimelineSteps, TimelineStep } from "@/lib/orderStatus";
import Icon from "@/components/ui/Icon";
import Link from "next/link";

interface OrderStatusTimelineProps {
  order: {
    id: string;
    payment_status: string;
    fulfillment_status: string;
    created_at?: string | null;
    paid_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
  };
}

export default function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
  const { locale } = useLanguage();
  const timeline = getOrderTimelineSteps(order, locale);

  // If order is in a terminal special state (cancelled, failed, refunded)
  if (timeline.isSpecialState) {
    const isCancelled = timeline.specialStateType === "cancelled";
    const isFailed = timeline.specialStateType === "failed";
    const isRefunded = timeline.specialStateType === "refunded";

    return (
      <div className="border border-brown/15 bg-cream p-5 md:p-6 shadow-sm">
        <h3 className="font-serif text-lg text-brown border-b border-brown/10 pb-3">
          {locale === "nl" ? "Bestelstatus" : "Order Status"}
        </h3>

        <div
          className={`mt-4 p-4 border rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isCancelled
              ? "bg-stone-50 border-stone-200 text-stone-800"
              : isFailed
              ? "bg-red-50/80 border-red-200 text-red-900"
              : "bg-amber-50/80 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`rounded-full p-2 shrink-0 border ${
                isCancelled
                  ? "bg-stone-100 border-stone-300 text-stone-600"
                  : isFailed
                  ? "bg-red-100 border-red-300 text-red-700"
                  : "bg-amber-100 border-amber-300 text-amber-700"
              }`}
            >
              <Icon
                name={isCancelled ? "x" : isFailed ? "alert-circle" : "rotate-ccw"}
                className="h-4 w-4"
              />
            </div>
            <div>
              <p className="font-semibold text-xs tracking-wider uppercase">
                {isCancelled
                  ? locale === "nl"
                    ? "Bestelling Geannuleerd"
                    : "Order Cancelled"
                  : isFailed
                  ? locale === "nl"
                    ? "Betaling Mislukt"
                    : "Payment Failed"
                  : locale === "nl"
                  ? "Bestelling Terugbetaald"
                  : "Order Refunded"}
              </p>
              <p className="mt-1 text-xs text-brown/70 leading-relaxed">
                {timeline.specialStateMessage}
              </p>
            </div>
          </div>

          {isFailed && (
            <Link
              href={`/checkout?retry=${encodeURIComponent(order.id)}`}
              className="btn btn-dark text-xs uppercase tracking-wider py-2 px-4 shrink-0 text-center"
            >
              {locale === "nl" ? "Betaling Opnieuw Proberen" : "Retry Payment"}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-brown/15 bg-cream p-5 md:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brown/10 pb-3 gap-2">
        <h3 className="font-serif text-lg text-brown">
          {locale === "nl" ? "Voortgang van uw bestelling" : "Order Progress"}
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-brown/60">
          {order.fulfillment_status === "delivered"
            ? locale === "nl"
              ? "Afgeleverd"
              : "Completed"
            : locale === "nl"
            ? "In Behandeling"
            : "In Progress"}
        </span>
      </div>

      {/* Responsive timeline */}
      <div className="mt-6">
        {/* Desktop / Tablet Horizontal Timeline */}
        <div className="hidden md:grid grid-cols-5 gap-2 relative">
          {timeline.steps.map((step, idx) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";

            return (
              <div key={step.key} className="relative flex flex-col items-center text-center">
                {/* Horizontal connector line */}
                {idx < timeline.steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 ${
                      isCompleted ? "bg-burgundy/80" : "bg-brown/15"
                    }`}
                  />
                )}

                {/* Step indicator node: ✓, ●, ○ */}
                <div
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "bg-burgundy text-cream border-burgundy shadow-sm"
                      : isCurrent
                      ? "bg-gold text-brown border-brown ring-4 ring-gold/20"
                      : "bg-cream text-brown/40 border-brown/20"
                  }`}
                >
                  {isCompleted ? (
                    <Icon name="check" className="h-4 w-4 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <div className="h-2.5 w-2.5 rounded-full bg-brown" />
                  ) : (
                    <span className="h-2 w-2 rounded-full border border-brown/40" />
                  )}
                </div>

                {/* Step label & details */}
                <div className="mt-3 px-1 w-full">
                  <p
                    className={`text-xs uppercase tracking-wider font-semibold truncate ${
                      isCompleted || isCurrent ? "text-brown" : "text-brown/40"
                    }`}
                    title={step.label}
                  >
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-brown/60 leading-tight line-clamp-2">
                    {step.description}
                  </p>
                  {step.timestamp && (
                    <p className="mt-1 font-mono text-[10px] text-burgundy font-medium">
                      {step.timestamp}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical Timeline */}
        <div className="md:hidden space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-brown/15">
          {timeline.steps.map((step) => {
            const isCompleted = step.status === "completed";
            const isCurrent = step.status === "current";

            return (
              <div key={step.key} className="relative flex items-start gap-4">
                {/* Node icon positioned over connector line */}
                <div
                  className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                    isCompleted
                      ? "bg-burgundy text-cream border-burgundy shadow-sm"
                      : isCurrent
                      ? "bg-gold text-brown border-brown ring-4 ring-gold/20"
                      : "bg-cream text-brown/40 border-brown/20"
                  }`}
                >
                  {isCompleted ? (
                    <Icon name="check" className="h-3 w-3 stroke-[2.5]" />
                  ) : isCurrent ? (
                    <div className="h-2 w-2 rounded-full bg-brown" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full border border-brown/40" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p
                      className={`text-xs uppercase tracking-wider font-semibold ${
                        isCompleted || isCurrent ? "text-brown" : "text-brown/40"
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <span className="font-mono text-[10px] text-burgundy font-medium">
                        {step.timestamp}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-brown/65 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
