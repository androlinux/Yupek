"use client";

import { Editorial } from "@/components/EditorialSection";
import ScrollReveal from "@/components/ScrollReveal";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";

const chapterImages = [
  { img1: "/images/look-1.jpg", img2: "/images/look-1b.jpg" },
  { img1: "/images/look-2.jpg", img2: "/images/look-2b.jpg" },
  { img1: "/images/look-3.jpg", img2: "/images/collection.jpg" },
  { img1: "/images/look-4.jpg", img2: "/images/look-4b.jpg" },
  { img1: "/images/look-5.jpg", img2: "/images/look-5b.jpg" },
];

export default function LookbookClient() {
  const { t } = useLanguage();

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="wrap py-16 md:py-24 text-center">
        <span className="label tracking-[.3em] text-burgundy text-[10px]">
          {t.lookbook.tag}
        </span>
        <h1 className="h-display mt-2 text-5xl md:text-8xl text-brown">
          {t.lookbook.title}
        </h1>
        <p className="mt-4 text-xs md:text-sm text-brown/70 max-w-md mx-auto">
          {t.lookbook.subtitle}
        </p>
      </header>

      {/* Chapters */}
      <div className="space-y-16 md:space-y-28">
        {t.lookbook.chapters.map((c, i) => {
          const imgs = chapterImages[i] || chapterImages[0];
          return (
            <ScrollReveal key={c.title} threshold={0.15}>
              <section className="wrap grid min-h-[75vh] items-center gap-8 md:grid-cols-12">
                <div className={`md:col-span-4 ${i % 2 ? "md:order-3 md:text-right" : ""}`}>
                  <p className="label tracking-[.25em] text-gold text-xs">
                    {t.lookbook.chapter} 0{i + 1} &bull;
                  </p>
                  <h2 className="h-display mt-3 text-5xl md:text-7xl text-brown">{c.title}</h2>
                  <p className="mt-4 text-xs text-brown/70 leading-relaxed font-light">{c.subtitle}</p>
                  <div className="mt-6">
                    <Link href="/shop" className="label text-xs underline underline-offset-4 text-brown hover:text-burgundy">
                      {t.lookbook.shopThisLook}
                    </Link>
                  </div>
                </div>

                <div className={`aspect-[3/4] overflow-hidden md:col-span-5 shadow-sm border border-brown/10 ${i % 2 ? "md:order-1" : ""}`}>
                  <Editorial
                    src={imgs.img1}
                    label={c.title}
                    className="h-full w-full aspect-[3/4] transition-transform duration-1000 hover:scale-105"
                  />
                </div>

                <div className={`hidden aspect-[3/4] overflow-hidden md:col-span-3 md:block shadow-sm border border-brown/10 ${
                  i % 2 ? "md:order-2" : "md:mt-24"
                }`}>
                  <Editorial
                    src={imgs.img2}
                    label={`${c.title} detail`}
                    className="h-full w-full aspect-[3/4] transition-transform duration-1000 hover:scale-105"
                  />
                </div>
              </section>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
