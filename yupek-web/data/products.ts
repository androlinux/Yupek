// Replace this file (or lib/catalog.ts) with the YUPEK API (see yupek-backend) later.
export type ProductDetailedImage = {
  src: string;
  variant_ids?: (number | string)[];
  position?: string;
  is_default?: boolean;
};

export type Product = {
  id: string; slug: string; name: string; descriptor: string; price: number; currency: "EUR";
  category: "tees" | "shirts" | "sweatshirts" | "trousers" | "denim" | "accessories";
  gender: "men" | "women" | "unisex"; sizes: string[]; colors: string[]; description: string; material: string;
  images: string[]; // drop files in /public/products and list them here
  detailedImages?: ProductDetailedImage[];
  featured: boolean; newArrival: boolean; badge?: string; tags: string[];
  // dropshipping-ready fields (filled by supplier sync, never read by UI)
  supplier?: string; supplierProductId?: string; supplierPrice?: number; inventory?: number; shippingTime?: string;
  variants?: {
    variant_id?: string | number;
    title?: string;
    size?: string;
    color?: string;
    price_cents?: number;
    is_enabled?: boolean;
    is_available?: boolean;
    sku?: string;
    options?: number[];
  }[];
  options?: Array<{
    name: string;
    type: string;
    values: Array<{ id: number; title: string; colors?: string[] }>;
  }>;
};

export const products: Product[] = [];

