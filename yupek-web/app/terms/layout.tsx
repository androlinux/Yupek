import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service & General Conditions",
  description:
    "YUPEK Terms of Service: Order formation, made-to-order production disclosures, third-party fulfillment partnerships, payment terms, and consumer rights.",
  alternates: {
    canonical: "https://www.yupek.shop/terms",
  },
  openGraph: {
    title: "Terms of Service | YUPEK",
    description:
      "General Terms & Conditions for purchases from YUPEK: made-to-order fulfillment terms, customer guarantees, and statutory withdrawal rights.",
    url: "https://www.yupek.shop/terms",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Terms of Service",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | YUPEK",
    description:
      "General Terms & Conditions for purchases from YUPEK: made-to-order fulfillment terms and consumer guarantees.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
