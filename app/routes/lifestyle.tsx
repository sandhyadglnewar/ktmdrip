import type { Route } from "./+types/lifestyle";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Lifestyle — Coming Soon — KTMDrip" },
    { name: "description", content: "Home goods, ceramics, candles & more — dropping soon." },
  ];
}

export default function Lifestyle() {
  return (
    <div className="coming-soon" id="lifestyle-coming-soon">
      <p className="section-eyebrow" style={{ marginBottom: 10 }}>Coming Soon</p>
      <h2>Lifestyle Collection</h2>
      <p>Home goods, ceramics, candles & more — dropping soon.</p>
    </div>
  );
}
