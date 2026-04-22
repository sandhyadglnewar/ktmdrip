import { useState } from "react";
import type { Route } from "./+types/women";
import { WOMEN_PRODUCTS } from "~/lib/data";
import { ProductGrid } from "~/components/ui/ProductGrid";
import { FilterBar } from "~/components/ui/FilterBar";
import { getUniqueTags } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Women's Fashion — KTMDrip" },
    { name: "description", content: "Elevated minimal pieces that move with you — from streets to evenings." },
  ];
}

export function loader({}: Route.LoaderArgs) {
  return { products: WOMEN_PRODUCTS };
}

export default function Women({ loaderData }: Route.ComponentProps) {
  const { products } = loaderData;
  const tags = getUniqueTags(products);
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All"
    ? products
    : products.filter((p) => p.tag === activeFilter);

  return (
    <>
      <div className="page-header" id="women-header">
        <p className="section-eyebrow">Collection</p>
        <h1>Women's Fashion</h1>
        <p>Elevated minimal pieces that move with you — from streets to evenings.</p>
      </div>
      <section className="section section-sand" id="women-products">
        <FilterBar tags={tags} active={activeFilter} onFilter={setActiveFilter} />
        <p className="product-count">{filtered.length} products</p>
        <ProductGrid products={filtered} />
      </section>
    </>
  );
}
