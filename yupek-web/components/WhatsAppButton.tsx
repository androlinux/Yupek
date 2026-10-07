"use client";
import { useState } from "react";
import { useSiteConfig } from "./ConfigContext";
import { useLanguage } from "./LanguageContext";

export default function WhatsAppButton() {
  const { config } = useSiteConfig();
  const { t, locale } = useLanguage();
  const [hovered, setHovered] = useState(false);

  if (!config.whatsappEnabled || !config.whatsappNumber) {
    return null;
  }

  // Format number (remove spaces, plus, dashes for wa.me link)
  const cleanNumber = config.whatsappNumber.replace(/[^0-9]/g, "");
  const defaultMsg = locale === "nl" ? "Hallo YUPEK! Ik wil graag persoonlijke assistentie." : (config.whatsappMessage || "Hello YUPEK!");
  const encodedText = encodeURIComponent(defaultMsg);
  const waUrl = `https://wa.me/${cleanNumber}?text=${encodedText}`;

  const tooltipText = locale === "nl" ? t.whatsapp.tooltip : (config.whatsappTooltip || t.whatsapp.tooltip);

  return (
    <div
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Tooltip prompt */}
      <div
        aria-hidden="true"
        className={`hidden sm:flex items-center gap-2 rounded-full border border-brown/10 bg-cream/95 px-3.5 py-1.5 shadow-lg backdrop-blur transition-all duration-300 ${
          hovered ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0 pointer-events-none"
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
        <span className="text-[11px] font-medium tracking-wider text-brown">
          {tooltipText}
        </span>
      </div>

      {/* Floating button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.whatsapp.ariaLabel}
        className="group relative flex h-13 w-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition-all duration-300 hover:scale-105 hover:bg-[#20ba5a] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
        style={{ width: "52px", height: "52px" }}
      >
        {/* Subtle breathing ripple */}
        <span aria-hidden="true" className="absolute -inset-1 rounded-full bg-[#25D366]/30 animate-pulse" />

        {/* WhatsApp Official SVG */}
        <svg
          aria-hidden="true"
          className="relative h-6 w-6 fill-current transition-transform duration-300 group-hover:scale-110"
          viewBox="0 0 24 24"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12 0 2.155.57 4.178 1.564 5.928l-1.637 5.979 6.136-1.61c1.704.929 3.655 1.458 5.73 1.458 6.627 0 12-5.373 12-12s-5.373-12-12-12zm0 21.818c-1.895 0-3.655-.536-5.158-1.464l-.369-.228-3.642.956.973-3.551-.249-.396c-1.026-1.633-1.572-3.535-1.572-5.505 0-5.414 4.404-9.818 9.818-9.818 5.414 0 9.818 4.404 9.818 9.818 0 5.414-4.404 9.818-9.818 9.818z" />
        </svg>
      </a>
    </div>
  );
}
