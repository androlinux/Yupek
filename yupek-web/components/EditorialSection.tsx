import type { ReactNode } from "react";
import { Pattern } from "./ui/Pattern";

// Image slot: put a file at the given path (e.g. /images/heritage.jpg); until then a brown/sand block shows.
export function Editorial({ src, label, className = "" }: { src: string; label?: string; className?: string }) {
  return (
    <div role="img" aria-label={label ?? ""} className={`relative bg-sand/50 bg-cover bg-center ${className}`} style={{ backgroundImage: `url(${src})` }}>
      <Pattern className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-brown/15" />
    </div>
  );
}

export default function EditorialSection({ image, flip = false, children }: { image: string; flip?: boolean; children: ReactNode }) {
  return (
    <section className="grid md:grid-cols-12 md:items-center">
      <Editorial src={image} label="YUPEK heritage" className={`aspect-[4/5] md:col-span-7 md:aspect-auto md:min-h-[720px] ${flip ? "md:order-2" : ""}`} />
      <div className={`px-6 py-14 md:col-span-5 md:px-16 lg:px-24 ${flip ? "md:order-1" : ""}`}>{children}</div>
    </section>
  );
}
