import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: {
    absolute: "YUPEK — Eastern Heritage, European Style",
  },
  description:
    "Contemporary clothing inspired by Turkmen silk heritage, designed for modern European living. Discover YUPEK collections, timeless pieces and Eastern-inspired style.",
  alternates: {
    canonical: "https://www.yupek.shop/",
  },
  openGraph: {
    title: "YUPEK — Eastern Heritage, European Style",
    description:
      "Contemporary clothing inspired by Turkmen silk heritage, designed for modern European living. Discover YUPEK collections, timeless pieces and Eastern-inspired style.",
    url: "https://www.yupek.shop/",
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
      "Contemporary clothing inspired by Turkmen silk heritage, designed for modern European living. Discover YUPEK collections, timeless pieces and Eastern-inspired style.",
    images: ["https://www.yupek.shop/images/og.jpg"],
  },
};

export default function Home() {
  return <HomeClient />;
}
