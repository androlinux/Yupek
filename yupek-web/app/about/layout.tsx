import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Heritage & Philosophy",
  description:
    "Discover the story of YUPEK: uniting Silk Road textile memory with modern European architectural tailoring in Amsterdam.",
  alternates: {
    canonical: "https://www.yupek.shop/about",
  },
  openGraph: {
    title: "About YUPEK — Eastern Heritage, European Style",
    description:
      "Uniting Silk Road textile memory with modern European architectural tailoring.",
    url: "https://www.yupek.shop/about",
    siteName: "YUPEK",
    type: "website",
    images: [
      {
        url: "https://www.yupek.shop/images/about.jpg",
        width: 1200,
        height: 630,
        alt: "About YUPEK — Brand Heritage & Story",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About YUPEK — Eastern Heritage, European Style",
    description:
      "Uniting Silk Road textile memory with modern European architectural tailoring.",
    images: ["https://www.yupek.shop/images/about.jpg"],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
