"use client";
import { useState } from "react";
import { Divider } from "./ui/Pattern";
import { useLanguage } from "./LanguageContext";

export default function Newsletter() {
  const [done, setDone] = useState(false);
  const { t } = useLanguage();

  return (
    <section className="border-t border-brown/10 py-24 text-center">
      <div className="wrap max-w-xl">
        <span className="label tracking-[.3em] text-burgundy text-[10px]">{t.newsletter.tag}</span>
        <h2 className="h-display mt-2 text-3xl md:text-5xl text-brown">{t.newsletter.title}</h2>
        <Divider className="my-6 mx-auto" />
        <p className="text-xs md:text-sm text-brown/70 leading-relaxed font-light">
          {t.newsletter.subtitle}
        </p>
        {done ? (
          <div className="mt-8 border border-green-300 bg-green-50 p-4 text-green-900 text-xs tracking-wider">
            {t.newsletter.thankYou}
          </div>
        ) : (
          <form
            className="mt-8 flex border-b border-brown"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            <label htmlFor="nl-email" className="sr-only">
              {t.newsletter.emailPlaceholder || "Email"}
            </label>
            <input
              id="nl-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-label={t.newsletter.emailPlaceholder || "Email"}
              placeholder={t.newsletter.emailPlaceholder}
              className="w-full min-w-0 bg-transparent py-3 text-[11px] uppercase tracking-[.22em] text-brown placeholder:text-brown/40 focus:outline-none"
            />
            <button className="label px-3 hover:opacity-60 text-brown font-semibold whitespace-nowrap shrink-0">
              {t.newsletter.subscribeBtn}
            </button>
          </form>
        )}
        <p className="mt-3 text-[10px] text-brown/50">{t.newsletter.privacyNote}</p>
      </div>
    </section>
  );
}
