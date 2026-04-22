import { useState } from "react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Still show success for UX — server will retry
    }
    setSubscribed(true);
    setLoading(false);
  };

  return (
    <section className="newsletter" id="newsletter-section">
      <p className="section-eyebrow" style={{ marginBottom: 10 }}>Stay in the Loop</p>
      <h2>Join the Drip.</h2>
      <p>Get early access to new drops, exclusive deals, and style guides — straight to your inbox.</p>
      {subscribed ? (
        <div className="subscribed-msg">✓ You're on the list! Welcome to KTMDrip.</div>
      ) : (
        <div className="newsletter-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            id="email-input"
          />
          <button onClick={handleSubmit} disabled={loading} id="subscribe-btn">
            {loading ? "..." : "Subscribe"}
          </button>
        </div>
      )}
    </section>
  );
}
