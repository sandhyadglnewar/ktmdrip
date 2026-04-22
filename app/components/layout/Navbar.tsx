import { Link, useLocation, useNavigate } from "react-router";
import { useState } from "react";
import { useCart } from "~/lib/cart";
import { useAuth } from "~/lib/auth.context";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { count, toggleCart } = useCart();
  const { user, isLoggedIn } = useAuth();
  const path = location.pathname;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const navItems = [
    { to: "/men", label: "Men", className: "nav-link" },
    { to: "/women", label: "Women", className: "nav-link" },
    { to: "/sale", label: "🔥 Sale", className: "nav-link sale-link" },
    { to: "/lifestyle", label: "Lifestyle", className: "nav-link" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false);
      setSearchVal("");
    }
  };

  return (
    <nav className="nav" id="main-nav">
      <Link to="/" className="logo">KTMDrip</Link>
      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`${item.className}${path === item.to ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Search */}
        {searchOpen ? (
          <form onSubmit={handleSearch} style={{ display: "flex" }}>
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search..."
              autoFocus
              style={{ padding: "6px 12px", border: "1px solid #cec6bc", fontSize: 12, width: 160, fontFamily: "var(--font-sans)" }}
            />
          </form>
        ) : (
          <button className="cart-btn" onClick={() => setSearchOpen(true)} aria-label="Search" title="Search">
            <svg width="20" height="20" fill="none" stroke="#1a1a1a" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        )}

        {/* User */}
        <Link to={isLoggedIn ? "/profile" : "/login"} className="cart-btn" aria-label={isLoggedIn ? "Profile" : "Sign in"} title={isLoggedIn ? user?.name || "Profile" : "Sign in"} style={{ textDecoration: "none", color: "inherit" }}>
          <svg width="20" height="20" fill="none" stroke={isLoggedIn ? "#00A19B" : "#1a1a1a"} strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </Link>

        {/* Cart */}
        <button className="cart-btn" onClick={() => toggleCart(true)} id="cart-toggle" aria-label="Open cart">
          <svg width="22" height="22" fill="none" stroke="#1a1a1a" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {count > 0 && <span className="cart-count" id="cart-count">{count}</span>}
        </button>
      </div>
    </nav>
  );
}
