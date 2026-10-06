"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getBaseOrigin } from "@/lib/authEnv";
import { useLanguage } from "@/components/LanguageContext";

export default function ForgotPasswordPage() {
  const { locale } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);

    try {
      const baseOrigin = typeof window !== "undefined" ? window.location.origin : getBaseOrigin();
      const redirectTo = `${baseOrigin}/auth/update-password`;

      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      });
    } catch {
      // Intentionally suppress error to avoid account enumeration
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="wrap py-20 md:py-28">
      <div className="mx-auto max-w-md border border-brown/20 bg-cream p-8 sm:p-10 shadow-xl">
        <div className="text-center">
          <Image
            src="/images/logo.png"
            alt="YUPEK"
            width={160}
            height={50}
            className="h-11 w-auto mx-auto mb-2.5 object-contain drop-shadow-sm"
          />
          <span className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
            {locale === "nl" ? "Account Herstel" : "Account Recovery"}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-brown mt-1">
            {locale === "nl" ? "Wachtwoord Vergeten" : "Forgot Password"}
          </h1>
          <p className="mt-2 text-xs text-brown/70 leading-relaxed">
            {locale === "nl"
              ? "Voer uw geregistreerde e-mailadres in om een beveiligde herstellink te ontvangen."
              : "Enter your registered email address to receive a secure password reset link."}
          </p>
        </div>

        {submitted ? (
          <div className="mt-6 space-y-4">
            <div role="status" className="bg-sand/30 border border-brown/20 p-4 text-center">
              <p className="text-xs text-brown leading-relaxed font-medium">
                {locale === "nl"
                  ? "Als er een account bestaat voor dit e-mailadres, hebben we een herstellink verzonden."
                  : "If an account exists for this email, we sent a password reset link."}
              </p>
              <p className="mt-2 text-[11px] text-brown/60">
                {locale === "nl"
                  ? "Controleer uw inbox en spammap."
                  : "Please check your inbox and spam folder."}
              </p>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/account"
                className="text-xs uppercase tracking-widest text-brown/80 hover:text-burgundy hover:underline"
              >
                &larr; {locale === "nl" ? "Terug naar Inloggen" : "Back to Sign In"}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
              >
                {locale === "nl" ? "E-mailadres" : "Email Address"}
              </label>
              <input
                id="forgot-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@domain.com"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brown py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium disabled:opacity-50 shadow-sm"
            >
              {loading
                ? (locale === "nl" ? "Verzenden..." : "Sending...")
                : (locale === "nl" ? "HERSTELLINK VERZENDEN" : "SEND RESET LINK")}
            </button>

            <div className="text-center pt-3 border-t border-brown/10">
              <Link
                href="/account"
                className="text-[11px] uppercase tracking-wider text-brown/65 hover:text-burgundy hover:underline"
              >
                &larr; {locale === "nl" ? "Terug naar Inloggen" : "Back to Sign In"}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
