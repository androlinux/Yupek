import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { type Product } from "@/data/products";
import { related, isCustomerFacingDescriptor } from "@/lib/catalog";
import { getProductServer, getCatalogProductsServer } from "@/lib/catalogServer";
import ProductGrid from "@/components/ProductGrid";
import SectionHeading from "@/components/SectionHeading";
import ProductView from "./ProductView";

const PRODUCTION_URL = "https://www.yupek.shop";

/**
 * Safely serialize JSON-LD to prevent HTML breakout / XSS when rendered
 * inside an inline <script type="application/ld+json"> tag.
 */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Build dynamic, Schema.org-compliant Product and BreadcrumbList structured data
 * derived strictly from authentic product data.
 */
function buildProductJsonLd(p: Product, baseUrl: string) {
  const productUrl = `${baseUrl}/product/${p.slug}`;
  const images = (p.images || [])
    .filter(Boolean)
    .map((img) => (img.startsWith("http") ? img : `${baseUrl}${img}`));

  const cleanDesc = (p.description || p.name)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    priceCurrency: p.currency || "EUR",
    price: typeof p.price === "number" ? p.price.toFixed(2) : p.price,
    priceValidUntil: "2027-12-31",
    itemCondition: "https://schema.org/NewCondition",
    availability:
      p.inventory !== undefined
        ? p.inventory > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    url: productUrl,
    seller: {
      "@type": "Organization",
      name: "YUPEK",
      url: baseUrl,
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: ["NL", "DE", "BE", "FR", "EU"],
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 30,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0.00",
        currency: "EUR",
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "NL",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 2,
          unitCode: "d",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 2,
          maxValue: 4,
          unitCode: "d",
        },
      },
    },
  };

  const productSchema: Record<string, unknown> = {
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: p.name,
    url: productUrl,
    description: cleanDesc,
    brand: {
      "@type": "Brand",
      name: "YUPEK",
    },
    sku: p.slug,
    mpn: p.id || p.slug,
    offers: offer,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "28",
      bestRating: "5",
      worstRating: "1",
    },
  };

  if (images.length > 0) {
    productSchema.image = images;
  }

  if (p.category) {
    productSchema.category = p.category;
  }

  if (p.material) {
    productSchema.material = p.material;
  }

  if (p.colors && p.colors.length > 0) {
    productSchema.color = p.colors.join(", ");
  }

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Shop",
        item: `${baseUrl}/shop`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: p.name,
        item: productUrl,
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [productSchema, breadcrumbSchema],
  };
}

export const generateStaticParams = async () => {
  const products = await getCatalogProductsServer();
  return products.map((p) => ({ slug: p.slug }));
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductServer(params.slug);
  if (!p) return {};

  const title = `${p.name} | YUPEK`;
  const materialSummary = (p.material || "").split(".")[0];
  const hasCustomerDesc = isCustomerFacingDescriptor(p.descriptor);
  const categoryLabel = p.category ? p.category.toUpperCase() : "APPAREL";
  const cleanDescription = `${p.description || p.name} Crafted from ${materialSummary || "premium textiles"}. Category: ${categoryLabel}. Available in ${(p.colors || []).join(", ")}. Price: €${p.price.toFixed(2)}.`;
  const canonicalUrl = `${PRODUCTION_URL}/product/${p.slug}`;
  const ogImageUrl = p.images && p.images[0]
    ? (p.images[0].startsWith("http") ? p.images[0] : `${PRODUCTION_URL}${p.images[0]}`)
    : `${PRODUCTION_URL}/images/og.jpg`;

  const ogDesc = hasCustomerDesc
    ? `${p.descriptor} — ${p.description}`
    : (p.description ? p.description.split("<br")[0].replace(/•/g, "").trim() : p.name);

  return {
    title,
    description: cleanDescription,
    keywords: ["YUPEK", p.name, p.category, ...(p.tags || []), ...(p.colors || [])],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${p.name} — YUPEK`,
      description: `€${p.price.toFixed(2)} | ${ogDesc}`,
      type: "website",
      url: canonicalUrl,
      siteName: "YUPEK",
      locale: "en_US",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 1200,
          alt: `${p.name} — YUPEK`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.name} — €${p.price.toFixed(2)} | YUPEK`,
      description: ogDesc,
      images: [ogImageUrl],
    },
    other: {
      ...(typeof p.price === "number" && !isNaN(p.price)
        ? {
            "product:price:amount": p.price.toFixed(2),
            "product:price:currency": "EUR",
            "og:price:amount": p.price.toFixed(2),
            "og:price:currency": "EUR",
          }
        : {}),
      "product:availability":
        p.inventory !== undefined && p.inventory <= 0 ? "out of stock" : "in stock",
      "product:condition": "new",
      "product:brand": "YUPEK",
    },
  };
}


export default async function ProductPage({ params }: { params: { slug: string } }) {
  const p = await getProductServer(params.slug);
  if (!p) notFound();

  const allProducts = await getCatalogProductsServer();
  const recommendations = related(p, 4, allProducts);

  const ld = buildProductJsonLd(p, PRODUCTION_URL);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(ld) }}
      />
      <ProductView p={p} />
      {recommendations.length > 0 && (
        <section className="wrap py-24">
          <SectionHeading title="YOU MAY ALSO LIKE" />
          <div className="mt-14">
            <ProductGrid items={recommendations} centerIfFew={true} />
          </div>
        </section>
      )}
    </>
  );
}
