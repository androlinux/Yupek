"use client";
import { useState } from "react";
import AuthGate from "@/components/account/AuthGate";
import AccountNav from "@/components/account/AccountNav";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";

function SecurityContent() {
  const { user } = useAuth();
  const { locale } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user?.email) {
      setErrorMsg("User email not found");
      return;
    }

    if (!currentPassword) {
      setErrorMsg(locale === "nl" ? "Vul uw huidige wachtwoord in." : "Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(
        locale === "nl"
          ? "Nieuw wachtwoord moet minimaal 6 tekens bevatten."
          : "New password must be at least 6 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(
        locale === "nl"
          ? "Nieuwe wachtwoorden komen niet overeen."
          : "New passwords do not match."
      );
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg(
        locale === "nl"
          ? "Nieuw wachtwoord mag niet hetzelfde zijn als het huidige wachtwoord."
          : "New password cannot be the same as the current password."
      );
      return;
    }

    setSaving(true);

    try {
      // 1. Verify current password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInErr) {
        setErrorMsg(
          locale === "nl"
            ? "Huidig wachtwoord is onjuist."
            : "Current password is incorrect. Please verify."
        );
        setSaving(false);
        return;
      }

      // 2. Update user with new password using Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setErrorMsg(updateErr.message || "Failed to update password.");
        setSaving(false);
        return;
      }

      setSuccessMsg(
        locale === "nl"
          ? "Wachtwoord succesvol bijgewerkt."
          : "Password updated successfully."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wrap py-10 md:py-16">
      <AccountNav />

      <div className="mt-8 max-w-xl">
        <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm">
          <div className="border-b border-brown/10 pb-4">
            <span className="label tracking-[.25em] text-burgundy text-[10px] uppercase font-semibold">
              {locale === "nl" ? "Accountbeveiliging" : "Security & Credentials"}
            </span>
            <h2 className="font-serif text-2xl text-brown mt-1">
              {locale === "nl" ? "Wachtwoord Wijzigen" : "Change Password"}
            </h2>
            <p className="text-xs text-brown/65 mt-1 leading-relaxed">
              {locale === "nl"
                ? "Werk uw wachtwoord bij om uw account en bestellingen te beschermen."
                : "Update your private account password to safeguard your orders and details."}
            </p>
          </div>

          {successMsg && (
            <div role="status" className="mt-4 bg-green-50 p-3 text-xs text-green-800 border border-green-200 flex items-center gap-2">
              <Icon name="check" className="h-4 w-4 text-green-700 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="mt-4 bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-center gap-2">
              <span className="font-bold text-sm shrink-0">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="security-current-password"
                  className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold"
                >
                  {locale === "nl" ? "Huidig Wachtwoord" : "Current Password"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="text-[10px] uppercase tracking-wider text-burgundy hover:underline"
                >
                  {showCurrent ? (locale === "nl" ? "Verbergen" : "Hide") : (locale === "nl" ? "Tonen" : "Show")}
                </button>
              </div>
              <input
                id="security-current-password"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="security-new-password"
                  className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold"
                >
                  {locale === "nl" ? "Nieuw Wachtwoord" : "New Password"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="text-[10px] uppercase tracking-wider text-burgundy hover:underline"
                >
                  {showNew ? (locale === "nl" ? "Verbergen" : "Hide") : (locale === "nl" ? "Tonen" : "Show")}
                </button>
              </div>
              <input
                id="security-new-password"
                name="newPassword"
                type={showNew ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="security-confirm-password"
                className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
              >
                {locale === "nl" ? "Bevestig Nieuw Wachtwoord" : "Confirm New Password"}
              </label>
              <input
                id="security-confirm-password"
                name="confirmNewPassword"
                type={showNew ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-brown px-6 py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium disabled:opacity-50 shadow-sm"
              >
                {saving
                  ? (locale === "nl" ? "Bezig met bijwerken..." : "Updating...")
                  : (locale === "nl" ? "WACHTWOORD BIJWERKEN" : "UPDATE PASSWORD")}
              </button>
            </div>
          </form>
        </div>

        {/* Customer Privacy & Account Deletion (GDPR Art. 17) */}
        <div className="mt-8 border border-brown/15 bg-white p-6 sm:p-8 shadow-sm">
          <div className="border-b border-brown/10 pb-3">
            <span className="label tracking-[.25em] text-gold text-[10px] uppercase font-semibold">
              {locale === "nl" ? "AVG / GDPR PRIVACYRECHTEN" : "GDPR PRIVACY & DATA RIGHTS"}
            </span>
            <h3 className="font-serif text-xl text-brown mt-1">
              {locale === "nl" ? "Accountverwijdering & Gegevenswissing" : "Account Deletion & Data Erasure"}
            </h3>
          </div>
          <div className="mt-4 text-xs text-brown/75 space-y-3 leading-relaxed">
            <p>
              {locale === "nl"
                ? "Onder artikel 17 van de AVG (recht op vergetelheid) kunt u te allen tijde verzoeken om volledige verwijdering van uw klantaccount, profielgegevens, adressen en verlanglijst."
                : "Under Article 17 of the GDPR (Right to Erasure), you may request complete deletion of your customer account, profile information, saved addresses, and wishlist."}
            </p>
            <p className="bg-sand/20 border-l-2 border-brown/30 p-3 text-[11px] text-brown/70 font-mono">
              {locale === "nl"
                ? "Wettelijke bewaartermijn: Fiscale bestel- en factuurgegevens worden bewaard conform de wettelijke fiscale bewaarplicht (7 jaar, Boek 7 BW / Belastingdienst)."
                : "Statutory fiscal notice: Invoices and transactional order history are retained in accordance with mandatory fiscal accounting laws (7 years under Dutch tax regulations)."}
            </p>
            <p>
              {locale === "nl"
                ? "Om uw account en persoonsgegevens te laten wissen, kunt u een verzoek sturen naar onze privacy conciërge via "
                : "To initiate an account deletion and personal data erasure request, contact our privacy concierge at "}
              <a href="mailto:daniyarov16@gmail.com?subject=Account%20Deletion%20Request" className="font-mono underline text-brown hover:text-gold">
                [PRIVACY CONTACT EMAIL — currently daniyarov16@gmail.com]
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <AuthGate>
      <SecurityContent />
    </AuthGate>
  );
}
