"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { useSiteConfig } from "@/components/ConfigContext";
import ScrollReveal from "@/components/ScrollReveal";
import { Divider } from "@/components/ui/Pattern";
import Icon from "@/components/ui/Icon";

export default function TermsPage() {
  const { locale } = useLanguage();
  const { config } = useSiteConfig();

  const isNl = locale === "nl";
  const contactEmail = config.contactEmail || "daniyarov16@gmail.com";
  const cleanPhone = (config.whatsappNumber || "+31644154126").replace(/[^0-9]/g, "");

  return (
    <div className="bg-cream min-h-screen text-brown selection:bg-gold selection:text-white">
      {/* Luxury Header */}
      <header className="relative bg-brown py-24 text-center text-cream md:py-36 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C49A45_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-brown/80 via-transparent to-brown" />
        <div className="wrap relative z-10 max-w-3xl">
          <span className="label tracking-[.3em] text-gold text-[10px] uppercase font-semibold">
            {isNl ? "JURIDISCH & VOORWAARDEN" : "LEGAL & CONDITIONS"}
          </span>
          <h1 className="h-display mt-4 text-4xl md:text-6xl text-cream tracking-[.06em] whitespace-pre-line leading-tight">
            {isNl ? "ALGEMENE VOORWAARDEN" : "TERMS OF SERVICE"}
          </h1>
          <p className="mt-6 text-xs md:text-sm text-cream/75 leading-relaxed max-w-2xl mx-auto font-light">
            {isNl
              ? "Algemene voorwaarden voor aankopen bij YUPEK, inclusief bepalingen over on-demand productie, derden-fulfilment en consumentenrechten."
              : "General conditions governing purchases at YUPEK, including made-to-order production, third-party fulfillment, and consumer guarantees."}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="wrap max-w-4xl py-20 md:py-28 space-y-16">
        {/* Section 1: Scope & Seller Identification */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              01 • {isNl ? "TOEPASSELIJKHEID" : "SCOPE & IDENTIFICATION"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Toepasselijkheid en Identiteit" : "Scope & Seller Identity"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "Deze Algemene Voorwaarden zijn van toepassing op alle aanbiedingen, bestellingen en overeenkomsten via de officiële YUPEK webwinkel. Door een bestelling te plaatsen, aanvaardt u de toepasselijkheid van deze voorwaarden."
                : "These Terms of Service apply to all offers, orders, and sales agreements conducted through the official YUPEK online storefront. By placing an order, you agree to be bound by these terms."}
            </p>
            <p className="text-xs text-brown/65 font-light">
              {isNl
                ? "YUPEK treedt op als de verkoper en contractpartij voor uw aankoop. Klantenservice is bereikbaar via "
                : "YUPEK acts as the vendor and merchant of record for your transaction. Customer care is reached via "}
              <a href={`mailto:${contactEmail}`} className="font-mono text-brown underline hover:text-gold">
                {contactEmail}
              </a>.
            </p>
          </div>
        </ScrollReveal>

        {/* Section 2: Made-to-Order Production & Third-Party Fulfillment Providers */}
        <ScrollReveal>
          <div className="border border-gold/40 bg-sand/15 p-8 md:p-10 shadow-sm space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gold" />
              <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold">
                02 • {isNl ? "PRODUCTIE OP BESTELLING & FULFILMENT" : "MADE-TO-ORDER & FULFILLMENT PARTNERS"}
              </span>
            </div>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl
                ? "Productie na Bestelling & Derde Partners"
                : "Made-to-Order Production & Fulfillment Providers"}
            </h2>
            <div className="bg-white/80 p-6 border-l-2 border-gold space-y-3">
              <ul className="space-y-3 text-xs md:text-sm text-brown/85 font-light leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>
                    <strong>{isNl ? "Productie na bestelling:" : "Production upon order placement:"}</strong>{" "}
                    {isNl
                      ? "Sommige artikelen worden pas na het plaatsen van uw bestelling geproduceerd ('made to order'). Hierdoor hanteren wij een productieperiode voorafgaand aan verzending."
                      : "Certain products in our collection are produced after an order is placed ('made to order'). As a result, a manufacturing phase precedes parcel dispatch."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>
                    <strong>{isNl ? "Derde productie- en fulfilmentpartners:" : "Third-party production and fulfillment providers:"}</strong>{" "}
                    {isNl
                      ? "YUPEK kan gebruikmaken van gespecialiseerde derde productie- en fulfilmentproviders (zoals Printify en aangesloten drukfaciliteiten) om artikelen te vervaardigen en te verzenden."
                      : "YUPEK may utilize specialized third-party production and fulfillment providers (such as Printify and affiliated print facilities) to manufacture and process goods."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>
                    <strong>{isNl ? "Uitvoering namens YUPEK:" : "Execution on YUPEK's behalf:"}</strong>{" "}
                    {isNl
                      ? "Deze fulfilmentpartners kunnen artikelen namens YUPEK vervaardigen en rechtstreeks aan u verzenden via erkende koeriersdiensten."
                      : "Fulfillment partners may manufacture and ship products on YUPEK's behalf using verified European delivery couriers."}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold font-bold">•</span>
                  <span>
                    <strong>{isNl ? "YUPEK blijft uw aanspreekpunt:" : "YUPEK remains your sole point of contact:"}</strong>{" "}
                    {isNl
                      ? "Ongeacht de betrokken fulfilmentpartner blijft YUPEK uw volledige aanspreekpunt voor de aankoop, levering, garantie en klantenservice."
                      : "Regardless of the fulfillment partner engaged, YUPEK remains the customer's sole and authoritative point of contact for the purchase, delivery, warranty, and customer care."}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </ScrollReveal>

        {/* Section 3: Prices, Taxes & Payment */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              03 • {isNl ? "PRIJZEN & BETALING" : "PRICES & PAYMENT"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Prijzen, Belasting & Veilige Betaling" : "Pricing, Taxes & Payment Processing"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "Alle prijzen worden vermeld in euro (€, EUR) inclusief toepasselijke btw, tenzij uitdrukkelijk anders aangegeven. Betaling geschiedt direct tijdens het afrekenen via Stripe Payments. Bestellingen worden pas in productie genomen nadat de betalingsautorisatie succesvol is bevestigd."
                : "All prices are stated in Euro (€, EUR) inclusive of applicable value-added tax (VAT) unless explicitly stated otherwise. Payment is completed securely at checkout via Stripe Payments. Production commences only upon authoritative verification of successful payment."}
            </p>
          </div>
        </ScrollReveal>

        {/* Section 4: Shipping, Delivery & Risk of Loss */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              04 • {isNl ? "LEVERING" : "DELIVERY & RISK"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Verzending & Risico-overgang" : "Shipping & Risk Transfer"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "De levering vindt plaats op het door u opgegeven bezorgadres. Het risico van beschadiging of verlies van het product gaat over op de consument op het moment van fysieke ontvangst door u of een door u aangewezen derde (niet zijnde de vervoerder). Zie voor gedetailleerde doorlooptijden ons "
                : "Delivery occurs at the address provided during checkout. Risk of loss or damage passes to the consumer upon physical receipt by the consumer or a designated third party (other than the carrier). For full timelines, refer to our "}
              <Link href="/shipping" className="text-gold font-medium underline hover:text-brown">
                {isNl ? "Verzendbeleid" : "Shipping Policy"}
              </Link>.
            </p>
          </div>
        </ScrollReveal>

        {/* Section 5: Statutory Withdrawal & 2-Year Guarantee */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              05 • {isNl ? "HERROEPING & GARANTIE" : "WITHDRAWAL & STATUTORY GUARANTEE"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "30 Dagen Herroepingsrecht & 2 Jaar Garantie" : "30-Day Withdrawal & 2-Year Conformity Guarantee"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "Als consument in de Europese Unie heeft u recht op herroeping. YUPEK verlengt de wettelijke termijn van 14 dagen tot 30 kalenderdagen na ontvangst. Daarnaast geniet u de wettelijke 2-jarige conformiteitsgarantie conform Richtlijn (EU) 2019/771. Volledige instructies voor aanmelding en kosteloze retourlabels vindt u op onze "
                : "Under European Union consumer directives, you have the right of withdrawal. YUPEK extends the statutory 14-day window to 30 calendar days from receipt. Furthermore, you benefit from a mandatory 2-year legal conformity guarantee under EU Directive (EU) 2019/771. Full instructions and complimentary return procedures are detailed in our "}
              <Link href="/returns" className="text-gold font-medium underline hover:text-brown">
                {isNl ? "Retour- en Garantiepagina" : "Returns & Legal Guarantee Policy"}
              </Link>.
            </p>
          </div>
        </ScrollReveal>

        {/* Section 6: Customer Care & Dispute Resolution */}
        <ScrollReveal>
          <div className="bg-brown text-cream p-8 md:p-12 border border-gold/30 shadow-xl">
            <span className="label text-[10px] tracking-[.3em] uppercase text-gold block mb-2">
              {isNl ? "KLACHTEN & GESCHILLEN" : "DISPUTE RESOLUTION"}
            </span>
            <h3 className="font-serif text-2xl md:text-3xl text-cream tracking-wide mb-4">
              {isNl ? "Geschillenbeslechting & Klantenservice" : "Complaints & Online Dispute Resolution"}
            </h3>
            <p className="text-xs md:text-sm text-cream/80 leading-relaxed font-light mb-6 max-w-xl">
              {isNl
                ? "Heeft u een vraag of klacht over een artikel of bestelling? Onze conciërge streeft naar een minnelijke en snelle oplossing. Daarnaast wijzen wij op het Europese ODR-platform (Online Dispute Resolution)."
                : "If you have an inquiry or complaint regarding your purchase, our client concierge is dedicated to finding a prompt resolution. In accordance with EU Regulation No 524/2013, consumers may also access the European Commission's Online Dispute Resolution (ODR) platform."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${contactEmail}?subject=YUPEK%20Terms%20Inquiry`}
                className="btn bg-gold text-brown hover:bg-cream transition-colors text-center text-[10px] tracking-[.2em] font-semibold py-3 px-6 inline-flex items-center justify-center gap-2"
              >
                <Icon name="mail" className="w-3.5 h-3.5" />
                <span>{isNl ? "E-MAIL CONCIËRGE" : "EMAIL CONCIERGE"}</span>
              </a>
              {cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent("Hello YUPEK, I have an inquiry regarding your Terms of Service.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn border border-cream/30 text-cream hover:bg-cream hover:text-brown transition-colors text-center text-[10px] tracking-[.2em] font-semibold py-3 px-6"
                >
                  {isNl ? "WHATSAPP ASSISTENTIE" : "WHATSAPP ASSISTANCE"}
                </a>
              )}
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
