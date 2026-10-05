"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "./AuthContext";
import { useLanguage } from "./LanguageContext";
import Icon from "./ui/Icon";

export default function AuthModal() {
  const {
    authModalOpen,
    setAuthModalOpen,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const { t, locale } = useLanguage();

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<"google" | null>(null);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && authModalOpen) {
        setAuthModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authModalOpen, setAuthModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setOauthError(null);
    setLoading(true);

    if (tab === "signin") {
      const res = await signInWithEmail(email, password);
      setLoading(false);
      if (!res.success) {
        setError(
          res.error ||
            (locale === "nl"
              ? "Kan niet inloggen. Controleer uw e-mailadres en wachtwoord."
              : "Unable to sign in. Please verify your credentials.")
        );
      }
    } else {
      const res = await signUpWithEmail(email, password, name, phone);
      setLoading(false);
      if (!res.success) {
        setError(
          res.error ||
            (locale === "nl"
              ? "Registratiefout. Controleer uw gegevens of probeer een ander e-mailadres."
              : "Registration error. Please check your details.")
        );
      } else {
        setSuccessMsg(
          locale === "nl" ? "Account succesvol aangemaakt!" : "Account created successfully!"
        );
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthError(null);
    setOauthLoading("google");
    const res = await signInWithGoogle();
    setOauthLoading(null);
    if (!res.success) {
      if (res.error?.includes("provider is not enabled") || res.error?.includes("Unsupported provider")) {
        setOauthError(
          locale === "nl"
            ? "Google Inloggen configuratie: Schakel Google Provider in via uw Supabase dashboard met uw Google Cloud Client ID."
            : "Google Sign-In setup: Please enable Google Provider in your Supabase Dashboard with your Google Cloud Client ID."
        );
      } else {
        setOauthError(res.error || "Google Sign-In failed.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-brown/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setAuthModalOpen(false)}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden bg-cream p-6 shadow-2xl transition-all duration-300 sm:p-8 border border-brown/15">
        <button
          onClick={() => setAuthModalOpen(false)}
          className="absolute right-5 top-5 p-1 text-brown/60 hover:text-brown transition-colors"
          aria-label={t.common.close}
        >
          <Icon name="close" className="h-5 w-5" />
        </button>

        <div className="text-center">
          <img
            src="/images/logo.png"
            alt="YUPEK"
            className="h-12 md:h-14 w-auto mx-auto mb-3 object-contain drop-shadow-sm"
          />
          <p className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
            {t.auth.brandTag}
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl tracking-wide text-brown mt-1">
            {tab === "signin" ? t.auth.clientAccessTitle : t.auth.createAccountTitle}
          </h2>
          <p className="mt-2 text-xs text-brown/70 max-w-xs mx-auto leading-relaxed">
            {t.auth.subtitle}
          </p>
        </div>

        {/* Tab switch */}
        <div className="mt-6 mb-4 grid grid-cols-2 border border-brown/20 p-1 bg-sand/20 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={`py-1.5 font-medium tracking-wider uppercase text-[11px] transition-colors ${
              tab === "signin" ? "bg-brown text-cream shadow-sm" : "text-brown/70 hover:text-brown"
            }`}
          >
            {t.auth.signInTab}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
            }}
            className={`py-1.5 font-medium tracking-wider uppercase text-[11px] transition-colors ${
              tab === "signup" ? "bg-brown text-cream shadow-sm" : "text-brown/70 hover:text-brown"
            }`}
          >
            {t.auth.registerTab}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === "signup" && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                  {t.auth.fullNameLabel}
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full border border-brown/30 bg-white/80 px-3 py-2 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                  {locale === "nl" ? "Telefoonnummer (Optioneel)" : "Phone Number (Optional)"}
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+31 6 1234 5678"
                  className="w-full border border-brown/30 bg-white/80 px-3 py-2 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
              {t.auth.emailLabel}
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@domain.com"
              className="w-full border border-brown/30 bg-white/80 px-3 py-2 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-widest text-brown/70 font-semibold">
                {t.auth.passwordLabel}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] uppercase tracking-wider text-burgundy hover:underline font-medium"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full border border-brown/30 bg-white/80 px-3 py-2 text-xs text-brown placeholder-brown/40 focus:border-brown focus:outline-none font-mono"
            />
          </div>

          {error && (
            <p className="text-[11px] text-burgundy bg-burgundy/10 p-2.5 border border-burgundy/20">
              {error}
            </p>
          )}

          {successMsg && (
            <p className="text-[11px] text-green-800 bg-green-50 p-2.5 border border-green-200">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brown py-2.5 text-xs uppercase tracking-widest text-cream transition-colors hover:bg-black disabled:opacity-50 font-medium shadow-sm"
          >
            {loading
              ? t.auth.authenticating
              : tab === "signin"
              ? t.auth.enterStoreBtn
              : t.auth.createProfileBtn}
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brown/15" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-brown/50">
            <span className="bg-cream px-2">
              {locale === "nl" ? "Of meld u aan via" : "Or connect via"}
            </span>
          </div>
        </div>

        {oauthError && (
          <div className="mb-3 bg-burgundy/10 border border-burgundy/30 text-burgundy p-2.5 text-xs leading-relaxed text-left flex items-start gap-2">
            <span className="font-bold text-sm shrink-0">!</span>
            <span className="text-[11px]">{oauthError}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={oauthLoading !== null}
            className="w-full flex items-center justify-center gap-2.5 border border-brown/20 bg-white/80 py-2.5 px-4 text-xs font-medium tracking-wider text-brown transition-all hover:bg-white shadow-sm disabled:opacity-60"
          >
            {oauthLoading === "google" ? (
              <span className="h-3.5 w-3.5 border-2 border-brown/30 border-t-brown rounded-full animate-spin inline-block" />
            ) : (
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span>{locale === "nl" ? "Doorgaan met Google" : "Continue with Google"}</span>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-5 border-t border-brown/15 pt-3 text-center">
          <Link
            href="/contact"
            onClick={() => setAuthModalOpen(false)}
            className="text-[11px] text-brown/60 hover:text-burgundy hover:underline"
          >
            {locale === "nl"
              ? "Hulp nodig met uw account? Contacteer Concierge &rarr;"
              : "Need assistance with your account? Contact Concierge &rarr;"}
          </Link>
        </div>
      </div>
    </div>
  );
}
