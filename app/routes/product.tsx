import { useState, useCallback } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/product";
import { ALL_PRODUCTS } from "~/lib/data";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/utils";
import { ProductGrid } from "~/components/ui/ProductGrid";

export function meta({ data }: Route.MetaArgs) {
  const product = data?.product;
  return [
    { title: product ? `${product.name} — KTMDrip` : "Product — KTMDrip" },
    { name: "description", content: product?.description || "KTMDrip product" },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const product = ALL_PRODUCTS.find((p) => p.slug === params.slug);
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  // Get related products (same gender, different product)
  const related = ALL_PRODUCTS
    .filter((p) => p.gender === product.gender && p.id !== product.id && !p.sale_price)
    .slice(0, 4);
  return { product, related };
}

export default function ProductDetail({ loaderData }: Route.ComponentProps) {
  const { product, related } = loaderData;
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const isSale = !!product.sale_price;

  const handleAdd = useCallback(() => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }, [addItem, product]);

  return (
    <>
      <div className="product-detail" id={`product-${product.slug}`}>
        <img className="product-detail-img" src={product.image_url} alt={product.name} />
        <div className="product-detail-info">
          <p className="section-eyebrow">{product.gender === "men" ? "Men's" : "Women's"} · {product.category}</p>
          <h1>{product.name}</h1>
          <p className="description">{product.description}</p>

          <div className="price-block">
            {isSale ? (
              <div className="card-prices" style={{ marginBottom: 8 }}>
                <span className="card-sale-price" style={{ fontSize: 24 }}>{formatPrice(product.sale_price!)}</span>
                <span className="card-orig-price" style={{ fontSize: 16 }}>{formatPrice(product.price)}</span>
                <span className="card-tag sale-tag" style={{ position: "static", marginLeft: 8 }}>−{product.discount}% OFF</span>
              </div>
            ) : (
              <p className="card-price" style={{ fontSize: 24, marginBottom: 8 }}>{formatPrice(product.price)}</p>
            )}
          </div>

          <button
            className={`btn-primary${added ? " added" : ""}`}
            onClick={handleAdd}
            style={{ marginBottom: 16, fontSize: 13, padding: "16px 40px" }}
            id="product-add-to-cart"
          >
            {added ? "✓ Added to Cart!" : "Add to Cart"}
          </button>

          <div style={{ display: "flex", gap: 24, marginTop: 32, paddingTop: 24, borderTop: "1px solid #cec6bc" }}>
            <div>
              <p className="section-eyebrow" style={{ marginBottom: 4 }}>Tag</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{product.tag}</p>
            </div>
            <div>
              <p className="section-eyebrow" style={{ marginBottom: 4 }}>Stock</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{product.stock > 10 ? "In Stock" : `Only ${product.stock} left`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* RELATED PRODUCTS */}
      {related.length > 0 && (
        <section className="section section-sand" id="related-products">
          <div className="section-header">
            <div>
              <p className="section-eyebrow">You May Also Like</p>
              <h2 className="section-title">Related Products</h2>
            </div>
            <Link to={`/${product.gender}`} className="view-all">View All →</Link>
          </div>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
