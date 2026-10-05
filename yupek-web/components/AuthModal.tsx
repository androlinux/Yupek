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
    signInWithApple,
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
            alt="YUPEK Atelier"
            className="h-12 md:h-14 w-auto mx-auto mb-3 object-contain drop-shadow-sm"
          />
          <p className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
            {t.auth.atelierTag}
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
              ? t.auth.enterAtelierBtn
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

        {/* OAuth Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="flex items-center justify-center gap-2 border border-brown/20 bg-white/70 py-2 px-3 text-xs font-medium tracking-wider text-brown transition-all hover:bg-white shadow-sm"
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={signInWithApple}
            className="flex items-center justify-center gap-2 border border-brown/20 bg-brown text-cream py-2 px-3 text-xs font-medium tracking-wider transition-all hover:bg-black shadow-sm"
          >
            <svg className="h-3.5 w-3.5 fill-current shrink-0" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.3-9.61-11.49-20.73-15.56-33.36-4.08-12.63-6.12-24.71-6.12-36.23 0-14.37 3.58-26.4 10.74-36.09 7.16-9.69 16.29-14.65 27.38-14.88 4.7 0 10.02 1.25 15.98 3.76 5.96 2.5 9.77 3.82 11.43 3.94 1.86-.23 5.78-1.57 11.75-4.04 5.97-2.47 11.19-3.59 15.66-3.35 11.66.72 21.06 5.09 28.2 13.12-10.23 6.18-15.24 14.86-15.02 26.04.22 8.78 3.52 16.14 9.9 22.09 6.38 5.95 14.07 9.4 23.07 10.36-2.17 6.4-4.83 13.04-7.98 19.92zM119.22 31.84c0-7.39 2.67-14.38 8.01-20.97 5.34-6.59 11.94-10.6 19.8-12.03.22 1.44.33 2.76.33 3.96 0 7.39-2.73 14.43-8.19 21.12-5.46 6.69-12.18 10.64-20.16 11.86-.11-1.32-.17-2.64-.17-3.94z" />
            </svg>
            <span>Apple</span>
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
              ? "Hulp nodig met uw atelieraccount? Contacteer Concierge &rarr;"
              : "Need assistance with your account? Contact Concierge &rarr;"}
          </Link>
        </div>
      </div>
    </div>
  );
}
