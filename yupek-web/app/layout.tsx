import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import Providers from "@/components/Providers";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

const CartDrawer = dynamic(() => import("@/components/CartDrawer"), { ssr: false });
const SearchOverlay = dynamic(() => import("@/components/SearchOverlay"), { ssr: false });

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

const siteUrl = "https://www.yupek.shop";
const title = "YUPEK — Eastern Heritage, European Style";
const description =
  "Contemporary fashion blending ancient Eastern silk heritage with refined European tailoring. Architectural silhouettes crafted from organic cotton, linen, and artisanal textiles.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | YUPEK",
  },
  description,
  alternates: {
    canonical: siteUrl,
    languages: {
      "en-US": `${siteUrl}/?lang=en`,
      "nl-NL": `${siteUrl}/?lang=nl`,
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
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title,
    description,
    siteName: "YUPEK",
    type: "website",
    locale: "en_US",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/images/og.jpg`,
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [`${siteUrl}/images/og.jpg`],
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
      "@type": "OnlineStore",
      "@id": `${siteUrl}/#organization`,
      name: "YUPEK",
      url: siteUrl,
      logo: `${siteUrl}/images/logo-dark.png`,
      image: `${siteUrl}/images/og.jpg`,
      description,
      telephone: "+31644154126",
      email: "daniyarov16@gmail.com",
      priceRange: "€€",
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+31644154126",
          contactType: "customer service",
          email: "daniyarov16@gmail.com",
          availableLanguage: ["en", "nl"],
        },
      ],
      sameAs: ["https://instagram.com/yupek_amsterdam"],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "YUPEK",
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
