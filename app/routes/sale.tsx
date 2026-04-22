import { useState } from "react";
import type { Route } from "./+types/sale";
import { ProductGrid } from "~/components/ui/ProductGrid";
import { FilterBar } from "~/components/ui/FilterBar";
import { SetupNotice } from "~/components/ui/SetupNotice";
import { getProducts } from "~/lib/catalog.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Season Sale — Up to 37% Off — KTMDrip" },
    { name: "description", content: "Limited time offer. Up to 37% off on selected styles — while stocks last." },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  try {
    return { products: await getProducts(env as Partial<Env>, { onSale: true }), setupRequired: false as const };
  } catch (error) {
    return {
      products: [],
      setupRequired: true as const,
      setupMessage:
        error instanceof Error
          ? `${error.message} Visit /seed to load sale products into local D1.`
          : "Visit /seed to load sale products into local D1.",
    };
  }
}

export default function Sale({ loaderData }: Route.ComponentProps) {
  if (loaderData.setupRequired) {
    return <SetupNotice title="Sale Catalog Not Ready" message={loaderData.setupMessage} />;
  }

  const { products } = loaderData;
  const [sortBy, setSortBy] = useState("discount");

  const sorted = [...products].sort((a, b) => {
    if (sortBy === "discount") return (b.discount || 0) - (a.discount || 0);
    return (a.sale_price || a.price) - (b.sale_price || b.price);
  });

  return (
    <>
      {/* SALE HERO */}
      <div className="sale-hero" id="sale-hero">
        <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=85" alt="Season Sale" />
        <div className="sale-hero-content">
          <p className="sale-hero-eyebrow">Limited Time Offer</p>
          <h1>Season Sale</h1>
          <p>Up to 37% off — while stocks last</p>
        </div>
      </div>

      <section className="section" style={{ background: "#fff5f5" }} id="sale-products">
        {/* STATS */}
        <div className="sale-stats">
          <div className="sale-stat"><span className="sale-stat-icon">🔥</span><span>{products.length} Items on Sale</span></div>
          <div className="sale-stat"><span className="sale-stat-icon">💰</span><span>Up to 37% Off</span></div>
          <div className="sale-stat"><span className="sale-stat-icon">⚡</span><span>Limited Stock</span></div>
        </div>

        {/* SORT */}
        <div className="sort-row">
          <span className="sort-label">Sort By:</span>
          <FilterBar
            tags={["discount", "price"]}
            active={sortBy}
            onFilter={setSortBy}
            variant="sale"
          />
        </div>

        <ProductGrid products={sorted} />
      </section>
    </>
  );
}
