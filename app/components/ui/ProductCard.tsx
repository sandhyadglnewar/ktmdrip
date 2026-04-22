import { useState, useCallback } from "react";
import { Link } from "react-router";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/utils";
import type { Product } from "~/lib/types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const isSale = !!product.sale_price;

  const handleAdd = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      addItem(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    },
    [addItem, product]
  );

  return (
    <div className="card" id={`card-${product.id}`}>
      <Link to={`/product/${product.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
        <div className="card-img-wrap">
          <img src={product.image_url} alt={product.name} loading="lazy" />
          {isSale ? (
            <span className="card-tag sale-tag">−{product.discount}% OFF</span>
          ) : (
            <span className="card-tag">{product.tag}</span>
          )}
          <div className="card-atc">
            <button
              className={added ? "added" : ""}
              onClick={handleAdd}
              id={`atc-${product.id}`}
            >
              {added ? "✓ Added!" : "Add to Cart"}
            </button>
          </div>
        </div>
        <div className="card-body">
          <p className="card-name">{product.name}</p>
          {isSale ? (
            <div className="card-prices">
              <span className="card-sale-price">{formatPrice(product.sale_price!)}</span>
              <span className="card-orig-price">{formatPrice(product.price)}</span>
            </div>
          ) : (
            <p className="card-price">{formatPrice(product.price)}</p>
          )}
        </div>
      </Link>
    </div>
  );
}
