import Image from "next/image";
import { Pattern } from "./Pattern";

// Renders a placeholder until a real file is listed in data/products.ts. Parent must be `relative`.
export default function ProductImage({ src, alt, className = "", priority = false, sizes = "(min-width:1024px) 25vw, 50vw" }: { src?: string; alt: string; className?: string; priority?: boolean; sizes?: string }) {
  if (!src) {
    return (
      <div role="img" aria-label={alt} className={`absolute inset-0 flex items-center justify-center bg-sand/40 ${className}`}>
        <Pattern className="h-12 w-12 text-brown/25" />
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}
