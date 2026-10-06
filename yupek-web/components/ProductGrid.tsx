import type { Product } from "@/data/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  items,
  cols = 4,
  priority = false,
  centerIfFew = false,
}: {
  items: Product[];
  cols?: 3 | 4;
  priority?: boolean;
  centerIfFew?: boolean;
}) {
  if (!items || items.length === 0) return null;

  if (centerIfFew && items.length === 1) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-xs md:max-w-sm">
          <ProductCard p={items[0]} priority={priority} />
        </div>
      </div>
    );
  }

  if (centerIfFew && items.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 max-w-2xl mx-auto">
        {items.map((p, i) => (
          <ProductCard key={p.id} p={p} priority={priority && i === 0} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} priority={priority && i === 0} />
      ))}
    </div>
  );
}

