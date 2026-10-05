import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop Collection — YUPEK Atelier",
  description:
    "Explore contemporary architectural garments inspired by Eastern silk heritage. Heavyweight organic cottons, natural plant dyes, and silk-touch drape.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    title: "Shop Collection — YUPEK Atelier",
    description: "Contemporary architectural clothing inspired by Eastern heritage.",
    url: "https://yupek.vercel.app/shop",
  },
};

export default function Shop({ searchParams }: { searchParams: { category?: string; gender?: string; new?: string } }) {
  return (
    <ShopClient initial={{ category: searchParams.category, gender: searchParams.gender, isNew: searchParams.new === "1" }} />
  );
}
