import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import SearchOverlay from "@/components/SearchOverlay";
import { Analytics } from "@vercel/analytics/next";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yupek.vercel.app";
const title = "YUPEK — Eastern Roots / European Form";
const description =
  "Contemporary architectural clothing inspired by ancient Turkmen silk heritage, tailored for modern European living. Handcrafted fabrics, organic cottons, plant dyes, and sustainable European couture standards.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | YUPEK Atelier",
  },
  description,
  keywords: [
    "YUPEK",
    "YUPEK Atelier",
    "Turkmen Silk",
    "Eastern Heritage Fashion",
    "European Tailoring",
    "Architectural Clothing",
    "Amsterdam Fashion",
    "Sustainable Silk",
    "Luxury Capsule",
    "Organic Cotton Fashion",
  ],
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/?lang=en",
      "nl-NL": "/?lang=nl",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "fashion",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/images/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/images/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title,
    description,
    siteName: "YUPEK Atelier",
    type: "website",
    locale: "en_NL",
    url: siteUrl,
    images: [
      {
        url: "/images/og.jpg",
        width: 1200,
        height: 630,
        alt: "YUPEK Atelier — Eastern Roots / European Form",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#2B1D14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ClothingStore",
      "@id": `${siteUrl}/#organization`,
      name: "YUPEK Atelier B.V.",
      url: siteUrl,
      logo: `${siteUrl}/images/logo-dark.png`,
      image: `${siteUrl}/images/og.jpg`,
      description,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Keizersgracht 482",
        addressLocality: "Amsterdam",
        postalCode: "1016 GD",
        addressCountry: "NL",
      },
      telephone: "+31644154126",
      priceRange: "€€",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "10:00",
          closes: "19:00",
        },
      ],
      sameAs: ["https://instagram.com/yupek_amsterdam"],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "YUPEK Atelier",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/shop?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[90] focus:bg-cream focus:text-brown focus:border focus:border-gold focus:p-3 focus:shadow-xl font-medium text-xs tracking-wider uppercase"
          >
            Skip to main content
          </a>
          <AnnouncementBar />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
          <SearchOverlay />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
