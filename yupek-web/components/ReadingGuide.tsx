"use client";

import { useEffect, useState } from "react";

/**
 * ReadingGuide: An interactive line-by-line reading ruler and focus mask.
 * Smoothly follows the cursor/pointer to reduce visual clutter and prevent line-skipping,
 * particularly for readers with dyslexia, ADHD, or visual impairment.
 */
export default function ReadingGuide() {
  const [y, setY] = useState<number | null>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setY(e.clientY);
    };

    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  if (y === null) return null;

  const barHeight = 84;
  const halfBar = barHeight / 2;
  const topCut = Math.max(0, y - halfBar);
  const bottomStart = y + halfBar;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[9999] transition-opacity duration-200"
    >
      {/* Top Mask */}
      <div
        className="absolute top-0 left-0 right-0 bg-black/45 backdrop-blur-[0.5px] transition-all duration-75"
        style={{ height: `${topCut}px` }}
      />

      {/* Focused Reading Slot */}
      <div
        className="absolute left-0 right-0 border-y-2 border-gold/80 bg-gold/5 shadow-[0_0_20px_rgba(196,154,69,0.25)] transition-all duration-75"
        style={{
          top: `${topCut}px`,
          height: `${barHeight}px`,
        }}
      >
        <div className="wrap h-full flex items-center justify-end">
          <span className="text-[9px] uppercase tracking-[.25em] text-gold font-mono font-semibold bg-brown/90 px-2 py-0.5 border border-gold/40 shadow-sm">
            Focus Guide
          </span>
        </div>
      </div>

      {/* Bottom Mask */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-black/45 backdrop-blur-[0.5px] transition-all duration-75"
        style={{ top: `${bottomStart}px` }}
      />
    </div>
  );
}
