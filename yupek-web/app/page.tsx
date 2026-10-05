import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: {
    absolute: "YUPEK — Eastern Heritage, European Style",
  },
  description:
    "Contemporary fashion blending ancient Eastern silk heritage with refined European tailoring. Architectural silhouettes crafted from organic cotton, linen, and artisanal textiles.",
  alternates: {
    canonical: "https://www.yupek.shop",
  },
  openGraph: {
    title: "YUPEK — Eastern Heritage, European Style",
    description:
      "Contemporary fashion blending ancient Eastern silk heritage with refined European tailoring.",
    url: "https://www.yupek.shop",
    siteName: "YUPEK",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "https://www.yupek.shop/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK — Eastern Heritage, European Style",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "YUPEK — Eastern Heritage, European Style",
    description:
      "Contemporary fashion blending ancient Eastern silk heritage with refined European tailoring.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function Home() {
  return <HomeClient />;
}
