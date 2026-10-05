import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { getProduct, related } from "@/lib/catalog";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import ProductView from "./ProductView";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yupek.vercel.app";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProduct(params.slug);
  if (!p) return {};

  const title = `${p.name} — YUPEK Atelier`;
  const description = `${p.description} Tailored in Amsterdam with ${p.material}. Complimentary European shipping on orders over €100. 30-day returns.`;
  const image = p.images[0] ? (p.images[0].startsWith("http") ? p.images[0] : `${siteUrl}${p.images[0]}`) : `${siteUrl}/images/og.jpg`;

  return {
    title,
    description,
    keywords: ["YUPEK", p.name, p.category, ...p.tags, ...p.colors],
    alternates: {
      canonical: `/product/${p.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${siteUrl}/product/${p.slug}`,
      images: [
        {
          url: image,
          width: 1200,
          height: 1600,
          alt: `${p.name} by YUPEK Atelier`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProduct(params.slug);
  if (!p) notFound();

  const productImages = p.images.map((img) => (img.startsWith("http") ? img : `${siteUrl}${img}`));

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${siteUrl}/product/${p.slug}#product`,
        name: p.name,
        description: p.description,
        image: productImages,
        sku: p.slug,
        mpn: `YPK-${p.slug.toUpperCase()}`,
        brand: {
          "@type": "Brand",
          name: "YUPEK",
        },
        material: p.material,
        color: p.colors.join(", "),
        category: p.category,
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: p.price.toFixed(2),
          itemCondition: "https://schema.org/NewCondition",
          availability: "https://schema.org/InStock",
          url: `${siteUrl}/product/${p.slug}`,
          seller: {
            "@type": "Organization",
            name: "YUPEK Atelier B.V.",
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "EU",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 30,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/FreeReturn",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Shop",
            item: `${siteUrl}/shop`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: p.name,
            item: `${siteUrl}/product/${p.slug}`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <ProductView p={p} />
      <section className="wrap py-24">
        <SectionHeading title="YOU MAY ALSO LIKE" />
        <div className="mt-14">
          <ProductGrid items={related(p)} />
        </div>
      </section>
    </>
  );
}
