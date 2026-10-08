import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & Fulfillment Policy",
  description: "Guidance on YUPEK made-to-order production timelines, carrier handling, delivery regions, and transparent European shipping rates.",
  alternates: {
    canonical: "https://www.yupek.shop/shipping",
  },
};

export default function ShippingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
