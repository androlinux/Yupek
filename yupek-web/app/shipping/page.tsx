"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { useSiteConfig } from "@/components/ConfigContext";
import ScrollReveal from "@/components/ScrollReveal";
import { Divider } from "@/components/ui/Pattern";
import Icon from "@/components/ui/Icon";

export default function ShippingPage() {
  const { locale } = useLanguage();
  const { config } = useSiteConfig();

  const isNl = locale === "nl";
  const contactEmail = config.contactEmail || "daniyarov16@gmail.com";

  const freeShippingThreshold = config.freeShippingThreshold || 100;

  return (
    <div className="bg-cream min-h-screen text-brown selection:bg-gold selection:text-white">
      {/* Luxury Header */}
      <header className="relative bg-brown py-24 text-center text-cream md:py-36 overflow-hidden">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C49A45_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-brown/80 via-transparent to-brown" />
        <div className="wrap relative z-10 max-w-3xl">
          <span className="label tracking-[.3em] text-gold text-[10px] uppercase font-semibold">
            {isNl ? "LOGISTIEK & VERZENDING" : "LOGISTICS & DELIVERY"}
          </span>
          <h1 className="h-display mt-4 text-4xl md:text-6xl text-cream tracking-[.06em] whitespace-pre-line leading-tight">
            {isNl ? "VERZENDBELEID" : "SHIPPING POLICY"}
          </h1>
          <p className="mt-6 text-xs md:text-sm text-cream/75 leading-relaxed max-w-2xl mx-auto font-light">
            {isNl
              ? "Transparante informatie over onze on-demand productie, doorlooptijden, vervoerders en levering binnen Europa."
              : "Transparent guidance on made-to-order craftsmanship, production timelines, carriers, and European delivery."}
          </p>
        </div>
      </header>

      {/* Transparent Fulfillment Highlight Card */}
      <section className="relative z-20 -mt-12 wrap max-w-4xl">
        <div className="border border-gold/40 bg-white p-8 md:p-10 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-gold" />
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold">
              {isNl ? "TRANSPARANTE VERZENDVERKLARING" : "TRANSPARENT FULFILLMENT STATEMENT"}
            </span>
          </div>
          <blockquote className="font-serif text-lg md:text-xl text-brown leading-relaxed border-l-2 border-gold pl-4 py-1 italic">
            &ldquo;YUPEK products may be made to order through our production and fulfillment partners. Production and delivery times may vary depending on the product and destination.&rdquo;
          </blockquote>
          {isNl && (
            <p className="mt-3 text-xs md:text-sm text-brown/70 border-l-2 border-brown/20 pl-4 italic">
              &ldquo;YUPEK-artikelen kunnen op bestelling worden vervaardigd via onze productie- en fulfilmentpartners. Productie- en bezorgtijden kunnen variëren afhankelijk van het product en de bestemming.&rdquo;
            </p>
          )}
        </div>
      </section>

      {/* Main Content */}
      <main className="wrap max-w-4xl py-20 md:py-28 space-y-16">
        {/* Section 1: The 2-Phase Delivery Process */}
        <ScrollReveal>
          <div className="space-y-6">
            <div>
              <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block mb-2">
                01 • {isNl ? "HET PROCES" : "THE TIMELINE"}
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-brown tracking-wide">
                {isNl ? "Hoe Uw Bestelling Wordt Verwerkt" : "How Your Order is Fulfilled"}
              </h2>
              <p className="text-xs uppercase tracking-widest text-brown/50 mt-2">
                {isNl ? "Van digitaal weefgetouw tot uw voordeur" : "From precision crafting to your doorstep"}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
              {/* Phase 1 */}
              <div className="bg-white border border-brown/15 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold tracking-widest uppercase bg-sand/30 text-brown px-2 py-0.5">
                      {isNl ? "FASE 1" : "PHASE 1"}
                    </span>
                    <span className="font-mono text-xs text-gold font-bold">2 – 5 {isNl ? "Werkdagen" : "Business Days"}</span>
                  </div>
                  <h3 className="font-serif text-lg text-brown mb-2">
                    {isNl ? "Productie op Maat" : "Made-to-Order Production"}
                  </h3>
                  <p className="text-xs text-brown/75 font-light leading-relaxed">
                    {isNl
                      ? "Nadat uw betaling is ontvangen, wordt uw kledingstuk individueel vervaardigd door onze gespecialiseerde druk- en fulfilmentpartners. Dit omvat digitaal printen/borduren, fixatie en handmatige kwaliteitscontrole."
                      : "Once your payment is authorized, your garment is crafted individually by our specialized print-on-demand production partners. This includes precision printing/embroidery, finishing, and quality inspection."}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-brown/10 text-[10px] tracking-widest text-brown/50 uppercase">
                  ✓ {isNl ? "Geen overproductie • Duurzame werkwijze" : "No excess inventory • Sustainable practice"}
                </div>
              </div>

              {/* Phase 2 */}
              <div className="bg-white border border-brown/15 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-semibold tracking-widest uppercase bg-sand/30 text-brown px-2 py-0.5">
                      {isNl ? "FASE 2" : "PHASE 2"}
                    </span>
                    <span className="font-mono text-xs text-gold font-bold">3 – 7 {isNl ? "Werkdagen" : "Business Days"}</span>
                  </div>
                  <h3 className="font-serif text-lg text-brown mb-2">
                    {isNl ? "Verzending met Track & Trace" : "Courier Transit & Delivery"}
                  </h3>
                  <p className="text-xs text-brown/75 font-light leading-relaxed">
                    {isNl
                      ? "Zodra uw bestelling de productiefaciliteit verlaat, wordt deze overgedragen aan gerenommeerde koeriersdiensten (zoals DHL, PostNL, UPS). U ontvangt direct een verzendbevestiging met trackingcode."
                      : "Upon dispatch from the fulfillment facility, your parcel is entrusted to premium European couriers (such as DHL, PostNL, UPS). You receive an automated dispatch notification with full tracking."}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-brown/10 text-[10px] tracking-widest text-brown/50 uppercase">
                  ✓ {isNl ? "Volledig traceerbaar tot aflevering" : "Fully tracked until delivery"}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <Divider />

        {/* Section 2: Transparent Shipping Rates & Free Shipping */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-white p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              02 • {isNl ? "VERZENDTARIEVEN" : "SHIPPING RATES"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Duidelijke en Eerlijke Tarieven" : "Transparent European Delivery Rates"}
            </h2>
            <div className="space-y-3 text-xs md:text-sm text-brown/80 font-light leading-relaxed">
              <p>
                {isNl ? (
                  <>
                    YUPEK biedt <strong className="font-semibold text-brown">gratis standaardverzending binnen Europa</strong> voor alle bestellingen vanaf <strong className="font-semibold text-brown">€{freeShippingThreshold}</strong>.
                  </>
                ) : (
                  <>
                    YUPEK offers <strong className="font-semibold text-brown">complimentary standard shipping across Europe</strong> on all orders of <strong className="font-semibold text-brown">€{freeShippingThreshold} or more</strong>.
                  </>
                )}
              </p>
              <p>
                {isNl
                  ? "Voor bestellingen onder dit drempelbedrag worden de actuele verzendkosten transparant berekend en getoond tijdens het afrekenen voordat u betaalt. Eventuele spoedverzending kan worden geselecteerd afhankelijk van het bezorgadres."
                  : "For orders below this threshold, shipping rates are calculated transparently at checkout based on your destination before you confirm payment. Expedited courier options are presented where available."}
              </p>
            </div>
          </div>
        </ScrollReveal>

        <Divider />

        {/* Section 3: Realistic Delivery Expectation Notice */}
        <ScrollReveal>
          <div className="border border-brown/15 bg-sand/15 p-8 md:p-10 shadow-sm space-y-4">
            <span className="label text-[10px] tracking-[.25em] uppercase text-gold font-semibold block">
              03 • {isNl ? "BELANGRIJKE OPMERKING" : "DELIVERY NOTICE"}
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-brown tracking-wide">
              {isNl ? "Geen Onrealistische Beloften" : "No Unrealistic Guarantees"}
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-brown/80 font-light">
              {isNl
                ? "Omdat onze kledingstukken op bestelling worden geproduceerd, geven wij reële en eerlijke richttijden in plaats van onrealistische 'volgende dag in huis'-beloften. Tijdens piekperiodes (feestdagen, seizoenslanceringen) of door onvoorziene weersomstandigheden bij vervoerders kan de levertijd iets afwijken. Wij houden u altijd proactief via e-mail op de hoogte."
                : "Because our garments are tailored and printed upon order placement, we provide honest, realistic delivery estimates rather than unachievable overnight claims. During holiday periods or unexpected courier disruptions, transit times may vary slightly. We keep you informed throughout the journey."}
            </p>
          </div>
        </ScrollReveal>

        {/* Section 4: Customer Point of Contact */}
        <ScrollReveal>
          <div className="bg-brown text-cream p-8 md:p-12 border border-gold/30 shadow-xl">
            <span className="label text-[10px] tracking-[.3em] uppercase text-gold block mb-2">
              {isNl ? "UW AANSPREEKPUNT" : "YOUR POINT OF CONTACT"}
            </span>
            <h3 className="font-serif text-2xl md:text-3xl text-cream tracking-wide mb-4">
              {isNl ? "YUPEK Blijft Uw Directe Partner" : "YUPEK Remains Your Sole Point of Contact"}
            </h3>
            <p className="text-xs md:text-sm text-cream/80 leading-relaxed font-light mb-6 max-w-xl">
              {isNl
                ? "Ook al werken wij samen met externe fulfilmentpartners voor de fysieke vervaardiging, YUPEK is en blijft uw volledige contractuele aanspreekpunt voor bestelstatussen, adreswijzigingen, vertragingen en service."
                : "While we partner with external production and fulfillment facilities for manufacturing and dispatch, YUPEK remains your direct point of contact for all order tracking, address updates, transit queries, and customer care."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${contactEmail}?subject=YUPEK%20Shipping%20Inquiry`}
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
