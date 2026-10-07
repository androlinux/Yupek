"use client";
import { useState } from "react";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import ScrollReveal from "@/components/ScrollReveal";

const SUBJECT_OPTIONS = [
  { value: "product_info", labelEn: "Product Information", labelNl: "Productinformatie" },
  { value: "sizing_fit", labelEn: "Sizing & Fit", labelNl: "Maatadvies & Pasvorm" },
  { value: "order_support", labelEn: "Order Support", labelNl: "Ondersteuning bij Bestelling" },
  { value: "shipping_delivery", labelEn: "Shipping & Delivery", labelNl: "Verzending & Bezorging" },
  { value: "returns_exchanges", labelEn: "Returns & Exchanges", labelNl: "Retourneren & Ruilen" },
  { value: "wholesale", labelEn: "Wholesale / Collaboration", labelNl: "Groothandel / Samenwerking" },
  { value: "general_enquiry", labelEn: "General Enquiry", labelNl: "Algemene Vraag" },
] as const;

export default function ContactPage() {
  const { config, submitContact } = useSiteConfig();
  const { t, locale } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "product_info",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const selectedOption = SUBJECT_OPTIONS.find((opt) => opt.value === form.subject);
    const subjectText = selectedOption
      ? (locale === "nl" ? selectedOption.labelNl : selectedOption.labelEn)
      : "General Enquiry";

    const res = await submitContact({
      ...form,
      subject: subjectText,
    });
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setForm({
        name: "",
        email: "",
        phone: "",
        subject: "product_info",
        message: "",
      });
    } else {
      setError(res.error || t.common.error);
    }
  };



  return (
    <div className="py-16 md:py-24">
      <div className="wrap">
        <ScrollReveal>
          <div className="max-w-2xl">
            <span className="label tracking-[.3em] text-burgundy text-[10px]">
              {t.contact.tag || (locale === "nl" ? "DIGITALE KLANTENSERVICE" : "DIGITAL CLIENT CARE")}
            </span>
            <h1 className="h-display mt-2 text-4xl md:text-6xl text-brown">
              {t.contact.title || "CLIENT CONCIERGE"}
            </h1>
            <div className="mt-4 text-sm leading-7 text-brown/75 font-light space-y-2">
              <p>
                {locale === "nl"
                  ? "Of u nu een vraag heeft over maten, productdetails, een bestelling of internationale bezorging: ons cliënt conciërgeteam staat voor u klaar."
                  : "Whether you have a question about sizing, product details, an order, or international delivery, our client concierge team is here to assist."}
              </p>
              <p>
                {locale === "nl"
                  ? "Voor specifieke productvragen of stylingadvies kunnen klanten rechtstreeks contact met ons opnemen via e-mail of ons contactformulier hieronder."
                  : "For private product questions or styling enquiries, customers can contact us directly by email or our contact form below."}
              </p>
            </div>
          </div>
        </ScrollReveal>

        <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <ScrollReveal delayMs={100}>
              <div className="border border-brown/15 bg-sand/15 p-8 md:p-10 shadow-sm">
                <h2 className="font-serif text-2xl tracking-wide text-brown">{t.contact.formTitle}</h2>
                <p className="mt-1 text-xs text-brown/60">
                  {t.contact.formSubtitle}
                </p>

                {success ? (
                  <div className="mt-8 border border-green-300 bg-green-50 p-6 text-center text-green-900 animate-in fade-in">
                    <p className="font-serif text-xl">{t.contact.thankYouTitle}</p>
                    <p className="mt-2 text-xs leading-relaxed text-green-800">
                      {t.contact.thankYouDesc}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSuccess(false)}
                      className="mt-4 text-[10px] uppercase tracking-widest text-green-950 underline"
                    >
                      {t.contact.sendAnother}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        {t.contact.fullName}
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        aria-label={t.contact.fullName}
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Marcus Vance"
                        className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-email" className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                          {t.contact.email}
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          aria-label={t.contact.email}
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="client@domain.com"
                          className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-phone" className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                          {t.contact.phone}
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          aria-label={t.contact.phone}
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+31 6 ..."
                          className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-subject" className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        {t.contact.subject}
                      </label>
                      <select
                        id="contact-subject"
                        name="subject"
                        aria-label={t.contact.subject}
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                      >
                        {SUBJECT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {locale === "nl" ? opt.labelNl : opt.labelEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        {t.contact.message}
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={5}
                        required
                        aria-label={t.contact.message}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="..."
                        className="w-full border border-brown/20 bg-white/80 p-3.5 text-xs text-brown focus:border-brown focus:outline-none"
                      />
                    </div>

                    {error && (
                      <p className="text-xs text-burgundy bg-burgundy/10 p-2 border border-burgundy/20">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-brown py-3.5 text-xs uppercase tracking-widest text-cream hover:bg-black transition-colors disabled:opacity-50"
                    >
                      {loading ? t.contact.transmitting : t.contact.sendInquiryBtn}
                    </button>
                  </form>
                )}
              </div>
            </ScrollReveal>
          </div>

          {/* Right Column: Digital Client Concierge Card */}
          <div className="lg:col-span-5 space-y-8">
            <ScrollReveal delayMs={200}>
              <div className="border border-brown/15 bg-cream p-8 space-y-6 shadow-sm">
                <div>
                  <span className="label tracking-[.25em] text-burgundy text-[10px] block">
                    {locale === "nl" ? "DIGITALE KLANTENSERVICE" : "DIGITAL CLIENT CONCIERGE"}
                  </span>
                  <h2 className="font-serif text-2xl text-brown mt-1">
                    {t.contact.cardTitle || "YUPEK CLIENT CONCIERGE"}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-brown/80 font-light">
                    {locale === "nl"
                      ? "Ons cliënt conciërgeteam staat klaar om u te helpen met bestellingen, maten, productdetails, verzending en algemene vragen."
                      : "Our client concierge team is available to assist with orders, sizing, product details, shipping and general enquiries."}
                  </p>
                </div>

                <div className="border-t border-brown/10 pt-5 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50 block mb-1">
                      {t.contact.conciergeEmail || "EMAIL"}
                    </span>
                    <a
                      href={`mailto:${config.contactEmail || "daniyarov16@gmail.com"}`}
                      className="text-xs font-medium text-brown hover:text-burgundy transition-colors underline decoration-brown/30 underline-offset-4"
                    >
                      {config.contactEmail || "daniyarov16@gmail.com"}
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50 block mb-1">
                      {locale === "nl" ? "TELEFOON" : "TELEPHONE"}
                    </span>
                    <a
                      href={`tel:${(config.contactPhone || "+31644154126").replace(/\s+/g, "")}`}
                      className="text-xs font-medium text-brown hover:text-burgundy transition-colors"
                    >
                      {config.contactPhone || "+31644154126"}
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50 block mb-1">
                      {t.contact.visitingHours || "CUSTOMER CARE"}
                    </span>
                    <div className="text-xs text-brown/80 space-y-0.5">
                      <p>{locale === "nl" ? "Maandag – Zaterdag" : "Monday – Saturday"}</p>
                      <p className="font-medium text-brown">10:00 – 19:00 CET</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
