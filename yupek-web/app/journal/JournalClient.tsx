"use client";

import { Editorial } from "@/components/EditorialSection";
import ScrollReveal from "@/components/ScrollReveal";
import { useLanguage } from "@/components/LanguageContext";

export default function JournalClient() {
  const { t } = useLanguage();

  return (
    <div className="wrap py-16 md:py-24">
      <ScrollReveal>
        <div className="text-center max-w-xl mx-auto mb-16">
          <span className="label tracking-[.3em] text-burgundy text-[10px]">
            {t.journal.tag}
          </span>
          <h1 className="h-display mt-2 text-5xl md:text-8xl text-brown">
            {t.journal.title}
          </h1>
          <p className="mt-3 text-xs md:text-sm text-brown/70 font-light">
            {t.journal.subtitle}
          </p>
        </div>
      </ScrollReveal>

      <div className="grid gap-x-8 gap-y-16 md:grid-cols-3">
        {t.journal.posts.map((post, i) => (
          <ScrollReveal key={post.title} delayMs={i * 100}>
            <article className="group cursor-pointer">
              <div className="relative aspect-[4/5] overflow-hidden bg-sand/30 border border-brown/10">
                <Editorial
                  src={`/images/journal-${i + 1}.jpg`}
                  label={post.title}
                  className="h-full w-full aspect-[4/5] transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="mt-5 flex items-center justify-between text-[10px] uppercase tracking-widest text-brown/50">
                <span>{post.category}</span>
                <span>{post.date}</span>
              </div>
              <h2 className="mt-2 font-serif text-2xl tracking-wide text-brown group-hover:text-burgundy transition-colors">
                {post.title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-brown/70 font-light">{post.desc}</p>
              <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold font-medium group-hover:translate-x-1 transition-transform">
                <span>{t.journal.readEssay}</span>
                <span>&rarr;</span>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
