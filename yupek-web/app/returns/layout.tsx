import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy & EU Regulations",
  description:
    "Comprehensive European consumer protections: 30-day extended right of withdrawal, 2-year statutory legal conformity guarantee, and EU textile fibre safety standards.",
  alternates: {
    canonical: "https://www.yupek.shop/returns",
  },
  openGraph: {
    title: "Return Policy & EU Regulations | YUPEK",
    description:
      "European consumer protections: 30-day extended right of withdrawal, 2-year statutory conformity guarantee, and EU textile regulations.",
    url: "https://www.yupek.shop/returns",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Return Policy & EU Regulations",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Return Policy & EU Regulations | YUPEK",
    description:
      "European consumer protections: 30-day extended right of withdrawal, 2-year statutory conformity guarantee, and EU textile regulations.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
