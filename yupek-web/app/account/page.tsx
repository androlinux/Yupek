"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import AuthGate from "@/components/account/AuthGate";
import AccountNav from "@/components/account/AccountNav";
import Icon from "@/components/ui/Icon";

function ProfileContent() {
  const { user, updateProfile } = useAuth();
  const { t, locale } = useLanguage();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);
    setSaving(true);

    const res = await updateProfile({
      firstName,
      lastName,
      phone,
    });

    setSaving(false);

    if (res.success) {
      setSuccessMsg(
        locale === "nl"
          ? "Profiel succesvol bijgewerkt."
          : "Profile updated successfully."
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(res.error || "Failed to update profile.");
    }
  };

  return (
    <div className="wrap py-10 md:py-16">
      <AccountNav />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Profile Edit Card */}
        <div className="border border-brown/15 bg-cream p-6 sm:p-8 shadow-sm">
          <div className="border-b border-brown/10 pb-4">
            <span className="label tracking-[.25em] text-burgundy text-[10px] uppercase font-semibold">
              {locale === "nl" ? "Persoonlijke Gegevens" : "Personal Details"}
            </span>
            <h2 className="font-serif text-2xl text-brown mt-1">
              {locale === "nl" ? "Mijn Profiel" : "Profile"}
            </h2>
            <p className="text-xs text-brown/65 mt-1 leading-relaxed">
              {locale === "nl"
                ? "Beheer uw naam, telefoonnummer en contactvoorkeuren voor YUPEK leveringen."
                : "Manage your name, contact phone number, and delivery preferences."}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-first-name"
                  className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
                >
                  {locale === "nl" ? "Voornaam" : "First Name"}
                </label>
                <input
                  id="profile-first-name"
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-last-name"
                  className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
                >
                  {locale === "nl" ? "Achternaam" : "Last Name"}
                </label>
                <input
                  id="profile-last-name"
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
              >
                {t.auth.emailLabel}
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full border border-brown/20 bg-sand/30 px-3.5 py-2.5 text-xs text-brown/70 cursor-not-allowed font-mono"
              />
              <p className="mt-1 text-[10px] text-brown/50">
                {locale === "nl"
                  ? "E-mailadres wordt beheerd via uw beveiligde inlogaccount."
                  : "Email address is managed through your secure account credentials."}
              </p>
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1"
              >
                {t.checkout.phone}
              </label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+31 6 1234 5678"
                className="w-full border border-brown/30 bg-white/90 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-brown px-6 py-3 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors font-medium disabled:opacity-50 shadow-sm"
              >
                {saving
                  ? (locale === "nl" ? "Opslaan..." : "Saving...")
                  : (locale === "nl" ? "WIJZIGINGEN OPSLAAN" : "SAVE CHANGES")}
              </button>
            </div>
          </form>
        </div>

        {/* Quick Links & Concierge */}
        <div className="space-y-6">
          <div className="border border-gold/40 bg-gold/10 p-6 shadow-sm">
            <span className="label tracking-[.3em] text-burgundy text-[10px] uppercase font-semibold">
              {t.account.conciergeTag}
            </span>
            <h3 className="font-serif text-xl text-brown mt-1">
              {t.account.conciergeTitle}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-brown/80">
              {t.account.conciergeDesc}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`https://wa.me/31612345678?text=${encodeURIComponent(
                  `Hello YUPEK! I am ${user?.name} (${user?.email}) requesting styling assistance.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-[#20ba5a] transition-colors shadow-sm"
              >
                <span>{t.account.whatsAppConciergeBtn}</span>
              </a>
              <Link
                href="/contact"
                className="text-center text-xs text-brown/70 hover:text-burgundy hover:underline py-1"
              >
                {locale === "nl" ? "Privé Afspraak Boeken" : "Book Private Appointment"} &rarr;
              </Link>
            </div>
          </div>

          <div className="border border-brown/15 bg-cream p-6 shadow-sm space-y-3 text-xs">
            <h4 className="font-serif text-base text-brown font-semibold">
              {locale === "nl" ? "Snelle Navigatie" : "Quick Actions"}
            </h4>
            <div className="divide-y divide-brown/10">
              <Link
                href="/account/orders"
                className="flex items-center justify-between py-2.5 text-brown/80 hover:text-burgundy tracking-wider"
              >
                <span>{locale === "nl" ? "Mijn Bestellingen Bekijken" : "View My Orders"}</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href="/account/addresses"
                className="flex items-center justify-between py-2.5 text-brown/80 hover:text-burgundy tracking-wider"
              >
                <span>{locale === "nl" ? "Afleveradressen Beheren" : "Manage Delivery Addresses"}</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href="/account/security"
                className="flex items-center justify-between py-2.5 text-brown/80 hover:text-burgundy tracking-wider"
              >
                <span>{locale === "nl" ? "Wachtwoord Wijzigen" : "Change Password"}</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGate>
      <ProfileContent />
    </AuthGate>
  );
}
