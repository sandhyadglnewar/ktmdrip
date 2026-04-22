import { useState } from "react";
import type { Route } from "./+types/women";
import { ProductGrid } from "~/components/ui/ProductGrid";
import { FilterBar } from "~/components/ui/FilterBar";
import { SetupNotice } from "~/components/ui/SetupNotice";
import { getUniqueTags } from "~/lib/utils";
import { getProducts } from "~/lib/catalog.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Women's Fashion — KTMDrip" },
    { name: "description", content: "Elevated minimal pieces that move with you — from streets to evenings." },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  try {
    return { products: await getProducts(env as Partial<Env>, { gender: "women", onSale: false }), setupRequired: false as const };
  } catch (error) {
    return {
      products: [],
      setupRequired: true as const,
      setupMessage:
        error instanceof Error
          ? `${error.message} Visit /seed to load the product catalog into local D1.`
          : "Visit /seed to load the product catalog into local D1.",
    };
  }
}

export default function Women({ loaderData }: Route.ComponentProps) {
  if (loaderData.setupRequired) {
    return <SetupNotice title="Catalog Not Ready" message={loaderData.setupMessage} />;
  }

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
