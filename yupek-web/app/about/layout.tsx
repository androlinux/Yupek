import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Our Atelier — YUPEK",
  description:
    "Discover YUPEK: Where Silk Road textile memory meets modern European architectural tailoring in Amsterdam.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Our Atelier — YUPEK",
    description: "Eastern Roots. European Form. The story, craft, and philosophy of YUPEK Atelier.",
    url: "https://yupek.vercel.app/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
