import type { ReactNode } from "react";
import Image from "next/image";
import { Pattern } from "./ui/Pattern";

export function Editorial({
  src,
  label,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: {
  src: string;
  label?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-sand/50 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={label || "YUPEK editorial"}
          fill
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          sizes={sizes}
          quality={85}
          className="object-cover object-center"
        />
      ) : null}
      <Pattern className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-brown/15 z-10" />
    </div>
  );
}

export default function EditorialSection({
  image,
  flip = false,
  children,
}: {
  image: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid md:grid-cols-12 md:items-center">
      <Editorial
        src={image}
        label="YUPEK heritage"
        sizes="(max-width: 768px) 100vw, 60vw"
        className={`aspect-[4/5] md:col-span-7 md:aspect-auto md:min-h-[720px] ${
          flip ? "md:order-2" : ""
        }`}
      />
      <div className={`px-6 py-14 md:col-span-5 md:px-16 lg:px-24 ${flip ? "md:order-1" : ""}`}>
        {children}
      </div>
    </section>
  );
}
