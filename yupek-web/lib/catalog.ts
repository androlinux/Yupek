import { products, type Product } from "@/data/products";

export const eur = (n: number) => `€${n.toFixed(2)}`;

export const getProduct = (slug: string, list: Product[] = products) => list.find((p) => p.slug === slug);

export const related = (p: Product, n = 4, list: Product[] = products) =>
  list
    .filter((x) => x.slug !== p.slug && x.category === p.category)
    .concat(list.filter((x) => x.slug !== p.slug && x.category !== p.category))
    .slice(0, n);

export function searchProducts(q: string, list: Product[] = products): Product[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return list.filter((p) =>
    [p.name, p.category, p.description, p.descriptor, ...p.tags].join(" ").toLowerCase().includes(t)
  );
}

export type Filters = {
  category?: string;
  gender?: string;
  size?: string;
  color?: string;
  max?: number;
  isNew?: boolean;
  sort?: string;
};

export function filterProducts(f: Filters, list: Product[] = products): Product[] {
  let r = list.filter(
    (p) =>
      (!f.category || p.category === f.category) &&
      (!f.gender || p.gender === f.gender || p.gender === "unisex") &&
      (!f.size || p.sizes.includes(f.size)) &&
      (!f.color || p.colors.includes(f.color)) &&
      (!f.max || p.price <= f.max) &&
      (!f.isNew || p.newArrival)
  );
  if (f.sort === "price-asc") r = [...r].sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") r = [...r].sort((a, b) => b.price - a.price);
  else if (f.sort === "newest") r = [...r].sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
  else r = [...r].sort((a, b) => Number(b.featured) - Number(a.featured));
  return r;
}
