import type { Product } from "@/data/products";

export interface ProductOverride {
  price?: number;
  compareAtPrice?: number;
  badge?: string;
  featured?: boolean;
  newArrival?: boolean;
  name?: string;
  descriptor?: string;
  category?: "tees" | "shirts" | "sweatshirts" | "trousers" | "denim" | "accessories" | string;
  gender?: "men" | "women" | "unisex";
  sizes?: string[];
  colors?: string[];
  description?: string;
  material?: string;
  inventory?: number;
  images?: string[];
  deleted?: boolean;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export interface StoreOrderItem {
  slug: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  image?: string;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  items: StoreOrderItem[];
  subtotal: number;
  shipping: number;
  deliveryMethod: string;
  paymentMethod: string;
  total: number;
  status: "New" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  emailNotificationSent?: boolean;
  emailNotificationRecipient?: string;
  emailNotificationError?: string;
}

export interface SiteConfig {
  // Banner / Announcement
  announcementEnabled: boolean;
  announcementText: string;
  announcementLink: string;
  announcementBadge?: string;

  // Hero Section
  heroTitle: string;
  heroTaglineLine1: string;
  heroTaglineLine2: string;
  heroDescription: string;
  heroImage: string;
  heroVideoUrl: string;
  heroUseVideo: boolean;
  heroButtonText: string;
  heroButtonLink: string;
  heroSecondaryButtonText: string;
  heroSecondaryButtonLink: string;

  // Editorial Section
  editorialTag: string;
  editorialTitle: string;
  editorialDescription: string;
  editorialImage: string;
  editorialVideoUrl: string;
  editorialButtonText: string;
  editorialButtonLink: string;

  // Brand Story & Media
  storyVideoUrl: string;
  aboutHeroImage: string;

  // WhatsApp
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappMessage: string;
  whatsappTooltip: string;

  // Contact Form & Info
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactHours: string;
  contactVideoUrl: string;

  // Gmail & Order Notifications
  orderNotificationEmail: string;
  smtpUser?: string;
  smtpPass?: string;

  // Global Buttons & Thresholds
  freeShippingThreshold: number;
  shopButtonLabel: string;
  addToBagLabel: string;
  checkoutButtonLabel: string;

  // Dynamic Product Overrides (by slug)
  productOverrides: Record<string, ProductOverride>;

  // Custom products created in admin
  customProducts?: Product[];

  // Contact Submissions
  contactSubmissions: ContactSubmission[];

  // Store Orders
  storeOrders: StoreOrder[];

  // Admin Authentication
  adminUsername?: string;
  adminPassword?: string;

  // Last updated timestamp
  updatedAt?: string;
}

export const defaultSiteConfig: SiteConfig = {
  adminUsername: "admin",
  adminPassword: "yupek2026",
  announcementEnabled: true,
  announcementText: "COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100 — CLIENT CONCIERGE ASSISTANCE AVAILABLE",
  announcementLink: "/shop",
  announcementBadge: "SPRING CAPSULE",

  heroTitle: "YUPEK",
  heroTaglineLine1: "EASTERN ROOTS",
  heroTaglineLine2: "EUROPEAN FORM",
  heroDescription: "Contemporary architectural clothing inspired by ancient Turkmen silk heritage, tailored for modern European living.",
  heroImage: "/images/hero.jpg",
  heroVideoUrl: "https://assets.mixkit.co/videos/preview/mixkit-fashion-model-in-a-black-suit-41551-large.mp4",
  heroUseVideo: false,
  heroButtonText: "SHOP COLLECTION",
  heroButtonLink: "/shop",
  heroSecondaryButtonText: "DISCOVER YUPEK",
  heroSecondaryButtonLink: "/about",

  editorialTag: "COLLECTION 01 — THE WEAVE",
  editorialTitle: "SILK ROAD ARCHITECTURE",
  editorialDescription: "Rich historical craft meets clean architectural tailoring. Heavyweight organic cottons, natural plant-dyed hues and silk-touch drape engineered for longevity.",
  editorialImage: "/images/collection.jpg",
  editorialVideoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-tailor-working-with-fabric-41712-large.mp4",
  editorialButtonText: "EXPLORE LOOKBOOK",
  editorialButtonLink: "/lookbook",

  storyVideoUrl: "https://assets.mixkit.co/videos/preview/mixkit-tailor-measuring-and-cutting-fabric-41714-large.mp4",
  aboutHeroImage: "/images/about.jpg",

  whatsappEnabled: true,
  whatsappNumber: "+31644154126",
  whatsappMessage: "Hello YUPEK! I would like personal assistance with your collection.",
  whatsappTooltip: "Chat with Concierge",

  contactEmail: "daniyarov16@gmail.com",
  contactPhone: "+31644154126",
  contactAddress: "",
  contactHours: "Monday – Saturday: 10:00 – 19:00 CET",
  contactVideoUrl: "",
  orderNotificationEmail: "daniyarov16@gmail.com",
  smtpUser: "",
  smtpPass: "",

  freeShippingThreshold: 100,
  shopButtonLabel: "SHOP COLLECTION",
  addToBagLabel: "ADD TO BAG",
  checkoutButtonLabel: "PROCEED TO CHECKOUT",

  productOverrides: {},
  customProducts: [],
  contactSubmissions: [
    {
      id: "sub-1",
      name: "Sophie van der Meer",
      email: "sophie.vdm@example.com",
      phone: "+31 6 8123 4567",
      subject: "Sizing & Fit Advice",
      message: "Good day, I would love to inquire about sizing advice for the Silk-Inspired Shirt for an upcoming event.",
      createdAt: "2026-10-04T14:32:00Z",
      read: true
    }
  ],
  storeOrders: [
    {
      id: "ord-sample-1",
      orderNumber: "YPK-2026-7821",
      createdAt: "2026-10-05T09:15:00Z",
      customer: {
        firstName: "Alexander",
        lastName: "de Jong",
        email: "alexander.dejong@example.nl",
        phone: "+31 6 1122 3344",
        street: "Herengracht 142",
        city: "Amsterdam",
        postalCode: "1015 BN",
        country: "Netherlands",
      },
      items: [
        {
          slug: "turkmen-silk-shirt",
          name: "TURKMEN SILK-INSPIRED SHIRT",
          size: "L",
          color: "Raw Silk",
          qty: 1,
          price: 285,
          image: "/images/look-1.jpg",
        },
      ],
      subtotal: 285,
      shipping: 0,
      deliveryMethod: "Standard Courier",
      paymentMethod: "iDEAL",
      total: 285,
      status: "Processing",
      emailNotificationSent: true,
      emailNotificationRecipient: "daniyarow16@gmail.com",
    },
  ],
};

const STORAGE_KEY = "yupek_site_config_v1";

export function getLocalSiteConfig(): SiteConfig {
  if (typeof window === "undefined") return defaultSiteConfig;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSiteConfig;
    return { ...defaultSiteConfig, ...JSON.parse(raw) };
  } catch {
    return defaultSiteConfig;
  }
}

export function saveLocalSiteConfig(config: SiteConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, updatedAt: new Date().toISOString() }));
    window.dispatchEvent(new CustomEvent("yupek_config_changed", { detail: config }));
  } catch (e) {
    console.error("Failed to save site config", e);
  }
}
