import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Concierge — YUPEK",
  description:
    "Schedule a private viewing at Keizersgracht 482 Amsterdam, inquire about bespoke silk sizing, or contact our client concierge.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Concierge — YUPEK",
    description:
      "Connect with YUPEK in Amsterdam for private appointments, custom inquiries, and client assistance.",
    url: "https://www.yupek.shop/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
