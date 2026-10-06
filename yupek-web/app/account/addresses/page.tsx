"use client";
import { useEffect, useState, useCallback } from "react";
import AuthGate from "@/components/account/AuthGate";
import AccountNav from "@/components/account/AccountNav";
import { useAuth } from "@/components/AuthContext";
import { useLanguage } from "@/components/LanguageContext";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";

interface AddressItem {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
}

function AddressesContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Netherlands");
  const [phone, setPhone] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/customer/addresses", { headers });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.addresses)) {
        setAddresses(data.addresses);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const resetForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFirstName(user?.firstName || "");
    setLastName(user?.lastName || "");
    setAddress1("");
    setAddress2("");
    setCity("");
    setPostalCode("");
    setCountry("Netherlands");
    setPhone(user?.phone || "");
    setIsDefault(addresses.length === 0);
  };

  const handleStartAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleStartEdit = (addr: AddressItem) => {
    setShowAddForm(false);
    setEditingId(addr.id);
    setFirstName(addr.first_name);
    setLastName(addr.last_name);
    setAddress1(addr.address1);
    setAddress2(addr.address2 || "");
    setCity(addr.city);
    setPostalCode(addr.postal_code);
    setCountry(addr.country || "Netherlands");
    setPhone(addr.phone || "");
    setIsDefault(addr.is_default);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const payload = {
        id: editingId || undefined,
        first_name: firstName,
        last_name: lastName,
        address1,
        address2,
        city,
        postal_code: postalCode,
        country,
        phone,
        is_default: isDefault,
      };

      const res = await fetch("/api/customer/addresses", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          type: "success",
          text: locale === "nl" ? "Adres succesvol opgeslagen." : "Address saved successfully.",
        });
        resetForm();
        await fetchAddresses();
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || "Failed to save address.",
        });
      }
    } catch {
      setStatusMsg({
        type: "error",
        text: "Network error saving address.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (addr: AddressItem) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/customer/addresses", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...addr,
          is_default: true,
        }),
      });

      if (res.ok) {
        await fetchAddresses();
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "nl" ? "Weet u zeker dat u dit adres wilt verwijderen?" : "Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/customer/addresses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        await fetchAddresses();
      }
    } catch {}
  };

  return (
    <div className="wrap py-10 md:py-16">
      <AccountNav />

      <div className="mt-8">
        <div className="flex items-center justify-between border-b border-brown/10 pb-4">
          <div>
            <span className="label tracking-[.25em] text-burgundy text-[10px] uppercase font-semibold">
              {locale === "nl" ? "Bezorglocaties" : "Delivery Book"}
            </span>
            <h2 className="font-serif text-2xl text-brown mt-1">
              {locale === "nl" ? "Mijn Adressen" : "Saved Addresses"}
            </h2>
          </div>
          {!showAddForm && !editingId && (
            <button
              onClick={handleStartAdd}
              className="bg-brown text-cream px-4 py-2 text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors"
            >
              + {locale === "nl" ? "Nieuw Adres" : "Add Address"}
            </button>
          )}
        </div>

        {statusMsg && (
          <div
            role={statusMsg.type === "error" ? "alert" : "status"}
            className={`mt-4 p-3 text-xs border ${
              statusMsg.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Add / Edit Form */}
        {(showAddForm || editingId) && (
          <div className="mt-6 border border-brown/20 bg-cream p-6 sm:p-8 shadow-md max-w-2xl">
            <h3 className="font-serif text-xl text-brown mb-4 border-b border-brown/10 pb-2">
              {editingId
                ? (locale === "nl" ? "Adres Bewerken" : "Edit Address")
                : (locale === "nl" ? "Nieuw Adres Toevoegen" : "Add New Address")}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addr-firstname" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {locale === "nl" ? "Voornaam" : "First Name"}
                  </label>
                  <input
                    id="addr-firstname"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="addr-lastname" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {locale === "nl" ? "Achternaam" : "Last Name"}
                  </label>
                  <input
                    id="addr-lastname"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="addr-address1" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                  {locale === "nl" ? "Straat en Huisnummer" : "Street Address"}
                </label>
                <input
                  id="addr-address1"
                  name="address1"
                  type="text"
                  required
                  autoComplete="address-line1"
                  placeholder="e.g. Herengracht 100"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="addr-address2" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                  {locale === "nl" ? "Appartement / Suite (Optioneel)" : "Apartment, suite, unit (optional)"}
                </label>
                <input
                  id="addr-address2"
                  name="address2"
                  type="text"
                  autoComplete="address-line2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addr-city" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {locale === "nl" ? "Stad" : "City"}
                  </label>
                  <input
                    id="addr-city"
                    name="city"
                    type="text"
                    required
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="addr-postalcode" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {locale === "nl" ? "Postcode" : "Postal Code"}
                  </label>
                  <input
                    id="addr-postalcode"
                    name="postalCode"
                    type="text"
                    required
                    autoComplete="postal-code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addr-country" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {locale === "nl" ? "Land" : "Country"}
                  </label>
                  <input
                    id="addr-country"
                    name="country"
                    type="text"
                    required
                    autoComplete="country-name"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="addr-phone" className="block text-[10px] uppercase tracking-widest text-brown/70 font-semibold mb-1">
                    {t.checkout.phone}
                  </label>
                  <input
                    id="addr-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-brown/30 bg-white/90 px-3 py-2 text-xs text-brown focus:border-brown focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="addr-default"
                  name="isDefault"
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-brown/30 text-brown focus:ring-brown"
                />
                <label htmlFor="addr-default" className="text-xs text-brown/80 font-medium cursor-pointer">
                  {locale === "nl" ? "Instellen als standaard afleveradres" : "Set as default shipping address"}
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-brown text-cream px-6 py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-black transition-colors disabled:opacity-50"
                >
                  {saving ? (locale === "nl" ? "Opslaan..." : "Saving...") : (locale === "nl" ? "Adres Opslaan" : "Save Address")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-brown/30 text-brown px-4 py-2.5 text-xs uppercase tracking-wider hover:bg-sand/30"
                >
                  {t.account.cancelBtn}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Addresses List */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brown/30 border-t-brown" />
          </div>
        ) : addresses.length === 0 && !showAddForm ? (
          <div className="mt-8 py-16 text-center border border-dashed border-brown/20 bg-sand/10 p-8">
            <p className="font-serif text-2xl text-brown">
              {locale === "nl" ? "Geen adressen opgeslagen" : "No saved addresses"}
            </p>
            <p className="mt-2 text-xs text-brown/60">
              {locale === "nl"
                ? "Voeg een standaard afleveradres toe voor een snelle, naadloze checkout."
                : "Add a shipping address for rapid one-touch checkout."}
            </p>
            <button
              onClick={handleStartAdd}
              className="btn btn-dark mt-6 inline-block"
            >
              + {locale === "nl" ? "Nieuw Adres Toevoegen" : "Add Address"}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={`border p-6 shadow-sm relative flex flex-col justify-between ${
                  addr.is_default
                    ? "border-gold/60 bg-gold/5"
                    : "border-brown/15 bg-cream"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm text-brown">
                      {addr.first_name} {addr.last_name}
                    </span>
                    {addr.is_default ? (
                      <span className="rounded-full bg-gold/30 border border-gold/60 text-brown px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold">
                        {locale === "nl" ? "Standaard" : "Default"}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(addr)}
                        className="text-[10px] uppercase tracking-wider text-brown/60 hover:text-burgundy hover:underline"
                      >
                        {locale === "nl" ? "Maak standaard" : "Set as default"}
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-brown/80 space-y-1 leading-relaxed">
                    <p>{addr.address1}</p>
                    {addr.address2 && <p>{addr.address2}</p>}
                    <p>
                      {addr.postal_code} {addr.city}
                    </p>
                    <p>{addr.country}</p>
                    {addr.phone && (
                      <p className="pt-2 text-brown/60 font-mono text-[11px]">
                        Tel: {addr.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-brown/10 pt-3 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleStartEdit(addr)}
                    className="text-brown/70 hover:text-brown uppercase tracking-wider text-[11px] font-medium"
                  >
                    {locale === "nl" ? "Bewerken" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="text-burgundy/80 hover:text-burgundy uppercase tracking-wider text-[11px]"
                  >
                    {locale === "nl" ? "Verwijderen" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddressesPage() {
  return (
    <AuthGate>
      <AddressesContent />
    </AuthGate>
  );
}
