"use client";
import { useEffect, useRef, useState, ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  direction?: "up" | "fade" | "scale";
  threshold?: number;
}

export default function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  direction = "up",
  threshold = 0.12,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If intersection observer not supported or user prefers reduced motion
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const getTransitionStyle = () => {
    let base = "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ";
    if (!isVisible) {
      if (direction === "up") return base + "opacity-0 translate-y-6";
      if (direction === "scale") return base + "opacity-0 scale-[0.97]";
      return base + "opacity-0";
    }
    return base + "opacity-100 translate-y-0 scale-100";
  };

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`${getTransitionStyle()} ${className}`}
    >
      {children}
    </div>
  );
}
