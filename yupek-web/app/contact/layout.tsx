import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact & Client Concierge",
  description:
    "Connect with YUPEK for client assistance, product details, orders, and appointments.",
  alternates: {
    canonical: "https://www.yupek.shop/contact",
  },
  openGraph: {
    title: "Contact Concierge | YUPEK",
    description:
      "Connect with YUPEK for client assistance, product details, orders, and appointments.",
    url: "https://www.yupek.shop/contact",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "Contact YUPEK Concierge",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Concierge | YUPEK",
    description:
      "Connect with YUPEK for client assistance, product details, orders, and appointments.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
