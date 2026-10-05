import type { Metadata } from "next";
import JournalClient from "./JournalClient";

export const metadata: Metadata = {
  title: "Journal — Chronicles & Essays",
  description:
    "Essays on Silk Road heritage, textile geometry, and contemporary European tailoring from YUPEK.",
  alternates: {
    canonical: "https://www.yupek.shop/journal",
  },
  openGraph: {
    title: "Journal — YUPEK Chronicles",
    description:
      "Essays on Silk Road heritage, textile geometry, and contemporary European tailoring from YUPEK.",
    url: "https://www.yupek.shop/journal",
    siteName: "YUPEK",
    type: "article",
    images: [
      {
        url: "https://www.yupek.shop/images/journal-1.jpg",
        width: 1200,
        height: 800,
        alt: "YUPEK Journal Chronicles",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Journal — YUPEK Chronicles",
    description:
      "Essays on Silk Road heritage, textile geometry, and contemporary European tailoring from YUPEK.",
    images: ["https://www.yupek.shop/images/journal-1.jpg"],
  },
};

export default function JournalPage() {
  return <JournalClient />;
}
