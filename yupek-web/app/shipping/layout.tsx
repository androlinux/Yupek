import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Fulfillment Policy",
  description:
    "YUPEK Shipping & Fulfillment Policy: Made-to-order production times, European tracked delivery, complimentary shipping thresholds, and carrier guidelines.",
  alternates: {
    canonical: "https://www.yupek.shop/shipping",
  },
  openGraph: {
    title: "Shipping & Fulfillment Policy | YUPEK",
    description:
      "Transparent made-to-order production times, European tracked delivery, and complimentary shipping terms.",
    url: "https://www.yupek.shop/shipping",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Shipping Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shipping & Fulfillment Policy | YUPEK",
    description:
      "Transparent made-to-order production times, European tracked delivery, and complimentary shipping terms.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
