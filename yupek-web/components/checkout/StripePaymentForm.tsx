"use client";

import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";

interface StripePaymentFormProps {
  orderId: string;
  totalEur: number;
  onPaymentStart?: () => void;
  onPaymentError?: (error: string) => void;
  onChangePaymentMethod?: () => void;
}

export default function StripePaymentForm({
  orderId,
  totalEur,
  onPaymentStart,
  onPaymentError,
  onChangePaymentMethod,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "requires_action" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    onPaymentStart?.();

    try {
      const returnUrl = `${window.location.origin}/checkout/success?order_id=${encodeURIComponent(orderId)}`;

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (error) {
        // If requires_action or 3DS authentication was needed and is still continuing
        if (error.payment_intent?.status === "requires_action") {
          setPaymentStatus("requires_action");
          setIsProcessing(false);
          return;
        }

        if (error.payment_intent?.status === "processing") {
          setPaymentStatus("processing");
          setIsProcessing(false);
          return;
        }

        // Real payment failure (e.g. card declined, insufficient funds, expired, etc.)
        const msg = error.message || "Payment authorization failed. Please check your card details or try another method.";
        setPaymentStatus("failed");
        setErrorMessage(msg);
        onPaymentError?.(msg);
        setIsProcessing(false);
      }
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred during payment.";
      setPaymentStatus("failed");
      setErrorMessage(msg);
      onPaymentError?.(msg);
      setIsProcessing(false);
    }
  };

  const handleTryAgain = () => {
    setPaymentStatus("idle");
    setErrorMessage(null);
  };

  const handleChangeMethod = () => {
    setPaymentStatus("idle");
    setErrorMessage(null);
    onChangePaymentMethod?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Processing Indicator */}
      {paymentStatus === "processing" && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-amber-600 animate-ping inline-block" />
          <div>
            <p className="font-semibold">Your payment is being processed.</p>
            <p className="text-[11px] text-amber-800 mt-0.5">Please wait while Stripe confirms authorization with your bank.</p>
          </div>
        </div>
      )}

      {/* Payment Failed UI with explicit Try Again and Change Payment Method buttons */}
      {paymentStatus === "failed" && (
        <div className="p-5 bg-red-50 border border-red-300 rounded text-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-900 font-bold text-xs">
              ✕
            </span>
            <div>
              <p className="font-bold text-red-950 text-sm">Payment failed.</p>
              <p className="text-red-900 mt-1 leading-relaxed">{errorMessage}</p>
              <p className="text-red-800 mt-2 font-medium">
                Would you like to try again or choose another payment method?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-3 border-t border-red-200">
            <button
              type="button"
              onClick={handleTryAgain}
              className="px-4 py-2.5 bg-burgundy text-cream text-[11px] uppercase tracking-wider font-semibold rounded hover:bg-black transition-colors shadow-sm"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={handleChangeMethod}
              className="px-4 py-2.5 bg-white text-brown border border-brown/30 text-[11px] uppercase tracking-wider font-semibold rounded hover:bg-sand/30 transition-colors"
            >
              Change Payment Method
            </button>
          </div>
        </div>
      )}

      <div className="border border-gold/40 p-5 bg-sand/20 rounded-sm">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="btn btn-dark w-full py-4 text-xs tracking-[.25em] flex items-center justify-center gap-2"
      >
        {isProcessing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream border-t-transparent inline-block" />
            <span>AUTHORIZING PAYMENT...</span>
          </>
        ) : (
          `AUTHORIZE PAYMENT — €${totalEur.toFixed(2)}`
        )}
      </button>

      <p className="text-[10px] text-center text-brown/60 uppercase tracking-wider">
        Encrypted 256-Bit SSL Checkout &bull; Powered by Stripe
      </p>
    </form>
  );
}
