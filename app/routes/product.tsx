import { useState, useCallback } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/product";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/utils";
import { ProductGrid } from "~/components/ui/ProductGrid";
import { SetupNotice } from "~/components/ui/SetupNotice";
import { addProductReview, getProductBySlug, getProductReviews, getRelatedProducts } from "~/lib/catalog.server";
import { getCurrentUser } from "~/lib/auth.server";

export function meta({ data }: Route.MetaArgs) {
  const product = data?.product;
  return [
    { title: product ? `${product.name} — KTMDrip` : "Product — KTMDrip" },
    { name: "description", content: product?.description || "KTMDrip product" },
  ];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  try {
    const [product, user] = await Promise.all([
      getProductBySlug(env as Partial<Env>, params.slug),
      getCurrentUser(request, env as Partial<Env>),
    ]);

    if (!product) {
      throw new Response("Product not found", { status: 404 });
    }

    const [related, reviewSummary] = await Promise.all([
      getRelatedProducts(env as Partial<Env>, product),
      getProductReviews(env as Partial<Env>, product.id),
    ]);

    return { product, related, user, ...reviewSummary, setupRequired: false as const };
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      product: null,
      related: [],
      user: null,
      averageRating: 0,
      reviewCount: 0,
      reviews: [],
      setupRequired: true as const,
      setupMessage:
        error instanceof Error
          ? `${error.message} Visit /seed to load products before opening product pages.`
          : "Visit /seed to load products before opening product pages.",
    };
  }
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const env = context?.cloudflare?.env || {};
  const product = await getProductBySlug(env as Partial<Env>, params.slug);
  if (!product) {
    return { reviewError: "Product not found." };
  }

  const form = await request.formData();
  const rating = Number(form.get("rating"));
  const review = String(form.get("review") || "").trim();
  const guestName = String(form.get("guest_name") || "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { reviewError: "Please choose a rating between 1 and 5." };
  }

  if (review.length < 8) {
    return { reviewError: "Please write a slightly longer review." };
  }

  const user = await getCurrentUser(request, env as Partial<Env>);
  const result = await addProductReview(env as Partial<Env>, {
    productId: product.id,
    user,
    rating,
    review,
    guestName,
  });

  if (!result.ok) {
    return { reviewError: result.message };
  }

  return { reviewAdded: true };
}

export default function ProductDetail({ loaderData, actionData }: Route.ComponentProps) {
  if (loaderData.setupRequired) {
    return <SetupNotice title="Product Page Not Ready" message={loaderData.setupMessage} />;
  }

  const { product, related, averageRating, reviewCount, reviews, user } = loaderData;
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
              <p className="section-eyebrow" style={{ marginBottom: 4 }}>Rating</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>
                {reviewCount > 0 ? `${averageRating.toFixed(1)} / 5 (${reviewCount} review${reviewCount === 1 ? "" : "s"})` : "No reviews yet"}
              </p>
            </div>
            <div>
              <p className="section-eyebrow" style={{ marginBottom: 4 }}>Stock</p>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{product.stock > 10 ? "In Stock" : `Only ${product.stock} left`}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="section section-light" id="product-reviews">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Community Feedback</p>
            <h2 className="section-title">Ratings & Reviews</h2>
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-summary">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 3, marginBottom: 20 }}>Customer Reviews</h3>
            {reviews.length > 0 ? (
              <div className="orders-list">
                {reviews.map((review) => (
                  <div className="order-card" key={review.id}>
                    <div className="order-card-header">
                      <span className="order-id">{review.guest_name}</span>
                      <span className="order-status" style={{ background: "var(--color-teal)" }}>
                        {"★".repeat(review.rating)}
                      </span>
                    </div>
                    <div className="order-card-body" style={{ display: "block" }}>
                      <p style={{ marginBottom: 8, color: "var(--color-dark)" }}>{review.review}</p>
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--color-mid)" }}>No reviews yet. Be the first to rate this product.</p>
            )}
          </div>

          <form method="post" className="auth-form checkout-form-col">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 3, marginBottom: 20 }}>Leave a Review</h3>

            {!user && (
              <div className="auth-field">
                <label htmlFor="guest_name">Your Name</label>
                <input type="text" name="guest_name" id="guest_name" placeholder="Guest name" required />
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="rating">Rating</label>
              <select
                name="rating"
                id="rating"
                defaultValue="5"
                style={{ width: "100%", padding: "12px 14px", border: "1px solid #cec6bc", fontSize: 14, fontFamily: "var(--font-sans)" }}
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Very Good</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Fair</option>
                <option value="1">1 - Poor</option>
              </select>
            </div>

            <div className="auth-field">
              <label htmlFor="review">Review</label>
              <textarea
                name="review"
                id="review"
                rows={4}
                minLength={8}
                placeholder="Tell other shoppers what stood out."
                style={{ width: "100%", padding: "12px 14px", border: "1px solid #cec6bc", fontSize: 14, fontFamily: "var(--font-sans)", resize: "vertical" }}
                required
              />
            </div>

            {actionData?.reviewError && <div className="auth-error">{actionData.reviewError}</div>}
            {actionData?.reviewAdded && <div className="subscribed-msg">✓ Review submitted successfully.</div>}

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }}>
              Submit Review
            </button>
          </form>
        </div>
      </section>

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
