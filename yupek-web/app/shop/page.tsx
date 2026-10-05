import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop Collection — Eastern Heritage, European Style",
  description:
    "Explore the complete YUPEK collection. Contemporary garments combining Silk Road textile heritage with European architectural tailoring: organic cotton tees, relaxed shirts, and crafted denim.",
  alternates: {
    canonical: "https://www.yupek.shop/shop",
  },
  openGraph: {
    title: "Shop Collection | YUPEK",
    description:
      "Explore contemporary garments combining Silk Road textile heritage with European architectural tailoring.",
    url: "https://www.yupek.shop/shop",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/collection.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Collection — Eastern Heritage, European Style",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop Collection | YUPEK",
    description:
      "Explore contemporary garments combining Silk Road textile heritage with European architectural tailoring.",
    images: ["https://www.yupek.shop/images/collection.jpg"],
  },
};

export default function Shop({
  searchParams,
}: {
  searchParams: { category?: string; gender?: string; new?: string };
}) {
  return (
    <ShopClient
      initial={{
        category: searchParams.category,
        gender: searchParams.gender,
        isNew: searchParams.new === "1",
      }}
    />
  );
}
