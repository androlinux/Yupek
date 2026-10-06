import Image from "next/image";
import { Pattern } from "./Pattern";

// Renders a placeholder until a real file is listed in data/products.ts. Parent must be `relative`.
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
  if (!src) {
    return (
      <div role="img" aria-label={alt} className={`absolute inset-0 flex items-center justify-center bg-sand/40 ${className}`}>
        <Pattern className="h-12 w-12 text-brown/25" />
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
      className={`${fitClass} ${className}`.trim()}
    />
  );
}
