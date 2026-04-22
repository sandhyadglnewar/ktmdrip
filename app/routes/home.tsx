import { Link } from "react-router";
import type { Route } from "./+types/home";
import { MEN_PRODUCTS, WOMEN_PRODUCTS } from "~/lib/data";
import { ProductGrid } from "~/components/ui/ProductGrid";
import { Newsletter } from "~/components/ui/Newsletter";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "KTMDrip — Define Your Own Drip" },
    { name: "description", content: "Contemporary fashion meets Kathmandu street culture. Minimal. Bold. Effortless." },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  // TODO: Replace with D1 query when database is configured
  // const db = context.cloudflare.env.DB;
  // const featured = await db.prepare("SELECT * FROM products WHERE featured = 1 LIMIT 4").all();
  const featured = [...MEN_PRODUCTS.filter(p => p.featured), ...WOMEN_PRODUCTS.filter(p => p.featured)].slice(0, 4);
  const newArrivals = [...MEN_PRODUCTS.filter(p => p.is_new), ...WOMEN_PRODUCTS.filter(p => p.is_new)].slice(0, 4);
  return { featured, newArrivals };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { featured, newArrivals } = loaderData;

  return (
    <>
      {/* HERO */}
      <section className="hero" id="hero-section">
        <img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=90" alt="KTMDrip Hero" />
        <div className="hero-line" />
        <div className="hero-content">
          <p className="hero-eyebrow">New Season · 2026</p>
          <h1>Define Your<br />Own Drip.</h1>
          <p>Contemporary fashion meets Kathmandu street culture. Minimal. Bold. Effortless.</p>
          <div className="hero-btns">
            <Link to="/men" className="btn-primary" style={{ textDecoration: "none" }}>Shop Men</Link>
            <Link to="/women" className="btn-outline" style={{ textDecoration: "none" }}>Shop Women</Link>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="section section-sand" id="featured-section">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Handpicked</p>
            <h2 className="section-title">Featured Products</h2>
          </div>
          <Link to="/men" className="view-all">View All →</Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      {/* PERKS */}
      <div className="perks" id="perks-bar">
        <div className="perk"><span className="perk-icon">🚚</span><span>Free Shipping over NPR 5,000</span></div>
        <div className="perk"><span className="perk-icon">↩</span><span>Easy 14-Day Returns</span></div>
        <div className="perk"><span className="perk-icon">📍</span><span>Locally Curated · KTM Made</span></div>
      </div>

      {/* EDITORIAL */}
      <div className="editorial" id="editorial-section">
        <Link to="/women" className="editorial-panel">
          <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=85" alt="Women's Collection" />
          <div className="editorial-label">
            <h3>Women</h3>
            <span>Shop Collection →</span>
          </div>
        </Link>
        <Link to="/men" className="editorial-panel">
          <img src="https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=85" alt="Men's Collection" />
          <div className="editorial-label">
            <h3>Men</h3>
            <span>Shop Collection →</span>
          </div>
        </Link>
      </div>

      {/* NEW ARRIVALS */}
      <section className="section section-light" id="new-arrivals-section">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Just Dropped</p>
            <h2 className="section-title">New Arrivals</h2>
          </div>
          <Link to="/women" className="view-all">View All →</Link>
        </div>
        <ProductGrid products={newArrivals} />
      </section>

      {/* SALE CTA */}
      <div className="sale-cta" id="sale-cta">
        <img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=85" alt="Sale" />
        <div className="sale-cta-content">
          <p>Limited Time</p>
          <h2>Up to 37% Off</h2>
          <Link to="/sale"><button>Shop Sale</button></Link>
        </div>
      </div>

      {/* NEWSLETTER */}
      <Newsletter />
    </>
  );
}
