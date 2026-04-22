import { Link } from "react-router";

interface SetupNoticeProps {
  title?: string;
  message: string;
  showSeedLink?: boolean;
}

export function SetupNotice({
  title = "Run Seed First",
  message,
  showSeedLink = true,
}: SetupNoticeProps) {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 560, textAlign: "center" }}>
        <p className="section-eyebrow" style={{ marginBottom: 8 }}>Local Setup</p>
        <h1 className="auth-title">{title}</h1>
        <p style={{ color: "var(--color-mid)", lineHeight: 1.8, marginBottom: 24 }}>{message}</p>
        {showSeedLink && (
          <Link to="/seed" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>
            Run /seed
          </Link>
        )}
      </div>
    </div>
  );
}
