"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { site } from "@/config/site";
import { eur } from "@/lib/catalog";
import { useStore } from "@/components/Providers";
import { useCartTotal } from "@/components/CartDrawer";
import { useSiteConfig } from "@/components/ConfigContext";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import { getStripe } from "@/lib/stripeClient";
import { Elements } from "@stripe/react-stripe-js";
import StripePaymentForm from "@/components/checkout/StripePaymentForm";

const field =
  "w-full border-b border-brown/30 bg-transparent py-3 text-xs tracking-wider text-brown focus:border-brown focus:outline-none";

export default function Checkout() {
  const { lines } = useStore();
  const { getProduct, config } = useSiteConfig();
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Netherlands");
  const [phone, setPhone] = useState("");

  const [step, setStep] = useState<"details" | "payment">("details");
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);

  // Dynamic Shipping Methods State
  const [shippingOptions, setShippingOptions] = useState<Array<{
    id: string;
    label: string;
    description: string;
    amount_cents: number;
    amount_formatted: string;
    currency: string;
    is_free: boolean;
    estimated_days_min: number;
    estimated_days_max: number;
  }>>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string>("standard");
  const [calculatingShipping, setCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      const names = (user.name || "").split(" ");
      setFirstName(names[0] || "");
      setLastName(names.slice(1).join(" ") || "");
      if (user.address) {
        setStreet(user.address.street || "");
        setCity(user.address.city || "");
        setPostalCode(user.address.postalCode || "");
        setPhone(user.address.phone || "");
        if (user.address.country) setCountry(user.address.country);
      }
    }
  }, [user]);

  // Load stripe singleton promise
  useEffect(() => {
    setStripePromise(getStripe());
  }, []);

  // Live Shipping Calculation from Printify API / Backend
  const calculateLiveShipping = async (targetCountry: string) => {
    if (!lines.length) return;
    setCalculatingShipping(true);
    setShippingError(null);
    try {
      const orderItems = lines.map((l) => {
        const p = getProduct(l.slug);
        return {
          slug: l.slug,
          title: l.title || p?.name || l.slug,
          size: l.size,
          color: l.color,
          quantity: l.qty,
          variant_id: l.printifyVariantId,
          productId: l.productId || p?.id,
          supplierProductId: l.printifyProductId || p?.supplierProductId,
        };
      });

      const res = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            country: targetCountry,
            street,
            city,
            postalCode,
            firstName,
            lastName,
            email,
            phone,
          },
          items: orderItems,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.options) && data.options.length > 0) {
          setShippingOptions(data.options);
          setShippingError(null);
          if (!data.options.some((o: any) => o.id === selectedDelivery)) {
            setSelectedDelivery(data.options[0].id);
          }
        } else {
          setShippingOptions([]);
          setShippingError("Server temporarily unavailable. Please try again.");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setShippingOptions([]);
        setShippingError(errData.error || "Server temporarily unavailable. Please try again.");
      }
    } catch (err) {
      console.warn("[Live Shipping Rate Notice]", err);
      setShippingOptions([]);
      setShippingError("Server temporarily unavailable. Please try again.");
    } finally {
      setCalculatingShipping(false);
    }
  };

  useEffect(() => {
    if (lines.length > 0 && country) {
      calculateLiveShipping(country);
    }
  }, [country, lines.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const sub = useCartTotal(lines);
  const freeOver = config.freeShippingThreshold || site.freeShippingOver;
  const currentOption = shippingOptions.find((o) => o.id === selectedDelivery) || shippingOptions[0];
  const isFree = currentOption?.id === "standard" && sub >= freeOver;
  const ship = isFree ? 0 : (currentOption ? currentOption.amount_cents / 100 : 0);
  const total = sub + ship;

  if (!lines.length) {
    return (
      <div className="wrap py-28 text-center">
        <p className="font-serif text-3xl tracking-[.1em] text-brown">{t.cart.emptyTitle}</p>
        <p className="mt-2 text-xs text-brown/60">{t.cart.emptySubtitle}</p>
        <Link href="/shop" className="btn btn-dark mt-8">
          {t.cart.continueShopping}
        </Link>
      </div>
    );
  }

  // Handle server-side order initiation and PaymentIntent creation
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedStreet = street.trim();
    const trimmedCity = city.trim();
    const trimmedPostal = postalCode.trim();
    const trimmedCountry = country.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedFirst || !trimmedLast || !trimmedEmail || !trimmedStreet || !trimmedCity || !trimmedPostal || !trimmedCountry) {
      setErrorMessage(locale === "nl" ? "Vul alle verplichte velden in." : "Please fill in all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage(locale === "nl" ? "Voer een geldig e-mailadres in." : "Please enter a valid email address.");
      return;
    }

    if (!currentOption || shippingOptions.length === 0) {
      setErrorMessage(shippingError || "Server temporarily unavailable. Please try again.");
      return;
    }

    setLoadingIntent(true);

    const orderItems = lines.map((l) => {
      const p = getProduct(l.slug);
      return {
        slug: l.slug,
        title: l.title || p?.name || l.slug,
        size: l.size,
        color: l.color,
        quantity: l.qty,
        variant_id: l.printifyVariantId,
        productId: l.productId || p?.id,
        supplierProductId: l.printifyProductId || p?.supplierProductId,
        image: l.image || p?.images?.[0] || "",
      };
    });

    const payload = {
      order_id: orderId || undefined,
      user_id: user?.id || undefined,
      customer: {
        firstName: trimmedFirst,
        lastName: trimmedLast,
        email: trimmedEmail,
        phone: trimmedPhone,
        street: trimmedStreet,
        city: trimmedCity,
        postalCode: trimmedPostal,
        country: trimmedCountry,
      },
      items: orderItems,
      delivery: selectedDelivery,
      delivery_label: currentOption?.label,
      shipping_cents: Math.round(ship * 100),
    };

    try {
      const res = await fetch("/api/checkout/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize secure checkout.");
      }

      setOrderId(data.order_id);
      setClientSecret(data.client_secret);
      setStep("payment");
    } catch (err: any) {
      console.error("[Checkout Init Error]", err);
      setErrorMessage(err.message || "An error occurred while preparing payment.");
    } finally {
      setLoadingIntent(false);
    }
  };

  return (
    <div className="wrap grid gap-14 py-14 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-10">
        <div>
          <span className="label tracking-[.3em] text-burgundy text-[10px]">{t.checkout.tag}</span>
          <h1 className="h-display text-4xl md:text-5xl text-brown mt-1">{t.checkout.title}</h1>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded">
            {errorMessage}
          </div>
        )}

        {step === "details" ? (
          <form className="space-y-10" onSubmit={handleProceedToPayment}>
            {/* 01 • Contact */}
            <fieldset className="space-y-4">
              <legend className="label mb-3 text-brown">01 • {t.checkout.clientContact.toUpperCase()}</legend>
              <div>
                <label htmlFor="checkout-email" className="sr-only">
                  {t.checkout.emailPlaceholder}
                </label>
                <input
                  id="checkout-email"
                  name="email"
                  className={field}
                  type="email"
                  aria-label={t.checkout.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder={t.checkout.emailPlaceholder}
                  required
                />
              </div>
            </fieldset>

            {/* 02 • Shipping Address */}
            <fieldset className="grid gap-5 sm:grid-cols-2">
              <legend className="label mb-3 sm:col-span-2 text-brown">02 • {t.checkout.deliveryDestination.toUpperCase()}</legend>
              <div>
                <label htmlFor="checkout-first-name" className="sr-only">
                  {t.checkout.firstName}
                </label>
                <input
                  id="checkout-first-name"
                  name="firstName"
                  className={field}
                  aria-label={t.checkout.firstName}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  placeholder={t.checkout.firstName}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-last-name" className="sr-only">
                  {t.checkout.lastName}
                </label>
                <input
                  id="checkout-last-name"
                  name="lastName"
                  className={field}
                  aria-label={t.checkout.lastName}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  placeholder={t.checkout.lastName}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout-street" className="sr-only">
                  {t.checkout.street}
                </label>
                <input
                  id="checkout-street"
                  name="street"
                  className={field}
                  aria-label={t.checkout.street}
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  autoComplete="street-address"
                  placeholder={t.checkout.street}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-city" className="sr-only">
                  {t.checkout.city}
                </label>
                <input
                  id="checkout-city"
                  name="city"
                  className={field}
                  aria-label={t.checkout.city}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  autoComplete="address-level2"
                  placeholder={t.checkout.city}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkout-postal-code" className="sr-only">
                  {t.checkout.postalCode}
                </label>
                <input
                  id="checkout-postal-code"
                  name="postalCode"
                  className={field}
                  aria-label={t.checkout.postalCode}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  autoComplete="postal-code"
                  placeholder={t.checkout.postalCode}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout-phone" className="sr-only">
                  {t.checkout.phone}
                </label>
                <input
                  id="checkout-phone"
                  name="phone"
                  className={field}
                  aria-label={t.checkout.phone}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder={t.checkout.phone}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="checkout-country" className="sr-only">
                  {t.checkout.deliveryDestination}
                </label>
                <select
                  id="checkout-country"
                  name="country"
                  className={field}
                  aria-label={t.checkout.deliveryDestination}
                  autoComplete="country-name"
                  value={country}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setCountry(newCountry);
                    calculateLiveShipping(newCountry);
                  }}
                >
                  {site.countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </fieldset>

            {/* 03 • SHIPPING METHOD */}
            <fieldset className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <legend className="label text-brown">03 • {t.checkout.shippingMethod.toUpperCase()}</legend>
                {calculatingShipping && (
                  <span className="text-[10px] text-brown/50 animate-pulse tracking-wider">
                    {locale === "nl" ? "Tarieven berekenen..." : "Calculating rates..."}
                  </span>
                )}
              </div>

              {shippingError && shippingOptions.length === 0 && (
                <div className="p-3.5 text-xs bg-amber-50/75 border border-amber-300 text-amber-900 rounded-sm leading-relaxed flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>{shippingError}</span>
                  <button
                    type="button"
                    onClick={() => calculateLiveShipping(country)}
                    disabled={calculatingShipping}
                    className="underline font-semibold hover:text-brown self-start sm:self-auto text-[11px] uppercase tracking-wider"
                  >
                    {locale === "nl" ? "Opnieuw proberen" : "Try Again"}
                  </button>
                </div>
              )}

              {calculatingShipping && shippingOptions.length === 0 && (
                <div className="p-3.5 text-xs text-brown/60 border border-brown/15 bg-sand/10 animate-pulse rounded-sm">
                  {locale === "nl" ? "Live verzendtarieven ophalen..." : "Retrieving live delivery rates..."}
                </div>
              )}

              <div className="space-y-2">
                {shippingOptions.map((opt) => {
                  const isSelected = selectedDelivery === opt.id;
                  const optFree = opt.id === "standard" && sub >= freeOver;
                  const priceLabel = optFree ? (
                    <span className="text-green-800 font-semibold">{t.checkout.complimentary}</span>
                  ) : (
                    eur(opt.amount_cents / 100)
                  );

                  return (
                    <label
                      key={opt.id}
                      htmlFor={`delivery-${opt.id}`}
                      className={`flex cursor-pointer items-center justify-between border p-3.5 sm:p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-brown bg-sand/25 shadow-sm"
                          : "border-brown/20 bg-transparent hover:border-brown/40"
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          id={`delivery-${opt.id}`}
                          type="radio"
                          name="delivery"
                          aria-label={`${opt.label} - ${opt.description}`}
                          checked={isSelected}
                          onChange={() => setSelectedDelivery(opt.id)}
                          className="accent-brown shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="label block text-xs font-semibold text-brown">{opt.label}</span>
                          <span className="text-[11px] text-brown/65 block mt-0.5 break-words">{opt.description}</span>
                        </span>
                      </span>
                      <span className="text-xs font-medium shrink-0 ml-2 text-right whitespace-nowrap">
                        {priceLabel}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={loadingIntent || calculatingShipping || shippingOptions.length === 0}
              className="btn btn-dark w-full py-4 text-xs tracking-[.15em] sm:tracking-[.25em] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingIntent ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream border-t-transparent inline-block" />
                  <span>PREPARING SECURE CHECKOUT...</span>
                </>
              ) : (
                `PROCEED TO PAYMENT — ${eur(total)}`
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center pb-4 border-b border-brown/20">
              <div>
                <p className="text-xs font-bold text-brown uppercase tracking-wider">
                  Shipping To: {firstName} {lastName}
                </p>
                <p className="text-[11px] text-brown/70">
                  {street}, {postalCode} {city}, {country}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-xs text-burgundy underline tracking-wider uppercase font-semibold"
              >
                Edit Details
              </button>
            </div>

            {clientSecret && (
              <div>
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "flat",
                      variables: {
                        colorPrimary: "#6E1F2B",
                        colorBackground: "#FAF7F2",
                        colorText: "#2B1D14",
                        fontFamily: "Georgia, serif",
                        spacingUnit: "4px",
                        borderRadius: "2px",
                      },
                    },
                  }}
                >
                  <StripePaymentForm orderId={orderId || ""} totalEur={total} />
                </Elements>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order Summary Sidebar */}
      <aside className="h-fit bg-sand/15 border border-brown/15 p-6 lg:sticky lg:top-28 shadow-sm">
        <h2 className="label mb-5 border-b border-brown/10 pb-3 text-brown">{t.checkout.orderSummary}</h2>
        <ul className="space-y-4 text-xs divide-y divide-brown/10">
          {lines.map((l) => {
            const p = getProduct(l.slug);
            if (!p) return null;
            return (
              <li key={`${l.slug}${l.size}${l.color}`} className="pt-3 first:pt-0 flex justify-between gap-3">
                <div className="flex gap-3">
                  <div className="h-14 w-10 aspect-[5/7] bg-sand/30 overflow-hidden flex-shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      width={40}
                      height={56}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-brown uppercase">{p.name}</p>
                    <p className="text-[10px] text-brown/60">
                      {l.color} &bull; {t.product.sizePrompt} {l.size} &bull; {locale === "nl" ? "Aantal" : "Qty"} {l.qty}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-brown">{eur((l.price !== undefined ? l.price : p.price) * l.qty)}</span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 space-y-2 border-t border-brown/15 pt-5 text-xs text-brown/80">
          <div className="flex justify-between">
            <dt>{t.cart.subtotal}</dt>
            <dd className="font-medium">{eur(sub)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t.checkout.shippingMethod}{currentOption ? ` (${currentOption.label.split(" ")[0]})` : ""}</dt>
            <dd className="font-medium">
              {currentOption ? (ship > 0 ? eur(ship) : t.checkout.complimentary) : (calculatingShipping ? "..." : "—")}
            </dd>
          </div>
          <div className="label flex justify-between pt-4 border-t border-brown/10 text-sm font-semibold text-brown">
            <dt>{t.checkout.estimatedTotal}</dt>
            <dd>{eur(total)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
