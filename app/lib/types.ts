// ═══════════════════════════════════════════
// KTMDrip — Type Definitions
// ═══════════════════════════════════════════

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  sale_price: number | null;
  discount: number | null;
  tag: string;
  category: string;
  gender: "men" | "women" | "unisex";
  image_url: string;
  stock: number;
  featured: number;
  is_new: number;
  created_at: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  sale_price: number | null;
  discount: number | null;
  tag: string;
  image_url: string;
  quantity: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: "customer" | "admin";
  created_at: string;
}

export interface Order {
  id: number;
  user_id: number | null;
  guest_email: string | null;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  payment_status: "unpaid" | "paid" | "action_required" | "failed";
  payment_method: string | null;
  total: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_phone: string;
  payment_intent_id: string | null;
  payment_error: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface OrderPreviewItem {
  product_id: number;
  slug: string;
  name: string;
  image_url: string;
  quantity: number;
  price: number;
}

export interface OrderWithItems extends Order {
  customer_label: string;
  item_count: number;
  preview_image_url: string | null;
  items: OrderPreviewItem[];
}

export interface Rating {
  id: number;
  product_id: number;
  user_id: number | null;
  guest_name: string;
  rating: number;
  review: string;
  created_at: string;
}

export interface NewsletterSubscriber {
  id: number;
  email: string;
  subscribed_at: string;
}

// Filter/Sort types
export type SortOption = "discount" | "price-asc" | "price-desc" | "newest";
export type GenderFilter = "men" | "women" | "all";
