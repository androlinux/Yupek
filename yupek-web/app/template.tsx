"use client";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname]);

  return (
    <div className="relative w-full max-w-full">
      {/* Top golden luxury navigation progress glow line (0.5s) */}
      <div
        key={`progress-${pathname}`}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 right-0 z-[100] h-[2.5px] bg-gradient-to-r from-sand via-gold to-brown shadow-[0_1px_8px_rgba(168,139,74,0.35)] animate-page-progress"
      />

      {/* 0.5s Silky smooth luxury fade-up page entry */}
      <div
        key={`page-${pathname}`}
        className="animate-page-enter w-full max-w-full min-h-[calc(100vh-140px)]"
      >
        {children}
      </div>
    </div>
  );
}
