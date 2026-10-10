"use client";
import Link from "next/link";
import { useState } from "react";
import { useSiteConfig } from "./ConfigContext";
import { useLanguage } from "./LanguageContext";

export default function Hero() {
  const { config } = useSiteConfig();
  const { t, locale } = useLanguage();
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true);

  const hasVideo = Boolean(config.heroUseVideo && config.heroVideoUrl);

  const isDefaultTagline1 = config.heroTaglineLine1 === "EASTERN ROOTS";
  const isDefaultTagline2 = config.heroTaglineLine2 === "EUROPEAN FORM";
  const defaultSeoParagraph =
    "YUPEK is a contemporary fashion brand inspired by Eastern heritage and designed for modern European living. Discover timeless clothing that blends traditional influences with clean, modern style.";
  const isDefaultDesc =
    !config.heroDescription ||
    config.heroDescription.includes("Contemporary architectural clothing") ||
    config.heroDescription.includes("Contemporary clothing") ||
    config.heroDescription.includes("Turkmen silk heritage") ||
    config.heroDescription.includes("contemporary fashion brand");
  const isDefaultBtn = config.heroButtonText === "SHOP COLLECTION";
  const isDefaultSecBtn = config.heroSecondaryButtonText === "DISCOVER YUPEK";

  const description =
    locale === "nl"
      ? t.hero.description
      : isDefaultDesc
      ? defaultSeoParagraph
      : config.heroDescription;
  const buttonText = isDefaultBtn || locale === "nl" ? t.hero.shopBtn : config.heroButtonText;
  const secondaryButtonText = isDefaultSecBtn || locale === "nl" ? t.hero.discoverBtn : config.heroSecondaryButtonText;

  return (
    <section className="relative -mt-16 flex h-[88vh] min-h-[600px] items-end overflow-hidden bg-brown text-cream md:-mt-20 md:h-screen md:items-center">
      {/* Background Media */}
      {hasVideo ? (
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted={videoMuted}
            playsInline
            className="h-full w-full object-cover opacity-75"
            src={config.heroVideoUrl}
          />
          {/* Video Control Widget */}
          <div className="absolute bottom-6 right-6 z-20 hidden md:flex items-center gap-2 rounded-full bg-brown/50 backdrop-blur-md px-3 py-1.5 border border-cream/20 text-xs">
            <button
              onClick={() => setVideoMuted(!videoMuted)}
              className="text-[10px] uppercase tracking-wider text-cream/80 hover:text-cream transition-colors"
            >
              {videoMuted ? t.hero.unmute : t.hero.mute}
            </button>
            <span className="text-cream/30">|</span>
            <button
              onClick={() => {
                const vid = document.querySelector("video");
                if (vid) {
                  if (videoPlaying) vid.pause();
                  else vid.play();
                  setVideoPlaying(!videoPlaying);
                }
              }}
              className="text-[10px] uppercase tracking-wider text-cream/80 hover:text-cream transition-colors"
            >
              {videoPlaying ? t.hero.pause : t.hero.play}
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <picture className="block h-full w-full">
            <source
              media="(max-width: 767px)"
              type="image/avif"
              srcSet="/images/hero/hero_mobile.avif"
            />
            <source
              media="(max-width: 767px)"
              type="image/webp"
              srcSet="/images/hero/hero_mobile.webp"
            />
            <source
              type="image/avif"
              srcSet="/images/hero/hero_desktop.avif"
            />
            <img
              src="/images/hero/hero_desktop.webp"
              alt="YUPEK — Silk Inspired Style"
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center pointer-events-none select-none"
            />
          </picture>
        </div>
      )}

      {/* Cinematic Luxury Gradient Overlay */}
      <div
        className="absolute inset-0 z-10 bg-gradient-to-t from-brown/90 via-brown/40 to-brown/20 md:bg-gradient-to-r md:from-brown/85 md:via-brown/40 md:to-transparent"
        aria-hidden="true"
      />

      {/* Hero Content */}
      <div className="wrap relative z-20 pb-16 pt-24 md:pb-0 md:pt-0">
        <div className="max-w-2xl">
          <span className="inline-block border-l-2 border-gold pl-3 text-[10px] uppercase tracking-[.35em] text-sand/90 font-medium fade-up">
            {t.hero.heritageTag}
          </span>

          <div className="fade-up mt-3 font-serif text-6xl font-light tracking-[.3em] md:text-8xl lg:text-9xl text-cream drop-shadow-md">
            {config.heroTitle || "YUPEK"}
          </div>

          <h1 className="label fade-up mt-5 text-xs md:text-sm tracking-[.28em] text-sand leading-relaxed uppercase [animation-delay:150ms]">
            Eastern Heritage, European Style
          </h1>

          <p className="fade-up mt-4 max-w-lg text-sm md:text-base leading-relaxed text-cream/85 font-light [animation-delay:250ms]">
            {description}
          </p>

          {/* Action Buttons */}
          <nav aria-label="Hero actions" className="fade-up mt-8 [animation-delay:350ms]">
            <ul className="flex flex-col gap-3.5 sm:flex-row">
              <li>
                <Link
                  href={config.heroButtonLink || "/shop"}
                  className="group relative inline-flex items-center justify-center overflow-hidden border border-cream bg-cream px-8 py-3.5 text-xs font-medium tracking-[.2em] text-brown transition-all duration-300 hover:bg-transparent hover:text-cream shadow-lg hover:-translate-y-[1px] active:scale-[0.97] active:translate-y-[1px]"
                >
                  <span className="relative z-10">{buttonText}</span>
                </Link>
              </li>
              <li>
                <Link
                  href={config.heroSecondaryButtonLink || "/about"}
                  className="inline-flex items-center justify-center border border-cream/50 bg-brown/40 backdrop-blur-sm px-8 py-3.5 text-xs font-medium tracking-[.2em] text-cream transition-all duration-300 hover:border-cream hover:bg-cream/10 shadow-sm hover:-translate-y-[1px] active:scale-[0.97] active:translate-y-[1px]"
                >
                  {secondaryButtonText}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}
