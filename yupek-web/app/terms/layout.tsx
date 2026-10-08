import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "General terms of service governing purchases, on-demand craftsmanship, payments, and statutory consumer rights at YUPEK.",
  alternates: {
    canonical: "https://www.yupek.shop/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
