import type { Metadata } from "next";
import LookbookClient from "./LookbookClient";

export const metadata: Metadata = {
  title: "Visual Lookbook — Collection 01 The Weave | YUPEK",
  description:
    "Central Asian heritage silhouettes reimagined for contemporary European life. Clean architectural lines, raw silk drape, and enduring craft.",
  alternates: {
    canonical: "/lookbook",
  },
  openGraph: {
    title: "Visual Lookbook — YUPEK Atelier",
    description: "Central Asian heritage silhouettes reimagined for contemporary European life.",
    url: "https://yupek.vercel.app/lookbook",
  },
};

export default function LookbookPage() {
  return <LookbookClient />;
}
