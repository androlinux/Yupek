import type { Metadata } from "next";
import LookbookClient from "./LookbookClient";

export const metadata: Metadata = {
  title: "Lookbook — YUPEK Atelier",
  description: "Central Asian heritage silhouettes reimagined for contemporary European life.",
};

export default function LookbookPage() {
  return <LookbookClient />;
}
