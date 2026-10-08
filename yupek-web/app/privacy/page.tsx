"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { useSiteConfig } from "@/components/ConfigContext";
import { useCookieConsent } from "@/components/CookieConsentContext";
import ScrollReveal from "@/components/ScrollReveal";
import { Divider } from "@/components/ui/Pattern";
import Icon from "@/components/ui/Icon";

export default function PrivacyPage() {
  const { locale } = useLanguage();
  const { config } = useSiteConfig();
  const { openSettings } = useCookieConsent();

  const isNl = locale === "nl";
  const contactEmail = config.contactEmail || "daniyarov16@gmail.com";


  return (
    <div className="bg-cream min-h-screen text-brown selection:bg-gold selection:text-white">
      {/* Luxury Header */}
      <header className="relative bg-brown py-24 text-center text-cream md:py-36 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C49A45_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-brown/80 via-transparent to-brown" />
        <div className="wrap relative z-10 max-w-3xl">
          <span className="label tracking-[.3em] text-gold text-[10px] uppercase font-semibold">
            {isNl ? "TRANSPARANTIE & PRIVACY" : "TRANSPARENCY & PRIVACY"}
          </span>
          <h1 className="h-display mt-4 text-4xl md:text-6xl text-cream tracking-[.06em] whitespace-pre-line leading-tight">
            {isNl ? "PRIVACYBELEID" : "PRIVACY POLICY"}
          </h1>
          <p className="mt-6 text-xs md:text-sm text-cream/75 leading-relaxed max-w-2xl mx-auto font-light">
            {isNl
              ? "Hoe YUPEK uw persoonsgegevens verzamelt, beschermt en uitsluitend verwerkt voor de productie en levering van uw bestelling."
              : "How YUPEK collects, safeguards, and processes personal information strictly necessary to craft and deliver your order."}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="wrap max-w-4xl py-20 md:py-28 space-y-16">
        {/* Section 1: Overview & Data Controller */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              01 • {isNl ? "VERANTWOORDELIJKE" : "DATA CONTROLLER"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Wie Wij Zijn" : "Who We Are"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "YUPEK is een hedendaags modelabel geïnspireerd door Centraal-Aziatisch zijde-erfgoed en Europese architecturale snitten. YUPEK treedt op als de verantwoordelijke voor de verwerking van persoonsgegevens die via deze webshop worden verzameld."
                : "YUPEK is a contemporary fashion brand inspired by Central Asian silk heritage and European tailoring. YUPEK operates as the data controller for personal data processed through this online storefront."}
            </p>
            <p className="text-xs text-brown/65 font-light">
              {isNl
                ? "Voor alle vragen over gegevensbescherming kunt u rechtstreeks contact opnemen met onze conciërge via "
                : "For all privacy or data inquiries, you may contact our concierge team directly at "}
              <a href={`mailto:${contactEmail}`} className="font-mono text-brown underline hover:text-gold">
                {contactEmail}
              </a>.
            </p>

            {/* Legal Entity & Statutory Placeholders Notice */}
            <div className="bg-sand/20 border border-brown/10 p-5 text-xs space-y-2 mt-4 font-mono">
              <div className="font-semibold text-brown uppercase tracking-wider text-[11px]">
                {isNl ? "Statutaire Bedrijfsgegevens (In Oprichting / Pre-Registration)" : "Legal Entity Details (Pre-Registration Technical Status)"}
              </div>
              <ul className="space-y-1 text-brown/75">
                <li><strong>{isNl ? "Handelsnaam:" : "Trade Name:"}</strong> YUPEK</li>
                <li><strong>{isNl ? "Juridische Entiteit:" : "Legal Entity:"}</strong> [LEGAL COMPANY NAME — TO BE REGISTERED UPON KVK FILING]</li>
                <li><strong>{isNl ? "Vestigingsadres:" : "Registered Address:"}</strong> [REGISTERED BUSINESS ADDRESS — TO BE COMPLETED UPON KVK FILING]</li>
                <li><strong>{isNl ? "KVK-nummer:" : "Chamber of Commerce (KVK):"}</strong> [KVK NUMBER — NOT YET REGISTERED / PENDING KVK REGISTRATION]</li>
                <li><strong>{isNl ? "Btw-identificatienummer:" : "VAT / BTW Number:"}</strong> [VAT / BTW NUMBER — NOT YET ISSUED / PENDING TAX REGISTRATION]</li>
                <li><strong>{isNl ? "Privacy Contactpersoon:" : "Privacy Concierge Contact:"}</strong> [PRIVACY CONTACT EMAIL — currently {contactEmail}]</li>
              </ul>
              <p className="text-[10px] text-brown/60 italic pt-1">
                {isNl
                  ? "Opmerking: Deze webshop bevindt zich in technische auditstatus. Officiële handelsregistratie en btw-nummer worden na voltooiing van het registratieproces gepubliceerd."
                  : "Note: This storefront is in technical audit status. Official Chamber of Commerce registration and VAT number will be published upon formal registration completion."}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 2: Production & Fulfillment Disclosure (Printify & Printing Partners) */}
        <ScrollReveal>
          <div className="border border-gold/40 bg-sand/15 p-8 md:p-10 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold" />
              <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold">
                02 • {isNl ? "PRODUCTIE & VERZENDPARTNERS" : "FULFILLMENT & PRODUCTION PARTNERS"}
              </span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl
                ? "Derde Productie- en Uitvoeringspartners"
                : "Third-Party Production & Fulfillment Disclosure"}
            </h2>
            <div className="bg-white/80 p-6 border-l-2 border-gold space-y-3">
              <p className="text-xs md:text-sm font-medium text-brown leading-relaxed">
                {isNl
                  ? "Om uw bestelling te produceren en te bezorgen, kunnen wij de persoonsgegevens die noodzakelijk zijn voor het uitvoeren van uw aankoop delen met onze druk- en fulfilmentpartners. Dit kan uw naam, bezorgadres, e-mailadres, telefoonnummer en bestelgegevens omvatten. Deze dienstverleners verwerken gegevens uitsluitend voor zover nodig om uw bestelling te vervaardigen en te leveren."
                  : "To produce and deliver your order, we may share the personal information necessary to fulfill your purchase with our printing and fulfillment partners. This may include your name, shipping address, email address, phone number and order details. These providers process information only as necessary to manufacture and deliver your order."}
              </p>
            </div>
            <div className="space-y-3 text-xs md:text-sm text-brown/85 font-light leading-relaxed">
              <p>
                {isNl ? (
                  <>
                    YUPEK maakt voor print-on-demand productie en logistieke orderverwerking onder meer gebruik van <strong className="font-semibold text-brown">Printify</strong> als productie- en fulfilmentpartner. Nadat uw betaling via onze beveiligde kassa is geverifieerd, worden de vereiste bezorggegevens doorgestuurd zodat uw kledingstukken op bestelling kunnen worden vervaardigd en rechtstreeks naar uw adres verzonden.
                  </>
                ) : (
                  <>
                    YUPEK utilizes <strong className="font-semibold text-brown">Printify</strong> as one of its print-on-demand production and fulfillment providers. Once your payment is authoritatively confirmed, essential shipping information is transmitted to enable on-demand crafting, printing, and direct shipment to your delivery address.
                  </>
                )}
              </p>
              <ul className="space-y-2 pt-2 border-t border-brown/10">
                <li className="flex items-start gap-2 text-xs">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>{isNl ? "Naam en afleveradres:" : "Recipient Name & Postal Address:"}</strong> {isNl ? "Om het pakket correct te adresseren en te bezorgen." : "Required for manufacturing routing and physical courier delivery."}</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>{isNl ? "E-mailadres:" : "Email Address:"}</strong> {isNl ? "Voor verzendbevestiging en automatische Track & Trace updates van de vervoerder." : "For automated dispatch notices and carrier tracking updates."}</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>{isNl ? "Telefoonnummer (indien verstrekt):" : "Phone Number (if provided):"}</strong> {isNl ? "Uitsluitend voor koeriersleveringsberichten bij aflevering." : "Exclusively for courier delivery coordination where required."}</span>
                </li>
                <li className="flex items-start gap-2 text-xs">
                  <span className="text-gold font-bold">•</span>
                  <span><strong>{isNl ? "Bestelde artikelen & maten:" : "Items, Sizes & Variants:"}</strong> {isNl ? "Noodzakelijk voor de fabricage van het specifieke kledingstuk." : "Strictly necessary to manufacture the correct garment specifications."}</span>
                </li>
              </ul>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 3: Payment Processing (Stripe) */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              03 • {isNl ? "BEVEILIGDE BETALINGEN" : "PAYMENT PROCESSING"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Betalingsafhandeling via Stripe" : "Secure Payment via Stripe"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "Alle online betalingen (iDEAL, creditcard, Apple Pay, Klarna, Bancontact) worden direct en versleuteld verwerkt via Stripe Payments Europe, Ltd. YUPEK slaat zelf nooit volledige creditcardnummers of gevoelige betaalgegevens op. Stripe verwerkt betalingstransacties conform de hoogste PCI-DSS Level 1 normen."
                : "All electronic transactions (iDEAL, Credit Cards, Apple Pay, Klarna, Bancontact) are encrypted and processed by Stripe Payments Europe, Ltd. YUPEK never receives or stores your full payment card credentials. Stripe complies with PCI-DSS Level 1 security standards."}
            </p>
          </div>
        </ScrollReveal>

        {/* Section 4: Cookies & Tracking Technologies */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              04 • {isNl ? "COOKIES & TOESTEMMING" : "COOKIES & CONSENT"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Cookiebeleid & Voorkeurenbeheer" : "Cookie Categories & Preference Control"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "YUPEK hanteert een strikt privacy-first cookiebeleid conform de Europese e-Privacyrichtlijn en AVG. Niet-essentiële cookies worden standaard geblokkeerd totdat u hiervoor expliciet toestemming geeft:"
                : "YUPEK enforces a privacy-first consent model under the EU ePrivacy Directive and GDPR. Non-essential trackers are blocked by default until explicit affirmative consent is provided:"}
            </p>
            <div className="space-y-3 pt-2 text-xs text-brown/85 font-light">
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong className="text-brown font-semibold uppercase tracking-wider text-[11px] block mb-1">
                  1. {isNl ? "Essentiële Cookies (Altijd Actief)" : "Essential Cookies (Always Active)"}
                </strong>
                <p>
                  {isNl
                    ? "Noodzakelijk voor basisfuncties van de webshop: beveiligde authenticatiesessies (Supabase Auth), winkelmand (`yupek-cart`), verlanglijst (`yupek-wishlist`), cookievoorkeuren (`yupek_cookie_consent`) en taalinstellingen."
                    : "Strictly necessary for storefront operation: authenticated client sessions (Supabase Auth), shopping bag (`yupek-cart`), saved items (`yupek-wishlist`), cookie consent state (`yupek_cookie_consent`), and language selection."}
                </p>
              </div>
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong className="text-brown font-semibold uppercase tracking-wider text-[11px] block mb-1">
                  2. {isNl ? "Analytische Cookies (Opt-in Vereist)" : "Analytics Cookies (Opt-in Required)"}
                </strong>
                <p>
                  {isNl
                    ? "Standaard uitgeschakeld. Met uw toestemming kunnen geanonimiseerde performancemetingen (bijv. Vercel Web Analytics) worden geladen om websiteprestaties te analyseren. Er worden geen commerciële volgprofielen opgebouwd."
                    : "Disabled by default. With your explicit consent, anonymous performance metrics (e.g., Vercel Web Analytics) may monitor site speed and navigation patterns. No behavioral advertising profiles are built."}
                </p>
              </div>
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong className="text-brown font-semibold uppercase tracking-wider text-[11px] block mb-1">
                  3. {isNl ? "Marketingcookies (Opt-in Vereist)" : "Marketing Cookies (Opt-in Required)"}
                </strong>
                <p>
                  {isNl
                    ? "Standaard uitgeschakeld. YUPEK maakt op dit moment geen gebruik van externe commerciële advertentienetwerken (zoals Meta Pixel of Google Ads remarketing). Eventuele toekomstige marketingcookies vereisen altijd voorafgaande toestemming."
                    : "Disabled by default. YUPEK does not currently deploy third-party advertising or retargeting networks (such as Meta Pixel or Google Ads). Any future marketing integrations strictly require prior affirmative consent."}
                </p>
              </div>
            </div>
            <div className="pt-3">
              <button
                type="button"
                onClick={openSettings}
                className="btn border border-brown text-brown hover:bg-brown hover:text-cream transition-colors text-[10px] tracking-[.2em] font-semibold py-2.5 px-5 uppercase"
              >
                {isNl ? "BEHEER COOKIEVOORKEUREN" : "MANAGE COOKIE PREFERENCES"}
              </button>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 5: Data Retention & Limits */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              05 • {isNl ? "BEWAARTERMIJNEN" : "DATA RETENTION"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Bewaartermijnen van Persoonsgegevens" : "Data Retention Principles"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "YUPEK bewaart uw persoonsgegevens uitsluitend zolang dit noodzakelijk is voor de doelen waarvoor ze zijn verkregen:"
                : "YUPEK retains personal data strictly for the duration necessary to satisfy processing and legal obligations:"}
            </p>
            <ul className="space-y-2 text-xs text-brown/75 font-light">
              <li className="flex items-start gap-2">
                <span className="text-gold font-bold">•</span>
                <span><strong>{isNl ? "Klantaccount:" : "Customer Account Data:"}</strong> {isNl ? "Bewaard zolang uw account actief is of totdat u verzoekt om accountverwijdering." : "Retained while your account is active or until an erasure request is executed."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold font-bold">•</span>
                <span><strong>{isNl ? "Fiscale Bestel- & Betaaladministratie:" : "Fiscal Transaction & Invoice Records:"}</strong> {isNl ? "Wettelijk verplichte fiscale bewaartermijn van 7 jaar conform de Nederlandse Belastingdienst en het Burgerlijk Wetboek (Boek 7 BW). Overige niet-fiscale ordergegevens: [DATA RETENTION PERIOD TO CONFIRM]." : "Preserved for 7 years under statutory Dutch fiscal and accounting record retention regulations. Non-fiscal customer order details follow: [DATA RETENTION PERIOD TO CONFIRM]."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold font-bold">•</span>
                <span><strong>{isNl ? "Klantenservice Berichten:" : "Customer Inquiries & Support:"}</strong> {isNl ? "Bewaard voor de duur van de afhandeling, gevolgd door een bewaartermijn van [CUSTOMER CARE RETENTION PERIOD TO CONFIRM]." : "Preserved during inquiry resolution, followed by [CUSTOMER CARE RETENTION PERIOD TO CONFIRM]."}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-gold font-bold">•</span>
                <span><strong>{isNl ? "Cookiekeuzes:" : "Cookie Consent State:"}</strong> {isNl ? "Bewaard voor maximaal 12 maanden in uw browser, waarna de toestemmingsvraag opnieuw wordt getoond." : "Retained for up to 12 months in first-party browser storage, after which renewed consent is solicited."}</span>
              </li>
            </ul>
          </div>
        </ScrollReveal>

        {/* Section 6: Your Rights under European Law (GDPR) */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              06 • {isNl ? "UW RECHTEN" : "YOUR STATUTORY RIGHTS"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Rechten van Betrokkenen (AVG / GDPR)" : "Data Subject Rights (GDPR)"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "Onder de Europese Algemene Verordening Gegevensbescherming (AVG/GDPR) heeft u recht op:"
                : "Under European data protection legislation, you are entitled to the following rights:"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong>{isNl ? "Inzage & Overdraagbaarheid" : "Access & Portability"}</strong>
                <p className="text-brown/70 mt-1">{isNl ? "Inzicht in welke gegevens wij van u bewaren." : "Request a copy of your personal data."}</p>
              </div>
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong>{isNl ? "Correctie & Rectificatie" : "Rectification"}</strong>
                <p className="text-brown/70 mt-1">{isNl ? "Onjuiste gegevens aanpassen via uw account of conciërge." : "Update inaccurate records in your account."}</p>
              </div>
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong>{isNl ? "Gegevenswissing ('Vergetelheid')" : "Erasure ('Right to be Forgotten')"}</strong>
                <p className="text-brown/70 mt-1">{isNl ? "Verzoek om verwijdering van uw account en gegevens (behoudens fiscale bewaarplichten)." : "Request deletion of your profile and personal data (except statutory fiscal records)."}</p>
              </div>
              <div className="border border-brown/10 p-3 bg-sand/10">
                <strong>{isNl ? "Bezwaar & Beperking" : "Restriction & Objection"}</strong>
                <p className="text-brown/70 mt-1">{isNl ? "Bezwaar maken tegen specifieke verwerkingen." : "Object to processing where legally applicable."}</p>
              </div>
            </div>
            <p className="text-xs text-brown/65 pt-2 font-light">
              {isNl
                ? "U heeft tevens te allen tijde het recht om een klacht in te dienen bij de bevoegde toezichthouder voor gegevensbescherming (in Nederland: Autoriteit Persoonsgegevens, https://autoriteitpersoonsgegevens.nl)."
                : "You also retain the right at any time to lodge a complaint with the competent supervisory authority (in the Netherlands: Autoriteit Persoonsgegevens, https://autoriteitpersoonsgegevens.nl)."}
            </p>
          </div>
        </ScrollReveal>

        {/* Section 6: Client Concierge Contact Box */}
        <ScrollReveal>
          <div className="bg-brown text-cream p-8 md:p-12 border border-gold/30 shadow-xl">
            <span className="label text-[10px] tracking-[.3em] uppercase text-gold block mb-2">
              {isNl ? "VRAGEN OVER UW PRIVACY?" : "QUESTIONS ABOUT YOUR PRIVACY?"}
            </span>
            <h3 className="font-serif text-2xl md:text-3xl text-cream tracking-wide mb-4">
              {isNl ? "Persoonlijke Assistentie" : "Personal Data Inquiries"}
            </h3>
            <p className="text-xs md:text-sm text-cream/80 leading-relaxed font-light mb-6 max-w-xl">
              {isNl
                ? "Voor inzageverzoeken, correcties of vragen over onze fulfilmentpartners staat onze conciërge voor u klaar."
                : "For data access requests, corrections, or fulfillment partner questions, contact our client concierge."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${contactEmail}?subject=YUPEK%20Privacy%20Inquiry`}
                className="btn bg-gold text-brown hover:bg-cream transition-colors text-center text-[10px] tracking-[.2em] font-semibold py-3 px-6 inline-flex items-center justify-center gap-2"
              >
                <Icon name="mail" className="w-3.5 h-3.5" />
                <span>{isNl ? "E-MAIL CONCIËRGE" : "EMAIL CONCIERGE"}</span>
              </a>
              <Link
                href="/contact"
                className="btn border border-cream/30 text-cream hover:bg-cream hover:text-brown transition-colors text-center text-[10px] tracking-[.2em] font-semibold py-3 px-6"
              >
                {isNl ? "KLANTENSERVICE BERICHTEN" : "CONTACT SUPPORT"}
              </Link>
            </div>
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
            &larr; {isNl ? "Terug naar YUPEK Collectie" : "Return to YUPEK Collection"}
          </Link>
        </div>
      </section>
    </div>
  );
}
