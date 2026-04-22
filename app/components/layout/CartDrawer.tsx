import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/utils";

export function CartDrawer() {
  const { items, count, total, isOpen, toggleCart, updateQuantity } = useCart();

  return (
    <>
      <div
        className={`overlay${isOpen ? " open" : ""}`}
        id="cart-overlay"
        onClick={() => toggleCart(false)}
      />
      <div className={`drawer${isOpen ? " open" : ""}`} id="cart-drawer">
        <div className="drawer-head">
          <h3>{count > 0 ? `Your Cart (${count})` : "Your Cart"}</h3>
          <button className="drawer-close" onClick={() => toggleCart(false)} aria-label="Close cart">×</button>
        </div>
        <div className="drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty">
              <svg width="52" height="52" fill="none" stroke="#ddd" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <p style={{ marginTop: 16 }}>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image_url} alt={item.name} />
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="cart-item-cat">{item.tag || "KTMDrip"}</p>
                  <div className="cart-item-row">
                    <div className="qty-ctrl">
                      <button onClick={() => updateQuantity(item.id, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    </div>
                    <span className="cart-item-price">
                      {formatPrice((item.sale_price || item.price) * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="drawer-foot">
            <div className="drawer-subtotal">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="drawer-total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <a href="/checkout" className="btn-checkout" id="checkout-btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Checkout</a>
            <button className="btn-continue" onClick={() => toggleCart(false)}>Continue Shopping</button>
          </div>
        )}
      </div>
    </>
  );
}
