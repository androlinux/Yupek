import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About YUPEK — Brand Heritage & Story",
  description:
    "Discover YUPEK: Where Silk Road textile memory meets modern European architectural tailoring in Amsterdam.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About YUPEK — Brand Heritage & Story",
    description: "Eastern Roots. European Form. The story, craft, and philosophy of YUPEK.",
    url: "https://www.yupek.shop/about",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
