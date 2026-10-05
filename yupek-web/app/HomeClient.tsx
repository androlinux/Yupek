"use client";
import Link from "next/link";
import Hero from "@/components/Hero";
import SectionHeading from "@/components/SectionHeading";
import ProductGrid from "@/components/ProductGrid";
import EditorialSection, { Editorial } from "@/components/EditorialSection";
import Newsletter from "@/components/Newsletter";
import { Divider } from "@/components/ui/Pattern";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import ScrollReveal from "@/components/ScrollReveal";

export default function HomeClient() {
  const { allProducts, config } = useSiteConfig();
  const { t, locale } = useLanguage();

  const fresh = allProducts.filter((p) => p.newArrival).slice(0, 4);
  const featured = allProducts.filter((p) => p.featured).slice(0, 4);

  const editorialTag = locale === "nl" ? t.home.editorialTag : (config.editorialTag || t.home.editorialTag);
  const editorialTitle = locale === "nl" ? t.home.editorialTitle : (config.editorialTitle || t.home.editorialTitle);
  const editorialDesc = locale === "nl" ? t.home.editorialDesc : (config.editorialDescription || t.home.editorialDesc);
  const editorialBtn = locale === "nl" ? t.home.editorialBtn : (config.editorialButtonText || t.home.editorialBtn);

  return (
    <>
      {/* 1. Hero Section with video/photo CMS */}
      <Hero />

      {/* 2. Brand Manifesto with Scroll Reveal */}
      <section className="wrap py-24 text-center md:py-36">
        <ScrollReveal>
          <span className="label tracking-[.3em] text-burgundy text-[10px]">{t.manifesto.tag}</span>
          <h2 className="h-display mt-2 text-4xl md:text-7xl text-brown whitespace-pre-line">
            {t.manifesto.title}
          </h2>
          <Divider className="my-8 mx-auto" />
          <p className="mx-auto max-w-2xl text-xs md:text-sm leading-8 text-brown/75 font-light">
            {t.manifesto.body1}
            <br /><br />
            {t.manifesto.body2}
          </p>
        </ScrollReveal>
      </section>

      {/* 3. New Collection Showcase */}
      <section className="wrap pb-24">
        <ScrollReveal>
          <SectionHeading title={t.home.newArrivals} sub={t.home.newArrivalsSub} />
        </ScrollReveal>

        <ScrollReveal delayMs={150}>
          <div className="mt-14">
            <ProductGrid items={fresh} />
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={250}>
          <div className="mt-14 text-center">
            <Link
              href="/shop?new=1"
              className="inline-flex items-center justify-center border border-brown px-8 py-3.5 text-xs font-medium tracking-[.2em] text-brown transition-all duration-300 hover:bg-brown hover:text-cream"
            >
              {t.home.exploreNewArrivals}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. Editorial Showcase (Dynamic from CMS / i18n) */}
      <ScrollReveal threshold={0.1}>
        <EditorialSection image={config.editorialImage || "/images/collection.jpg"}>
          <p className="label tracking-[.25em] text-gold text-[10px]">{editorialTag}</p>
          <h2 className="h-display mt-4 text-3xl md:text-5xl text-brown">
            {editorialTitle}
          </h2>
          <p className="mt-6 text-xs md:text-sm leading-8 text-brown/75 font-light">
            {editorialDesc}
          </p>
          <div className="mt-10">
            <Link
              href={config.editorialButtonLink || "/lookbook"}
              className="inline-flex items-center justify-center bg-brown px-8 py-3.5 text-xs font-medium tracking-[.2em] text-cream transition-all duration-300 hover:bg-black shadow-sm"
            >
              {editorialBtn}
            </Link>
          </div>
        </EditorialSection>
      </ScrollReveal>

      {/* 5. Everyday Capsule */}
      <section className="wrap py-28">
        <ScrollReveal>
          <SectionHeading title={t.home.madeForEveryday} sub={t.home.madeForEverydaySub} />
        </ScrollReveal>

        <ScrollReveal delayMs={150}>
          <div className="mt-14">
            <ProductGrid items={featured} />
          </div>
        </ScrollReveal>
      </section>

      {/* 6. Heritage Story Section */}
      <section className="relative bg-brown text-cream overflow-hidden">
        <Editorial
          src="/images/heritage.jpg"
          label="Woven textile detail"
          className="absolute inset-0 bg-brown opacity-40 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/60 to-brown/40" />

        <div className="wrap relative z-10 py-32 text-center md:py-44">
          <ScrollReveal>
            <span className="label tracking-[.3em] text-gold text-[10px]">{t.home.heritageTag}</span>
            <h2 className="h-display mt-3 text-4xl md:text-7xl text-cream whitespace-pre-line">
              {t.home.heritageTitle}
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-xs md:text-sm leading-8 text-cream/85 font-light">
              {t.home.heritageDesc1}
              <br /><br />
              {t.home.heritageDesc2}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/about"
                className="inline-flex items-center justify-center border border-cream px-8 py-3.5 text-xs font-medium tracking-[.2em] text-cream hover:bg-cream hover:text-brown transition-all duration-300"
              >
                {t.home.ourStoryBtn}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center border border-cream/40 bg-brown/50 backdrop-blur-sm px-8 py-3.5 text-xs font-medium tracking-[.2em] text-cream hover:border-cream transition-all duration-300"
              >
                {t.home.visitShowroomBtn}
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* 7. Lookbook Visual Mosaic */}
      <section className="wrap py-28">
        <ScrollReveal>
          <SectionHeading title={t.home.visualLookbook} sub={t.home.visualLookbookSub} />
        </ScrollReveal>

        <ScrollReveal delayMs={150}>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { src: "/images/look-1.jpg", caption: t.home.look1Caption },
              { src: "/images/look-2.jpg", caption: t.home.look2Caption },
              { src: "/images/look-3.jpg", caption: t.home.look3Caption },
            ].map((look, i) => (
              <div key={look.src} className={`group ${i === 1 ? "md:mt-12" : ""}`}>
                <div className="relative aspect-[3/4] overflow-hidden bg-sand/30 border border-brown/10">
                  <Editorial
                    src={look.src}
                    label={look.caption}
                    className="h-full w-full transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-brown/70 text-center">
                  {look.caption}
                </p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delayMs={200}>
          <div className="mt-14 text-center">
            <Link
              href="/lookbook"
              className="inline-flex items-center justify-center border border-brown px-8 py-3.5 text-xs font-medium tracking-[.2em] text-brown transition-all duration-300 hover:bg-brown hover:text-cream"
            >
              {t.home.viewLookbookBtn}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. YUPEK Newsletter Subscription */}
      <ScrollReveal>
        <Newsletter />
      </ScrollReveal>
    </>
  );
}
