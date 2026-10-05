import type { Metadata } from "next";
import ShopClient from "./ShopClient";

export const metadata: Metadata = {
  title: "Shop — YUPEK Atelier",
  description: "Contemporary pieces inspired by Eastern heritage.",
};

export default function Shop({ searchParams }: { searchParams: { category?: string; gender?: string; new?: string } }) {
  return (
    <ShopClient initial={{ category: searchParams.category, gender: searchParams.gender, isNew: searchParams.new === "1" }} />
  );
}
