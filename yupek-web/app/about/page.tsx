"use client";
import Link from "next/link";
import { Editorial } from "@/components/EditorialSection";
import { Divider } from "@/components/ui/Pattern";
import { useSiteConfig } from "@/components/ConfigContext";
import { useLanguage } from "@/components/LanguageContext";
import ScrollReveal from "@/components/ScrollReveal";

export default function About() {
  const { config } = useSiteConfig();
  const { t, locale } = useLanguage();

  const blocks = t.about.blocks;

  return (
    <>
      {/* Hero */}
      <header className="relative bg-brown py-32 text-center text-cream md:py-48 overflow-hidden">
        <Editorial
          src={config.aboutHeroImage || "/images/about.jpg"}
          className="absolute inset-0 opacity-40 transition-transform duration-1000 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brown/90 via-brown/50 to-transparent" />
        <div className="wrap relative z-10">
          <span className="label tracking-[.3em] text-gold text-[10px] fade-up">
            {t.about.manifestoTag}
          </span>
          <h1 className="h-display mt-3 text-5xl md:text-8xl text-cream fade-up whitespace-pre-line">
            {t.about.title}
          </h1>
        </div>
      </header>

      {/* Manifesto */}
      <section className="wrap max-w-2xl py-24 text-center">
        <ScrollReveal>
          <p className="font-serif text-3xl leading-snug tracking-[.04em] md:text-5xl text-brown">
            {t.about.bornMeeting}
          </p>
          <Divider className="my-10 mx-auto" />
          <p className="text-xs md:text-sm leading-8 text-brown/75 font-light">
            {t.about.bornBody}
            <br />
            <span className="label mt-8 block text-gold text-xs tracking-[.25em]">
              {t.about.taglineBanner}
            </span>
          </p>
        </ScrollReveal>
      </section>

      {/* Optional Brand Video from Admin CMS */}
      {config.storyVideoUrl && (
        <section className="wrap max-w-4xl pb-24">
          <ScrollReveal>
            <div className="border border-brown/20 bg-black overflow-hidden shadow-xl">
              <div className="bg-brown px-4 py-2 text-[10px] uppercase tracking-widest text-sand flex justify-between items-center">
                <span>{t.about.craftFilm}</span>
                <span className="text-gold">&bull; HD</span>
              </div>
              <video
                src={config.storyVideoUrl}
                controls
                className="w-full aspect-video object-cover"
              />
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* Story Blocks with ScrollReveal */}
      {blocks.map((block, i) => (
        <ScrollReveal key={block.title} threshold={0.15}>
          <section className="grid md:grid-cols-2 border-t border-brown/10">
            <Editorial
              src={`/images/about-${i + 1}.jpg`}
              label={block.title}
              className={`aspect-[4/3] md:aspect-auto md:min-h-[560px] ${i % 2 ? "md:order-2" : ""}`}
            />
            <div className="flex flex-col justify-center px-8 py-16 md:px-20 lg:px-28">
              <p className="label tracking-[.25em] text-gold text-xs">CHAPTER 0{i + 1} &bull;</p>
              <h2 className="h-display mt-3 text-4xl md:text-5xl text-brown">{block.title}</h2>
              <p className="mt-6 max-w-md text-xs md:text-sm leading-8 text-brown/75 font-light">
                {block.desc}
              </p>
            </div>
          </section>
        </ScrollReveal>
      ))}

      {/* CTA */}
      <section className="py-24 text-center border-t border-brown/10">
        <ScrollReveal>
          <h3 className="font-serif text-3xl text-brown">{t.about.experienceCapsule}</h3>
          <p className="mt-2 text-xs text-brown/60">{t.about.experienceSubtitle}</p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/shop" className="btn btn-dark">
              {config.shopButtonLabel && locale === "en" ? config.shopButtonLabel : t.about.shopCollectionBtn}
            </Link>
            <Link href="/contact" className="btn btn-line">
              {t.about.visitAtelierBtn}
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
