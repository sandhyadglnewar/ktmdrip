import { useState } from "react";
import type { Route } from "./+types/men";
import { MEN_PRODUCTS } from "~/lib/data";
import { ProductGrid } from "~/components/ui/ProductGrid";
import { FilterBar } from "~/components/ui/FilterBar";
import { getUniqueTags } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Men's Fashion — KTMDrip" },
    { name: "description", content: "Refined streetwear and contemporary essentials — built for Kathmandu's energy." },
  ];
}

export function loader({}: Route.LoaderArgs) {
  return { products: MEN_PRODUCTS };
}

export default function Men({ loaderData }: Route.ComponentProps) {
  const { products } = loaderData;
  const tags = getUniqueTags(products);
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All"
    ? products
    : products.filter((p) => p.tag === activeFilter);

  return (
    <>
      <div className="page-header" id="men-header">
        <p className="section-eyebrow">Collection</p>
        <h1>Men's Fashion</h1>
        <p>Refined streetwear and contemporary essentials — built for Kathmandu's energy.</p>
      </div>
      <section className="section section-sand" id="men-products">
        <FilterBar tags={tags} active={activeFilter} onFilter={setActiveFilter} />
        <p className="product-count">{filtered.length} products</p>
        <ProductGrid products={filtered} />
      </section>
    </>
  );
}
