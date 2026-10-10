"use client";
import React, { useEffect, useRef, useState, ReactNode, ElementType } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  direction?: "up" | "fade" | "scale" | "left" | "right";
  threshold?: number;
  as?: ElementType;
}

export default function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  durationMs = 750,
  direction = "up",
  threshold = 0.1,
  as: Component = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  const getTransitionStyle = () => {
    const base = "transition-all ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu ";
    if (!isVisible) {
      if (direction === "up") return base + "opacity-0 translate-y-7";
      if (direction === "scale") return base + "opacity-0 scale-[0.96]";
      if (direction === "left") return base + "opacity-0 -translate-x-6";
      if (direction === "right") return base + "opacity-0 translate-x-6";
      return base + "opacity-0";
    }
    return base + "opacity-100 translate-y-0 translate-x-0 scale-100";
  };

  return (
    <Component
      ref={ref}
      style={{
        transitionDelay: `${delayMs}ms`,
        transitionDuration: `${durationMs}ms`,
      }}
      className={`${getTransitionStyle()} ${className}`}
    >
      {children}
    </Component>
  );
}

