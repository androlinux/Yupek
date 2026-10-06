"use client";
import Link from "next/link";
import Image from "next/image";
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
  const isDefaultDesc =
    config.heroDescription.includes("Contemporary architectural clothing") ||
    config.heroDescription.includes("Contemporary clothing") ||
    config.heroDescription.includes("Turkmen silk heritage");
  const isDefaultBtn = config.heroButtonText === "SHOP COLLECTION";
  const isDefaultSecBtn = config.heroSecondaryButtonText === "DISCOVER YUPEK";

  const tagline1 = isDefaultTagline1 || locale === "nl" ? t.hero.tagline1 : config.heroTaglineLine1;
  const tagline2 = isDefaultTagline2 || locale === "nl" ? t.hero.tagline2 : config.heroTaglineLine2;
  const description = isDefaultDesc || locale === "nl" ? t.hero.description : config.heroDescription;
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
          <Image
            src={config.heroImage || "/images/look-2.jpg"}
            alt="YUPEK Heritage Collection"
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover object-center transition-transform duration-1000 scale-105"
          />
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

          <h1 className="fade-up mt-3 font-serif text-6xl font-light tracking-[.3em] md:text-8xl lg:text-9xl text-cream drop-shadow-md">
            {config.heroTitle || "YUPEK"}
          </h1>

          <p className="label fade-up mt-5 text-xs md:text-sm tracking-[.28em] text-sand leading-relaxed [animation-delay:150ms]">
            {tagline1}
            <span className="mx-2 text-gold">&bull;</span>
            {tagline2}
          </p>

          <p className="fade-up mt-4 max-w-lg text-sm md:text-base leading-relaxed text-cream/85 font-light [animation-delay:250ms]">
            {description}
          </p>

          {/* Action Buttons */}
          <nav aria-label="Hero actions" className="fade-up mt-8 flex flex-col gap-3.5 sm:flex-row [animation-delay:350ms]">
            <Link
              href={config.heroButtonLink || "/shop"}
              className="group relative inline-flex items-center justify-center overflow-hidden border border-cream bg-cream px-8 py-3.5 text-xs font-medium tracking-[.2em] text-brown transition-all duration-300 hover:bg-transparent hover:text-cream shadow-lg"
            >
              <span className="relative z-10">{buttonText}</span>
            </Link>{" "}
            <Link
              href={config.heroSecondaryButtonLink || "/about"}
              className="inline-flex items-center justify-center border border-cream/50 bg-brown/40 backdrop-blur-sm px-8 py-3.5 text-xs font-medium tracking-[.2em] text-cream transition-all duration-300 hover:border-cream hover:bg-cream/10"
            >
              {secondaryButtonText}
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
