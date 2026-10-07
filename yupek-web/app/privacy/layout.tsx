import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy & Data Protection",
  description:
    "YUPEK Privacy Policy: Transparent data processing, fulfillment partner disclosures, cookie standards, and European GDPR data protection rights.",
  alternates: {
    canonical: "https://www.yupek.shop/privacy",
  },
  openGraph: {
    title: "Privacy Policy | YUPEK",
    description:
      "Transparent personal data processing, print-on-demand fulfillment partner disclosures, and customer rights under European data protection standards.",
    url: "https://www.yupek.shop/privacy",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Privacy Policy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | YUPEK",
    description:
      "Transparent personal data processing, print-on-demand fulfillment partner disclosures, and customer rights.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
