import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { getProduct, related } from "@/lib/catalog";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import ProductView from "./ProductView";

const PRODUCTION_URL = "https://www.yupek.shop";

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getProduct(params.slug);
  if (!p) return {};

  const title = p.name;
  const materialSummary = p.material.split(".")[0];
  const description = `${p.description} Crafted from ${materialSummary}. Category: ${p.descriptor}. Available in ${p.colors.join(", ")}. Price: €${p.price}.`;
  const canonicalUrl = `${PRODUCTION_URL}/product/${p.slug}`;
  const ogImageUrl = p.images[0]
    ? (p.images[0].startsWith("http") ? p.images[0] : `${PRODUCTION_URL}${p.images[0]}`)
    : `${PRODUCTION_URL}/images/og.jpg`;

  return {
    title,
    description,
    keywords: ["YUPEK", p.name, p.category, ...p.tags, ...p.colors],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${p.name} | YUPEK`,
      description: `${p.descriptor} — ${p.description}`,
      type: "website",
      url: canonicalUrl,
      siteName: "YUPEK",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 1600,
          alt: `${p.name} — YUPEK`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.name} | YUPEK`,
      description: `${p.descriptor} — ${p.description}`,
      images: [ogImageUrl],
    },
  };
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const p = getProduct(params.slug);
  if (!p) notFound();

  const productImages = p.images.map((img) => (img.startsWith("http") ? img : `${PRODUCTION_URL}${img}`));

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${PRODUCTION_URL}/product/${p.slug}#product`,
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
          url: `${PRODUCTION_URL}/product/${p.slug}`,
          seller: {
            "@type": "Organization",
            name: "YUPEK B.V.",
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
            item: PRODUCTION_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Shop",
            item: `${PRODUCTION_URL}/shop`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: p.name,
            item: `${PRODUCTION_URL}/product/${p.slug}`,
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
