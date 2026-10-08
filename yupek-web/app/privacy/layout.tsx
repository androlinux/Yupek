import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how YUPEK collects, safeguards, and processes personal data strictly necessary to craft and fulfill your order under European GDPR.",
  alternates: {
    canonical: "https://www.yupek.shop/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
