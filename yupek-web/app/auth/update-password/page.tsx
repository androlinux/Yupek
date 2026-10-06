"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";

export default function UpdatePasswordPage() {
  const { setAuthModalOpen, setAuthModalTab } = useAuth();
  const { locale } = useLanguage();

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if a recovery session is active
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        // Also listen for password recovery event from hash fragment
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || session) {
            setHasSession(true);
          }
        });
        setTimeout(() => {
          setHasSession((prev) => (prev === null ? false : prev));
        }, 1200);

        return () => subscription.unsubscribe();
      }
    }

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg(
        locale === "nl"
          ? "Wachtwoord moet minimaal 6 tekens bevatten."
          : "Password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(
        locale === "nl"
          ? "Wachtwoorden komen niet overeen."
          : "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMsg(error.message || "Failed to update password.");
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
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
            {locale === "nl" ? "Beveiliging" : "Security"}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl text-brown mt-1">
            {locale === "nl" ? "Nieuw Wachtwoord Instellen" : "Set New Password"}
          </h1>
          <p className="mt-2 text-xs text-brown/70 leading-relaxed">
            {locale === "nl"
              ? "Kies een nieuw veilig wachtwoord voor uw YUPEK account."
              : "Choose a new secure password for your private YUPEK account."}
          </p>
        </div>

        {hasSession === null ? (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brown/30 border-t-brown" />
            <p className="mt-3 text-xs tracking-widest text-brown/60 uppercase">
              {locale === "nl" ? "Sessie verifiëren..." : "Verifying recovery session..."}
            </p>
          </div>
        ) : !hasSession && !success ? (
          <div className="mt-6 text-center space-y-4">
            <div role="alert" className="bg-sand/30 border border-brown/20 p-4">
              <p className="text-xs text-brown leading-relaxed font-medium">
                {locale === "nl"
                  ? "Herstelsessie verlopen of ongeldig. Vraag een nieuwe herstellink aan."
                  : "Your password recovery session has expired or is invalid. Please request a new reset link."}
              </p>
            </div>
            <Link
              href="/auth/forgot-password"
              className="btn btn-dark inline-block text-xs"
            >
              {locale === "nl" ? "Nieuwe Link Aanvragen" : "Request New Link"}
            </Link>
          </div>
        ) : success ? (
          <div className="mt-6 text-center space-y-4">
            <div role="status" className="bg-green-50 border border-green-200 p-4">
              <p className="text-xs text-green-900 font-medium">
                {locale === "nl"
                  ? "Uw wachtwoord is succesvol bijgewerkt."
                  : "Your password has been updated."}
              </p>
            </div>
            <button
              onClick={() => {
                setAuthModalTab("signin");
                setAuthModalOpen(true);
              }}
              className="w-full bg-brown py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium shadow-sm"
            >
              {locale === "nl" ? "INLOGGEN" : "SIGN IN"}
            </button>
            <div className="pt-2">
              <Link
                href="/shop"
                className="text-xs text-brown/65 hover:text-burgundy hover:underline tracking-wider"
              >
                &larr; {locale === "nl" ? "Naar Collectie" : "Return to Shop"}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {errorMsg && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="update-password"
                  className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold"
                >
                  {locale === "nl" ? "Nieuw Wachtwoord" : "New Password"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] uppercase tracking-wider text-burgundy hover:underline"
                >
                  {showPassword ? (locale === "nl" ? "Verbergen" : "Hide") : (locale === "nl" ? "Tonen" : "Show")}
                </button>
              </div>
              <input
                id="update-password"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="update-confirm-password"
                className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
              >
                {locale === "nl" ? "Bevestig Wachtwoord" : "Confirm Password"}
              </label>
              <input
                id="update-confirm-password"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brown py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium disabled:opacity-50 shadow-sm"
            >
              {loading
                ? (locale === "nl" ? "Bijwerken..." : "Updating...")
                : (locale === "nl" ? "WACHTWOORD BIJWERKEN" : "UPDATE PASSWORD")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
