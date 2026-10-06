"use client";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import Link from "next/link";
import { ReactNode } from "react";

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, setAuthModalOpen, setAuthModalTab } = useAuth();
  const { t, locale } = useLanguage();

  if (loading) {
    return (
      <div className="wrap py-28 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-brown/30 border-t-brown" />
        <p className="mt-4 text-xs tracking-widest uppercase text-brown/60">
          {locale === "nl" ? "Account laden..." : "Loading account..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="wrap py-20 md:py-28">
        <div className="mx-auto max-w-lg border border-brown/20 bg-cream p-8 sm:p-12 text-center shadow-xl">
          <span className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
            {t.account.portalTag}
          </span>
          <h1 className="h-display mt-2 text-3xl sm:text-4xl text-brown tracking-wide">
            {t.account.clientAccess}
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-brown/70 font-light">
            {locale === "nl"
              ? "U moet ingelogd zijn om uw persoonlijke account, bestellingen en adressen te bekijken."
              : "Please sign in to access your private client portal, orders, and saved addresses."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setAuthModalTab("signin");
                setAuthModalOpen(true);
              }}
              className="bg-brown text-cream px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-black transition-colors"
            >
              {t.auth.signInTab}
            </button>
            <button
              onClick={() => {
                setAuthModalTab("signup");
                setAuthModalOpen(true);
              }}
              className="border border-brown/30 text-brown px-6 py-3 text-xs uppercase tracking-widest font-medium hover:bg-sand/30 transition-colors"
            >
              {t.auth.registerTab}
            </button>
          </div>

          <div className="mt-8 border-t border-brown/15 pt-4">
            <Link
              href="/shop"
              className="text-xs text-brown/60 hover:text-burgundy hover:underline tracking-wider"
            >
              &larr; {t.cart.continueShopping}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
