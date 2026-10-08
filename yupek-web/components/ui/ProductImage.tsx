"use client";
import { useState } from "react";
import Image from "next/image";
import { Pattern } from "./Pattern";

// Renders a placeholder until a real file is loaded or if loading fails. Parent must be `relative`.
export default function ProductImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 300px",
  width,
  height,
}: {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`absolute inset-0 flex items-center justify-center bg-sand/30 ${className}`}
      >
        <Pattern className="h-10 w-10 text-brown/20" />
      </div>
    );
  }
  const fitClass = className.includes("object-") ? "" : "object-cover";
  if (width && height) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        onError={() => setHasError(true)}
        className={`${fitClass} ${className}`.trim()}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      onError={() => setHasError(true)}
      className={`${fitClass} ${className}`.trim()}
    />
  );
}
