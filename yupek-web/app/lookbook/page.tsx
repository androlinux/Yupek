import type { Metadata } from "next";
import LookbookClient from "./LookbookClient";

export const metadata: Metadata = {
  title: "Visual Lookbook — Collection 01",
  description:
    "Central Asian heritage silhouettes reimagined for contemporary European life. Clean architectural lines, raw silk drape, and enduring craft.",
  alternates: {
    canonical: "https://www.yupek.shop/lookbook",
  },
  openGraph: {
    title: "Visual Lookbook — Collection 01 | YUPEK",
    description:
      "Central Asian heritage silhouettes reimagined for contemporary European life.",
    url: "https://www.yupek.shop/lookbook",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/og-lookbook.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Visual Lookbook — Collection 01",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visual Lookbook — Collection 01 | YUPEK",
    description:
      "Central Asian heritage silhouettes reimagined for contemporary European life.",
    images: ["https://www.yupek.shop/images/og-lookbook.jpg"],
  },
};

export default function LookbookPage() {
  return <LookbookClient />;
}
