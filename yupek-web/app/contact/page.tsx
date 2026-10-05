"use client";
import { useState } from "react";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import ScrollReveal from "@/components/ScrollReveal";

export default function ContactPage() {
  const { config, submitContact } = useSiteConfig();
  const { t, locale } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "appointment",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const subjectText =
      form.subject === "appointment"
        ? t.contact.subjects.appointment
        : form.subject === "garments"
        ? t.contact.subjects.garments
        : form.subject === "order"
        ? t.contact.subjects.order
        : form.subject === "press"
        ? t.contact.subjects.press
        : t.contact.subjects.wholesale;

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
        subject: "appointment",
        message: "",
      });
    } else {
      setError(res.error || t.common.error);
    }
  };

  const cleanWaNumber = (config.whatsappNumber || "+31612345678").replace(/[^0-9]/g, "");

  return (
    <div className="py-16 md:py-24">
      <div className="wrap">
        <ScrollReveal>
          <div className="max-w-2xl">
            <span className="label tracking-[.3em] text-burgundy text-[10px]">{t.contact.tag}</span>
            <h1 className="h-display mt-2 text-4xl md:text-6xl text-brown">{t.contact.title}</h1>
            <p className="mt-4 text-sm leading-7 text-brown/75 font-light">
              {t.contact.subtitle}
            </p>
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
                      <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        {t.contact.fullName}
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Marcus Vance"
                        className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                          {t.contact.email}
                        </label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="client@domain.com"
                          className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                          {t.contact.phone}
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+31 6 ..."
                          className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        {t.contact.subject}
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full border border-brown/20 bg-white/80 px-3.5 py-2.5 text-xs text-brown focus:border-brown focus:outline-none"
                      >
                        <option value="appointment">{t.contact.subjects.appointment}</option>
                        <option value="garments">{t.contact.subjects.garments}</option>
                        <option value="order">{t.contact.subjects.order}</option>
                        <option value="press">{t.contact.subjects.press}</option>
                        <option value="wholesale">{t.contact.subjects.wholesale}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-brown/70 mb-1">
                        {t.contact.message}
                      </label>
                      <textarea
                        rows={5}
                        required
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

          {/* Right Column: Studio Information & Direct Channels */}
          <div className="lg:col-span-5 space-y-8">
            <ScrollReveal delayMs={200}>
              <div className="border border-brown/15 bg-cream p-8 space-y-6 shadow-sm">
                <div>
                  <h3 className="label tracking-[.25em] text-burgundy text-[10px]">{t.contact.headquartersTag}</h3>
                  <p className="font-serif text-2xl text-brown mt-1">{t.contact.studioTitle}</p>
                  <p className="mt-2 text-xs leading-relaxed text-brown/80">
                    {config.contactAddress || "Keizersgracht 482, 1016 GD Amsterdam, The Netherlands"}
                  </p>
                </div>

                <div className="border-t border-brown/10 pt-4 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50 block">{t.contact.conciergeEmail}</span>
                    <a
                      href={`mailto:${config.contactEmail || "concierge@yupek.eu"}`}
                      className="text-xs font-medium text-brown hover:text-burgundy transition-colors"
                    >
                      {config.contactEmail || "concierge@yupek.eu"}
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50 block">{t.contact.telephoneLine}</span>
                    <a
                      href={`tel:${(config.contactPhone || "+31208943320").replace(/[^0-9+]/g, "")}`}
                      className="text-xs font-medium text-brown hover:text-burgundy transition-colors"
                    >
                      {config.contactPhone || "+31 (0) 20 894 3320"}
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-brown/50 block">{t.contact.visitingHours}</span>
                    <p className="text-xs text-brown/80">
                      {config.contactHours && locale === "en"
                        ? config.contactHours
                        : locale === "nl"
                        ? "Maandag – Zaterdag: 10:00 – 19:00 CET"
                        : "Monday – Saturday: 10:00 – 19:00 CET"}
                    </p>
                  </div>
                </div>

                {/* Instant WhatsApp Concierge Button */}
                <div className="border-t border-brown/10 pt-4">
                  <a
                    href={`https://wa.me/${cleanWaNumber}?text=${encodeURIComponent(
                      config.whatsappMessage && locale === "en"
                        ? config.whatsappMessage
                        : locale === "nl"
                        ? "Hallo YUPEK, ik heb een vraag over uw collectie."
                        : "Hello YUPEK, I have an inquiry regarding your collection."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-3 bg-[#25D366] text-white py-3 px-4 text-xs font-medium tracking-wider hover:bg-[#20ba5a] transition-all shadow-sm"
                  >
                    <span>{t.contact.directWhatsAppBtn}</span>
                  </a>
                </div>
              </div>
            </ScrollReveal>

            {/* Optional Studio Video Tour */}
            {config.contactVideoUrl && (
              <ScrollReveal delayMs={300}>
                <div className="border border-brown/15 bg-black overflow-hidden shadow-sm">
                  <span className="text-[10px] uppercase tracking-widest text-sand p-3 block bg-brown">
                    {t.contact.studioTour}
                  </span>
                  <video
                    src={config.contactVideoUrl}
                    controls
                    className="w-full aspect-video object-cover"
                  />
                </div>
              </ScrollReveal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
