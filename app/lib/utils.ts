// ═══════════════════════════════════════════
// KTMDrip — Utility Functions
// ═══════════════════════════════════════════

/** Format price in Nepali Rupees */
export function formatPrice(amount: number): string {
  return `NPR ${amount.toLocaleString()}`;
}

/** Generate a URL-friendly slug from a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Get unique tags from a product list */
export function getUniqueTags(products: { tag: string }[]): string[] {
  const tags = new Set(products.map((p) => p.tag));
  return ["All", ...Array.from(tags)];
}

/** Get unique categories from a product list */
export function getUniqueCategories(products: { category: string }[]): string[] {
  const categories = new Set(products.map((p) => p.category));
  return ["All", ...Array.from(categories)];
}

/** Truncate text to a certain length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/** Generate a simple ID for client-side use */
export function generateId(): string {
  return Math.random().toString(36).slice(2, 11);
}
