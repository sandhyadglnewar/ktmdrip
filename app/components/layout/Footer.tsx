import { Link } from "react-router";

export function Footer() {
  return (
    <footer className="footer" id="site-footer">
      <Link to="/" className="logo">KTMDrip</Link>
      <span className="footer-copy">© 2026 KTMDrip. Kathmandu, Nepal.</span>
      <div className="footer-links">
        <a href="#">Privacy</a>
        <a href="#">Returns</a>
        <a href="#">Contact</a>
      </div>
    </footer>
  );
}
