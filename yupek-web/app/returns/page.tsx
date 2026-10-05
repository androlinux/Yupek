"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { useSiteConfig } from "@/components/ConfigContext";
import ScrollReveal from "@/components/ScrollReveal";
import { Divider } from "@/components/ui/Pattern";
import Icon from "@/components/ui/Icon";

export default function ReturnsPage() {
  const { t, locale } = useLanguage();
  const { config } = useSiteConfig();
  const r = t.returnsPage;

  const cleanPhone = (config.whatsappNumber || "+31644154126").replace(/[^0-9]/g, "");
  const returnEmail = config.contactEmail || "daniyarow16@gmail.com";

  return (
    <div className="bg-cream min-h-screen text-brown selection:bg-gold selection:text-white">
      {/* Luxury Header */}
      <header className="relative bg-brown py-24 text-center text-cream md:py-36 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C49A45_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-brown/80 via-transparent to-brown" />
        <div className="wrap relative z-10 max-w-3xl">
          <span className="label tracking-[.3em] text-gold text-[10px] uppercase font-semibold">
            {r.heroTag}
          </span>
          <h1 className="h-display mt-4 text-4xl md:text-6xl text-cream tracking-[.06em] whitespace-pre-line leading-tight">
            {r.heroTitle}
          </h1>
          <p className="mt-6 text-xs md:text-sm text-cream/75 leading-relaxed max-w-2xl mx-auto font-light">
            {r.heroSubtitle}
          </p>
        </div>
      </header>

      {/* 4 Highlight Stat Cards */}
      <section className="relative z-20 -mt-12 wrap max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {r.policyHighlights.map((card, idx) => (
            <div
              key={idx}
              className="bg-white border border-brown/10 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-1 text-[9px] font-semibold tracking-[.25em] uppercase bg-brown text-gold mb-3">
                  {card.badge}
                </span>
                <h3 className="font-serif text-lg tracking-wide text-brown mb-2">
                  {card.title}
                </h3>
                <p className="text-xs text-brown/70 leading-relaxed font-light">
                  {card.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-brown/5 flex items-center gap-1.5 text-[10px] tracking-widest uppercase text-gold font-medium">
                <Icon name="check" className="w-3.5 h-3.5" />
                <span>{locale === "nl" ? "Gegarandeerd" : "Guaranteed"}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Legal Content Container */}
      <main className="wrap max-w-5xl py-20 md:py-28 space-y-24">
        {/* Section 1: 30-Day Extended Right of Withdrawal */}
        <ScrollReveal>
          <div className="grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 sticky top-28">
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block mb-2">
                01 • STATUTORY WITHDRAWAL
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide leading-snug">
                {r.withdrawalTitle}
              </h2>
              <p className="text-xs uppercase tracking-widest text-brown/50 mt-2 font-mono">
                {r.withdrawalSubtitle}
              </p>
            </div>
            <div className="md:col-span-8 space-y-6 text-sm leading-relaxed text-brown/85 font-light">
              <p className="bg-sand/20 p-5 border-l-2 border-gold text-xs md:text-sm leading-relaxed">
                {r.withdrawalBody1}
              </p>
              <p>{r.withdrawalBody2}</p>

              {/* Conditions Box */}
              <div className="border border-brown/15 bg-white p-6 mt-6">
                <h4 className="label text-[11px] tracking-[.2em] uppercase text-brown mb-4 font-semibold">
                  {r.conditionsTitle}
                </h4>
                <ul className="space-y-3">
                  {r.conditions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs leading-relaxed text-brown/80">
                      <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-sand/50 text-gold flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <Divider />

        {/* Section 2: 2-Year European Statutory Legal Guarantee */}
        <ScrollReveal>
          <div className="grid md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 sticky top-28">
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block mb-2">
                02 • LEGAL GUARANTEE
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide leading-snug">
                {r.guaranteeTitle}
              </h2>
              <p className="text-xs uppercase tracking-widest text-brown/50 mt-2 font-mono">
                {r.guaranteeSubtitle}
              </p>
            </div>
            <div className="md:col-span-8 space-y-6 text-sm leading-relaxed text-brown/85 font-light">
              <p>{r.guaranteeBody1}</p>
              <div className="bg-brown text-cream p-6 border-l-2 border-gold space-y-3">
                <div className="flex items-center gap-2 text-gold text-xs tracking-widest uppercase font-semibold">
                  <Icon name="check" className="w-4 h-4" />
                  <span>{locale === "nl" ? "Wettelijke Bescherming Zonder Meerprijs" : "Statutory Protection at No Extra Cost"}</span>
                </div>
                <p className="text-xs md:text-sm text-cream/80 leading-relaxed font-light">
                  {r.guaranteeBody2}
                </p>
              </div>
              <p className="text-xs text-brown/60 italic">
                {locale === "nl"
                  ? "Opmerking: De wettelijke garantie geldt onverminderd eventuele commerciële garanties en dekt non-conformiteit die reeds bij levering aanwezig was (presumptie van 12 maanden conform Boek 7 BW)."
                  : "Note: The legal guarantee applies without prejudice to commercial warranties and protects against lack of conformity existing upon delivery under European consumer legislation."}
              </p>
            </div>
          </div>
        </ScrollReveal>

        <Divider />

        {/* Section 3: EU Product Regulations, Textile Labelling & REACH Chemical Safety */}
        <ScrollReveal>
          <div>
            <div className="max-w-2xl mb-12">
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block mb-2">
                03 • REGULATORY INTEGRITY
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-brown tracking-wide">
                {r.euRegulationsTitle}
              </h2>
              <p className="text-xs uppercase tracking-widest text-brown/50 mt-2">
                {r.euRegulationsSubtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {r.regulationsList.map((reg, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-brown/15 p-7 flex flex-col justify-between hover:border-gold/60 transition-colors duration-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-brown/60 px-2 py-0.5 bg-sand/40">
                        {reg.directive}
                      </span>
                      <span className="text-[9px] uppercase tracking-widest text-gold font-semibold">
                        {reg.scope}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg tracking-wide text-brown mb-3">
                      {reg.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-brown/75 font-light">
                      {reg.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-brown/5 flex items-center gap-2 text-[10px] tracking-widest uppercase text-brown/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    <span>European Union Compliance</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <Divider />

        {/* Section 4: 4-Step How to Return Guide */}
        <ScrollReveal>
          <div>
            <div className="max-w-2xl mb-12">
              <span className="text-[10px] tracking-[.25em] uppercase text-gold font-semibold block mb-2">
                04 • RETURN PROCEDURE
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-brown tracking-wide">
                {r.stepsTitle}
              </h2>
              <p className="text-xs uppercase tracking-widest text-brown/50 mt-2">
                {r.stepsSubtitle}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {r.steps.map((st, i) => (
                <div key={i} className="relative bg-sand/15 border border-brown/10 p-6 flex flex-col justify-between">
                  <div>
                    <span className="font-serif text-3xl text-gold/60 font-light block mb-3">
                      {st.stepNumber}
                    </span>
                    <h4 className="font-serif text-base tracking-wide text-brown mb-2">
                      {st.title}
                    </h4>
                    <p className="text-xs leading-relaxed text-brown/70 font-light">
                      {st.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-brown/10 text-[9px] uppercase tracking-widest text-brown/40">
                    Step {i + 1} of 4
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Section 5: Return Address & Direct Concierge Actions */}
        <ScrollReveal>
          <div className="bg-brown text-cream p-8 md:p-12 border border-gold/30 shadow-xl">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <span className="label text-[10px] tracking-[.3em] uppercase text-gold block mb-2">
                  OFFICIAL RETURN DESTINATION
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-cream tracking-wide mb-4">
                  {r.addressTitle}
                </h3>
                <div className="bg-black/30 border border-cream/15 p-5 font-mono text-xs leading-relaxed text-sand/90 space-y-1">
                  {r.addressLines.map((line, lIdx) => (
                    <p key={lIdx} className={lIdx === 0 ? "font-semibold text-cream" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
                <p className="text-[11px] text-cream/50 mt-3">
                  {r.addressSubtitle}
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-serif text-xl text-cream mb-2">
                    {r.conciergeTitle}
                  </h4>
                  <p className="text-xs text-cream/70 leading-relaxed font-light">
                    {r.conciergeSubtitle}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={`mailto:${returnEmail}?subject=YUPEK%20Return%20Inquiry`}
                    className="btn bg-gold text-brown hover:bg-cream transition-colors text-center text-[10px] tracking-[.2em] font-semibold py-3 px-5 flex items-center justify-center gap-2"
                  >
                    <Icon name="mail" className="w-3.5 h-3.5" />
                    <span>{r.contactEmailBtn}</span>
                  </a>
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello YUPEK Concierge, I would like to inquire about returning an item.")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn border border-cream/30 text-cream hover:bg-cream hover:text-brown transition-colors text-center text-[10px] tracking-[.2em] font-semibold py-3 px-5"
                    >
                      {r.contactWhatsAppBtn}
                    </a>
                  )}
                </div>

                <div className="pt-2 text-[10px] text-cream/40 uppercase tracking-widest">
                  Customer Care Hours: {config.contactHours || "Monday – Saturday: 10:00 – 19:00 CET"}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 6: European Online Dispute Resolution (ODR) Statutory Notice */}
        <ScrollReveal>
          <div className="border border-brown/20 bg-white p-7 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold" />
                <h4 className="label text-[11px] tracking-[.2em] uppercase text-brown font-semibold">
                  {r.odrTitle}
                </h4>
              </div>
              <p className="text-xs text-brown/70 leading-relaxed font-light">
                {r.odrDesc}
              </p>
              <p className="text-[11px] text-brown/50">
                Official contact for dispute communications: <span className="font-mono text-brown">{returnEmail}</span>
              </p>
            </div>
            <a
              href="https://ec.europa.eu/consumers/odr"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-line whitespace-nowrap text-[10px] tracking-[.2em] uppercase py-3 px-5 inline-flex items-center gap-2"
            >
              <span>{r.odrPlatformBtn}</span>
              <Icon name="arrowRight" className="w-3.5 h-3.5" />
            </a>
          </div>
        </ScrollReveal>
      </main>

      {/* Return to Shop Footer Banner */}
      <section className="bg-sand/30 border-t border-brown/10 py-12 text-center">
        <div className="wrap">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[.25em] uppercase text-brown hover:text-gold transition-colors"
          >
            &larr; {locale === "nl" ? "Terug naar YUPEK Collectie" : "Return to YUPEK Collection"}
          </Link>
        </div>
      </section>
    </div>
  );
}
