import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { getProduct, related } from "@/lib/catalog";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import ProductView from "./ProductView";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProduct(params.slug);
  if (!p) return {};
  return { title: `${p.name} — YUPEK`, description: p.description, openGraph: { title: p.name, description: p.description, images: p.images[0] ? [p.images[0]] : undefined } };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProduct(params.slug);
  if (!p) notFound();
  const ld = { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, brand: { "@type": "Brand", name: "YUPEK" }, offers: { "@type": "Offer", priceCurrency: "EUR", price: p.price.toFixed(2), availability: "https://schema.org/InStock" } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ProductView p={p} />
      <section className="wrap py-24">
        <SectionHeading title="YOU MAY ALSO LIKE" />
        <div className="mt-14"><ProductGrid items={related(p)} /></div>
      </section>
    </>
  );
}
