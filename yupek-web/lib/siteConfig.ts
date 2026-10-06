import type { Product } from "@/data/products";
import initialSiteConfig from "@/data/site-config.json";

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
  adminUsername: initialSiteConfig.adminUsername || "admin",
  adminPassword: initialSiteConfig.adminPassword || "yupek2026",
  announcementEnabled: initialSiteConfig.announcementEnabled ?? true,
  announcementText: initialSiteConfig.announcementText || "COMPLIMENTARY SHIPPING ACROSS EUROPE ON ORDERS OVER €100 — CLIENT CONCIERGE ASSISTANCE AVAILABLE",
  announcementLink: initialSiteConfig.announcementLink || "/shop",
  announcementBadge: initialSiteConfig.announcementBadge || "SPRING CAPSULE",

  heroTitle: initialSiteConfig.heroTitle || "YUPEK",
  heroTaglineLine1: initialSiteConfig.heroTaglineLine1 || "EASTERN ROOTS",
  heroTaglineLine2: initialSiteConfig.heroTaglineLine2 || "EUROPEAN FORM",
  heroDescription: initialSiteConfig.heroDescription || "YUPEK is a contemporary fashion brand inspired by Eastern heritage and designed for modern European living. Discover timeless clothing that blends traditional influences with clean, modern style.",
  heroImage: initialSiteConfig.heroImage || "/images/look-2.jpg",
  heroVideoUrl: initialSiteConfig.heroVideoUrl || "",
  heroUseVideo: initialSiteConfig.heroUseVideo ?? false,
  heroButtonText: initialSiteConfig.heroButtonText || "SHOP COLLECTION",
  heroButtonLink: initialSiteConfig.heroButtonLink || "/shop",
  heroSecondaryButtonText: initialSiteConfig.heroSecondaryButtonText || "DISCOVER YUPEK",
  heroSecondaryButtonLink: initialSiteConfig.heroSecondaryButtonLink || "/about",

  editorialTag: initialSiteConfig.editorialTag || "COLLECTION 01 — THE WEAVE",
  editorialTitle: initialSiteConfig.editorialTitle || "SILK ROAD ARCHITECTURE",
  editorialDescription: initialSiteConfig.editorialDescription || "Rich historical craft meets clean architectural tailoring. Heavyweight organic cottons, natural plant-dyed hues and silk-touch drape engineered for longevity.",
  editorialImage: initialSiteConfig.editorialImage || "/images/look-2.jpg",
  editorialVideoUrl: initialSiteConfig.editorialVideoUrl || "",
  editorialButtonText: initialSiteConfig.editorialButtonText || "EXPLORE LOOKBOOK",
  editorialButtonLink: initialSiteConfig.editorialButtonLink || "/lookbook",

  storyVideoUrl: initialSiteConfig.storyVideoUrl || "",
  aboutHeroImage: initialSiteConfig.aboutHeroImage || "/images/about.jpg",

  whatsappEnabled: initialSiteConfig.whatsappEnabled ?? true,
  whatsappNumber: initialSiteConfig.whatsappNumber || "+31644154126",
  whatsappMessage: initialSiteConfig.whatsappMessage || "Hello YUPEK! I would like personal assistance with your collection.",
  whatsappTooltip: initialSiteConfig.whatsappTooltip || "Chat with Concierge",

  contactEmail: initialSiteConfig.contactEmail || "daniyarov16@gmail.com",
  contactPhone: initialSiteConfig.contactPhone || "+31644154126",
  contactAddress: initialSiteConfig.contactAddress || "",
  contactHours: initialSiteConfig.contactHours || "Monday – Saturday: 10:00 – 19:00 CET",
  contactVideoUrl: initialSiteConfig.contactVideoUrl || "",
  orderNotificationEmail: initialSiteConfig.orderNotificationEmail || "daniyarov16@gmail.com",
  smtpUser: initialSiteConfig.smtpUser || "",
  smtpPass: initialSiteConfig.smtpPass || "",

  freeShippingThreshold: initialSiteConfig.freeShippingThreshold ?? 100,
  shopButtonLabel: initialSiteConfig.shopButtonLabel || "SHOP COLLECTION",
  addToBagLabel: initialSiteConfig.addToBagLabel || "ADD TO BAG",
  checkoutButtonLabel: initialSiteConfig.checkoutButtonLabel || "PROCEED TO CHECKOUT",

  productOverrides: (initialSiteConfig.productOverrides as Record<string, ProductOverride>) || {},
  customProducts: [],
  contactSubmissions: (initialSiteConfig.contactSubmissions as any) || [],
  storeOrders: (initialSiteConfig.storeOrders as any) || [],
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
