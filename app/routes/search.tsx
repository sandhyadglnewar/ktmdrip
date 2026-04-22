import { useState } from "react";
import { useSearchParams } from "react-router";
import type { Route } from "./+types/search";
import { ALL_PRODUCTS } from "~/lib/data";
import { ProductGrid } from "~/components/ui/ProductGrid";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Search — KTMDrip" }];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();

  if (!q) return { products: [], query: "" };

  const products = ALL_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.tag.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q) ||
    p.gender.toLowerCase().includes(q)
  );

  return { products, query: q };
}

export default function Search({ loaderData }: Route.ComponentProps) {
  const { products, query } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: input });
  };

  return (
    <>
      <div className="page-header" id="search-header">
        <p className="section-eyebrow">Find Your Style</p>
        <h1>Search</h1>
        <form onSubmit={handleSearch} className="search-form" style={{ marginTop: 20 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search products, categories..."
            className="search-input"
            id="search-input"
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>
      </div>

      <section className="section section-sand" id="search-results">
        {query && (
          <p className="product-count">
            {products.length} result{products.length !== 1 ? "s" : ""} for "{query}"
          </p>
        )}
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : query ? (
          <div className="cart-empty" style={{ padding: "40px 0" }}>
            <p>No products found for "{query}". Try a different search.</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
