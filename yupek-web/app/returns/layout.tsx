import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy & EU Regulations",
  description: "Transparency regarding YUPEK's 30-day extended right of withdrawal, 2-year statutory conformity guarantee, and European consumer product standards.",
  alternates: {
    canonical: "https://www.yupek.shop/returns",
  },
};

export default function ReturnsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
