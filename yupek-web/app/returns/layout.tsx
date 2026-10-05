import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy & EU Regulations — YUPEK",
  description:
    "Comprehensive European consumer protections: 30-day extended right of withdrawal, 2-year statutory legal conformity guarantee, and EU textile fibre safety standards.",
  alternates: {
    canonical: "/returns",
  },
  openGraph: {
    title: "Return Policy & EU Regulations — YUPEK",
    description:
      "Full transparency regarding our 30-day extended right of withdrawal, 2-year statutory legal guarantee, and EU textile regulations.",
    url: "https://yupek.vercel.app/returns",
  },
};

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
