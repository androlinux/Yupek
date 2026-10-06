// Replace this file (or lib/catalog.ts) with the YUPEK API (see yupek-backend) later.
export type Product = {
  id: string; slug: string; name: string; descriptor: string; price: number; currency: "EUR";
  category: "tees" | "shirts" | "sweatshirts" | "trousers" | "denim" | "accessories";
  gender: "men" | "women" | "unisex"; sizes: string[]; colors: string[]; description: string; material: string;
  images: string[]; // drop files in /public/products and list them here
  featured: boolean; newArrival: boolean; badge?: string; tags: string[];
  // dropshipping-ready fields (filled by supplier sync, never read by UI)
  supplier?: string; supplierProductId?: string; supplierPrice?: number; inventory?: number; shippingTime?: string;
  variants?: {
    variant_id?: string;
    title?: string;
    size?: string;
    color?: string;
    price?: number;
    price_cents?: number;
    is_enabled?: boolean;
    is_available?: boolean;
    sku?: string;
    options?: number[];
  }[];
};

const S = ["XS", "S", "M", "L", "XL", "XXL"];
const cotton = "100% organic cotton, 220 gsm. Machine wash cold, inside out. Dry flat.";
const base = { currency: "EUR" as const, images: [] as string[], gender: "unisex" as const, material: cotton };
const d = (t: string) => `${t} Clean European silhouette, subtle heritage detailing and an understated YUPEK identity.`;

export const products: Product[] = [
  { ...base, id: "1", slug: "yupek-heritage-tee", name: "YUPEK Heritage Tee", descriptor: "Everyday cotton tee", price: 49, category: "tees", sizes: S, colors: ["Black"], featured: true, newArrival: true, badge: "NEW",
    images: ["/products/product-1-1.jpg", "/products/product-1-2.jpg"],
    description: "A contemporary everyday tee inspired by the geometric language of traditional Eastern textiles. Clean European silhouette, subtle heritage detailing and an understated YUPEK identity.", tags: ["tee", "heritage", "cotton"] },
  { ...base, id: "2", slug: "yupek-eastern-oversized-tee", name: "YUPEK Eastern Oversized Tee", descriptor: "Oversized silhouette", price: 59, category: "tees", sizes: S.slice(1, 5), colors: ["Black", "Sand"], featured: true, newArrival: true,
    images: ["/products/product-2-1.jpg", "/products/product-2-2.jpg"],
    description: d("An oversized tee with a dropped shoulder and a woven-pattern back detail."), tags: ["tee", "oversized"] },
  { ...base, id: "3", slug: "yupek-heritage-sweatshirt", name: "YUPEK Heritage Sweatshirt", descriptor: "Heavyweight fleece", price: 89, category: "sweatshirts", sizes: S.slice(1, 5), colors: ["Black", "Burgundy"], featured: true, newArrival: false,
    images: ["/products/product-3-1.jpg", "/products/product-3-2.jpg"],
    description: d("A heavyweight crewneck in brushed fleece."), tags: ["sweatshirt", "fleece"], material: "80% cotton, 20% recycled polyester, 400 gsm. Wash cold, do not tumble dry." },
  { ...base, id: "4", slug: "yupek-signature-shirt", name: "YUPEK Signature Shirt", descriptor: "Relaxed woven shirt", price: 79, category: "shirts", gender: "men", sizes: S.slice(1, 5), colors: ["Ivory"], featured: true, newArrival: false,
    images: ["/products/product-4-1.jpg", "/products/product-4-2.jpg"],
    description: d("A relaxed woven shirt with a camp collar."), tags: ["shirt", "woven"], material: "100% cotton poplin. Machine wash 30°C, iron medium." },
  { ...base, id: "5", slug: "yupek-heritage-trousers", name: "YUPEK Heritage Trousers", descriptor: "Tapered everyday trouser", price: 89, category: "trousers", sizes: S.slice(1, 5), colors: ["Charcoal"], featured: false, newArrival: true, badge: "NEW",
    images: ["/products/product-5-1.jpg", "/products/product-5-2.jpg"],
    description: d("Tapered trousers cut for movement through the city."), tags: ["trousers"], material: "65% cotton, 35% linen. Machine wash 30°C." },
  { ...base, id: "6", slug: "yupek-eastern-denim", name: "YUPEK Eastern Denim", descriptor: "Straight-leg denim", price: 99, category: "denim", sizes: S.slice(1, 5), colors: ["Indigo"], featured: false, newArrival: false,
    images: ["/products/product-6-1.jpg", "/products/product-6-2.jpg"],
    description: d("Straight-leg denim in rigid indigo."), tags: ["denim", "jeans"], material: "100% cotton denim, 12 oz. Wash inside out, cold." },
  { ...base, id: "7", slug: "yupek-silk-inspired-shirt", name: "YUPEK Silk-Inspired Shirt", descriptor: "Fluid drape", price: 89, category: "shirts", gender: "women", sizes: S.slice(0, 4), colors: ["Olive", "Ivory"], featured: true, newArrival: true, badge: "NEW",
    images: ["/products/product-7-1.jpg", "/products/product-7-2.jpg"],
    description: d("A fluid shirt in a silk-like weave, inspired by the Silk Road."), tags: ["shirt", "silk"], material: "100% viscose. Hand wash cold, hang dry." },
  { ...base, id: "8", slug: "yupek-heritage-tote", name: "YUPEK Heritage Tote", descriptor: "Canvas carry-all", price: 39, category: "accessories", sizes: ["ONE SIZE"], colors: ["Natural"], featured: false, newArrival: false,
    images: ["/products/product-8-1.jpg", "/products/product-8-2.jpg"],
    description: "A sturdy canvas tote with a woven-pattern YUPEK label. Made for everyday carrying.", tags: ["tote", "bag"], material: "100% cotton canvas, 340 gsm. Spot clean." },
];
