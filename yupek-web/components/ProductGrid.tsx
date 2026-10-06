import type { Product } from "@/data/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  items,
  cols = 4,
  priority = false,
}: {
  items: Product[];
  cols?: 3 | 4;
  priority?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={priority && i === 0} />
      ))}
    </div>
  );
}
