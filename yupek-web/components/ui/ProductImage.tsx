"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Pattern } from "./Pattern";

// Renders product image with automatic fallback and error recovery. Parent must be `relative`.
export default function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 300px",
  width,
  height,
  fallbackSrc,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  fallbackSrc?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState<string | undefined>(src);
  const [hasError, setHasError] = useState(false);

  // Synchronize and reset error when src prop changes
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  const activeSrc = currentSrc || src;

  if (!activeSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`absolute inset-0 flex flex-col items-center justify-center bg-sand/20 text-brown/30 ${className}`}
      >
        <Pattern className="h-8 w-8 text-brown/25 mb-1.5" />
        <span className="text-[9px] uppercase tracking-[.2em] font-mono text-brown/40">YUPEK</span>
      </div>
    );
  }

  const fitClass = className.includes("object-") ? "" : "object-cover";

  if (width && height) {
    return (
      <Image
        src={activeSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onError={handleError}
        className={`${fitClass} ${className}`.trim()}
      />
    );
  }

  return (
    <Image
      src={activeSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={handleError}
      className={`${fitClass} ${className}`.trim()}
    />
  );
}
