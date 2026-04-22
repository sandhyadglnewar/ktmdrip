import { slugify } from "./utils";
import type { Order, OrderWithItems, Product, Rating, User } from "./types";

type AppEnv = Partial<Pick<Env, "DB" | "KV">>;

export interface ProductReviewSummary {
  averageRating: number;
  reviewCount: number;
  reviews: Rating[];
}

export interface CheckoutPayload {
  user: User;
  items: Array<{ id: number; quantity: number }>;
  shipping: {
    name: string;
    email: string;
    address: string;
    city: string;
    phone: string;
  };
  payment: {
    paymentIntentId: string | null;
    paymentStatus: Order["payment_status"];
    paymentMethod: string | null;
    paymentError?: string | null;
    orderStatus: Order["status"];
  };
}

export interface CheckoutResult {
  orderId: number;
  total: number;
  items: Array<{
    product_id: number;
    quantity: number;
    price: number;
  }>;
}

export interface CheckoutQuote {
  total: number;
  items: CheckoutResult["items"];
}

export interface AdminProductInput {
  name: string;
  price: number;
  sale_price: number | null;
  discount: number | null;
  category: string;
  gender: Product["gender"];
  tag: string;
  image_url: string;
  description: string;
  stock: number;
  featured: boolean;
  is_new: boolean;
}

function getDb(env: AppEnv): D1Database | null {
  return env.DB ?? null;
}

async function ensureOrderPaymentColumns(db: D1Database) {
  const statements = [
    "ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid'",
    "ALTER TABLE orders ADD COLUMN payment_method TEXT",
    "ALTER TABLE orders ADD COLUMN payment_error TEXT",
  ];

  for (const statement of statements) {
    try {
      await db.prepare(statement).run();
    } catch {
      // Column already exists or the database is already migrated.
    }
  }
}

async function attachOrderItems(db: D1Database, orders: Order[]): Promise<OrderWithItems[]> {
  if (orders.length === 0) return [];

  const orderIds = orders.map((order) => order.id);
  const placeholders = orderIds.map(() => "?").join(", ");
  const itemRows = (
    await db
      .prepare(
        `SELECT oi.order_id, oi.product_id, oi.quantity, oi.price, p.name, p.slug, p.image_url
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders})
         ORDER BY oi.order_id ASC, oi.id ASC`
      )
      .bind(...orderIds)
      .all<{
        order_id: number;
        product_id: number;
        quantity: number;
        price: number;
        name: string;
        slug: string;
        image_url: string;
      }>()
  ).results ?? [];

  const itemsByOrder = new Map<number, typeof itemRows>();
  for (const row of itemRows) {
    const rows = itemsByOrder.get(row.order_id) ?? [];
    rows.push(row);
    itemsByOrder.set(row.order_id, rows);
  }

  return orders.map((order) => {
    const items = (itemsByOrder.get(order.id) ?? []).map((item) => ({
      product_id: item.product_id,
      slug: item.slug,
      name: item.name,
      image_url: item.image_url,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      ...order,
      customer_label: order.shipping_name || order.guest_email || `Customer #${order.user_id ?? order.id}`,
      item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      preview_image_url: items[0]?.image_url ?? null,
      items,
    };
  });
}

function sortByCreatedAtDesc<T extends { created_at?: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

function withProductFilters(
  products: Product[],
  options: {
    gender?: Product["gender"];
    featured?: boolean;
    isNew?: boolean;
    onSale?: boolean;
    query?: string;
    limit?: number;
  } = {}
) {
  const query = options.query?.trim().toLowerCase();
  let filtered = products.filter((product) => {
    if (options.gender && product.gender !== options.gender) return false;
    if (options.featured !== undefined && Boolean(product.featured) !== options.featured) return false;
    if (options.isNew !== undefined && Boolean(product.is_new) !== options.isNew) return false;
    if (options.onSale !== undefined && Boolean(product.sale_price) !== options.onSale) return false;
    if (!query) return true;

    return [
      product.name,
      product.category,
      product.tag,
      product.description,
      product.gender,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  filtered = sortByCreatedAtDesc(filtered);
  if (options.limit) filtered = filtered.slice(0, options.limit);
  return filtered;
}

export async function getProducts(
  env: AppEnv,
  options: Parameters<typeof withProductFilters>[1] = {}
): Promise<Product[]> {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for catalog queries.");
  }

  const clauses: string[] = [];
  const bindings: Array<string | number> = [];

  if (options.gender) {
    clauses.push("gender = ?");
    bindings.push(options.gender);
  }
  if (options.featured !== undefined) {
    clauses.push("featured = ?");
    bindings.push(options.featured ? 1 : 0);
  }
  if (options.isNew !== undefined) {
    clauses.push("is_new = ?");
    bindings.push(options.isNew ? 1 : 0);
  }
  if (options.onSale !== undefined) {
    clauses.push(options.onSale ? "sale_price IS NOT NULL" : "sale_price IS NULL");
  }
  if (options.query?.trim()) {
    const query = `%${options.query.trim().toLowerCase()}%`;
    clauses.push(
      "(LOWER(name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(tag) LIKE ? OR LOWER(description) LIKE ? OR LOWER(gender) LIKE ?)"
    );
    bindings.push(query, query, query, query, query);
  }

  let sql = "SELECT * FROM products";
  if (clauses.length > 0) {
    sql += ` WHERE ${clauses.join(" AND ")}`;
  }
  sql += " ORDER BY datetime(created_at) DESC, id DESC";
  if (options.limit) {
    sql += " LIMIT ?";
    bindings.push(options.limit);
  }

  const result = await db.prepare(sql).bind(...bindings).all<Product>();
  return (result.results as Product[]) ?? [];
}

export async function getFeaturedAndNewArrivals(env: AppEnv) {
  const [featured, newArrivals] = await Promise.all([
    getProducts(env, { featured: true, limit: 4 }),
    getProducts(env, { isNew: true, limit: 4 }),
  ]);

  return { featured, newArrivals };
}

export async function getProductBySlug(env: AppEnv, slug: string): Promise<Product | null> {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for product queries.");
  }

  const result = await db.prepare("SELECT * FROM products WHERE slug = ? LIMIT 1").bind(slug).first<Product>();
  return result ?? null;
}

export async function getRelatedProducts(env: AppEnv, product: Product, limit = 4): Promise<Product[]> {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for related products.");
  }

  const result = await db
    .prepare(
      "SELECT * FROM products WHERE gender = ? AND id != ? ORDER BY featured DESC, is_new DESC, datetime(created_at) DESC LIMIT ?"
    )
    .bind(product.gender, product.id, limit)
    .all<Product>();

  return (result.results as Product[]) ?? [];
}

export async function getProductReviews(env: AppEnv, productId: number): Promise<ProductReviewSummary> {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for reviews.");
  }

  const [summary, reviewsResult] = await Promise.all([
    db
      .prepare(
        "SELECT ROUND(AVG(rating), 1) AS averageRating, COUNT(*) AS reviewCount FROM ratings WHERE product_id = ?"
      )
      .bind(productId)
      .first<{ averageRating: number | null; reviewCount: number }>(),
    db
      .prepare(
        "SELECT id, product_id, user_id, guest_name, rating, review, created_at FROM ratings WHERE product_id = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 10"
      )
      .bind(productId)
      .all<Rating>(),
  ]);

  return {
    averageRating: Number(summary?.averageRating ?? 0),
    reviewCount: Number(summary?.reviewCount ?? 0),
    reviews: (reviewsResult.results as Rating[]) ?? [],
  };
}

export async function addProductReview(
  env: AppEnv,
  input: { productId: number; user: User | null; rating: number; review: string; guestName?: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const db = getDb(env);
  if (!db) {
    return { ok: false, message: "Cloudflare D1 binding is required for reviews." };
  }

  const review = input.review.trim();
  const guestName = input.user?.name || input.guestName?.trim() || "Anonymous";

  await db
    .prepare(
      "INSERT INTO ratings (product_id, user_id, guest_name, rating, review) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(input.productId, input.user?.id ?? null, guestName, input.rating, review)
    .run();

  return { ok: true };
}

export async function getUserOrders(env: AppEnv, userId: number): Promise<OrderWithItems[]> {
  const db = getDb(env);
  if (!db) throw new Error("Cloudflare D1 binding is required for orders.");
  await ensureOrderPaymentColumns(db);

  const result = await db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 20")
    .bind(userId)
    .all<Order>();

  return attachOrderItems(db, (result.results as Order[]) ?? []);
}

export async function createOrder(env: AppEnv, payload: CheckoutPayload): Promise<CheckoutResult> {
  const db = getDb(env);
  const quote = await getCheckoutQuote(env, payload.items);

  if (!db) {
    throw new Error("Cloudflare D1 binding is required for checkout.");
  }

  await ensureOrderPaymentColumns(db);

  const orderResult = await db
    .prepare(
      "INSERT INTO orders (user_id, guest_email, status, payment_status, payment_method, total, shipping_name, shipping_address, shipping_city, shipping_phone, payment_intent_id, payment_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      payload.user.id,
      payload.shipping.email,
      payload.payment.orderStatus,
      payload.payment.paymentStatus,
      payload.payment.paymentMethod,
      quote.total,
      payload.shipping.name,
      payload.shipping.address,
      payload.shipping.city,
      payload.shipping.phone,
      payload.payment.paymentIntentId,
      payload.payment.paymentError ?? null
    )
    .run();

  const orderId = Number(orderResult.meta.last_row_id);

  await Promise.all(
    quote.items.map(async (item) => {
      await db
        .prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)")
        .bind(orderId, item.product_id, item.quantity, item.price)
        .run();
      await db
        .prepare("UPDATE products SET stock = stock - ? WHERE id = ?")
        .bind(item.quantity, item.product_id)
        .run();
    })
  );

  return { orderId, total: quote.total, items: quote.items };
}

export async function getCheckoutQuote(
  env: AppEnv,
  items: Array<{ id: number; quantity: number }>
): Promise<CheckoutQuote> {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for checkout.");
  }
  const requestedItems = items.filter((item) => item.quantity > 0);
  if (requestedItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const catalog = (
    await db
      .prepare(
        `SELECT * FROM products WHERE id IN (${requestedItems.map(() => "?").join(",")})`
      )
      .bind(...requestedItems.map((item) => item.id))
      .all<Product>()
  ).results ?? [];

  const catalogById = new Map((catalog as Product[]).map((product) => [product.id, product]));
  const normalizedItems = requestedItems.map((item) => {
    const product = catalogById.get(item.id);
    if (!product) {
      throw new Error("One or more cart items are no longer available.");
    }
    if (product.stock < item.quantity) {
      throw new Error(`Only ${product.stock} unit(s) left for ${product.name}.`);
    }

    return {
      product_id: product.id,
      quantity: item.quantity,
      price: product.sale_price ?? product.price,
    };
  });

  const total = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { total, items: normalizedItems };
}

export async function getAdminDashboard(env: AppEnv) {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for the admin dashboard.");
  }

  await ensureOrderPaymentColumns(db);

  const [productsResult, ordersResult, userCountRow, revenueRow] = await Promise.all([
    db.prepare("SELECT * FROM products ORDER BY datetime(created_at) DESC, id DESC").all<Product>(),
    db.prepare("SELECT * FROM orders ORDER BY datetime(created_at) DESC, id DESC LIMIT 20").all<Order>(),
    db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>(),
    db.prepare("SELECT COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status != 'cancelled'").first<{ revenue: number }>(),
  ]);

  const orders = await attachOrderItems(db, (ordersResult.results as Order[]) ?? []);

  return {
    products: (productsResult.results as Product[]) ?? [],
    orders,
    userCount: Number(userCountRow?.count ?? 0),
    totalRevenue: Number(revenueRow?.revenue ?? 0),
  };
}

export async function updateOrderStatus(env: AppEnv, orderId: number, status: Order["status"]) {
  const db = getDb(env);
  if (!db) throw new Error("Cloudflare D1 binding is required for order updates.");
  await ensureOrderPaymentColumns(db);

  await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, orderId).run();
}

export async function addProduct(env: AppEnv, input: AdminProductInput) {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for product creation.");
  }

  const slugBase = slugify(input.name);
  let slug = slugBase;
  let counter = 1;

  while (await db.prepare("SELECT id FROM products WHERE slug = ?").bind(slug).first()) {
    counter += 1;
    slug = `${slugBase}-${counter}`;
  }

  await db
    .prepare(
      "INSERT INTO products (name, slug, description, price, sale_price, discount, tag, category, gender, image_url, stock, featured, is_new) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      input.name,
      slug,
      input.description,
      input.price,
      input.sale_price,
      input.discount,
      input.tag,
      input.category,
      input.gender,
      input.image_url,
      input.stock,
      input.featured ? 1 : 0,
      input.is_new ? 1 : 0
    )
    .run();

  return { slug };
}

export async function updateProduct(env: AppEnv, productId: number, input: AdminProductInput) {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for product updates.");
  }

  const existing = await db
    .prepare("SELECT id, slug, name FROM products WHERE id = ? LIMIT 1")
    .bind(productId)
    .first<{ id: number; slug: string; name: string }>();

  if (!existing) {
    throw new Error("Product not found.");
  }

  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  let counter = 1;

  while (
    await db
      .prepare("SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1")
      .bind(slug, productId)
      .first()
  ) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  await db
    .prepare(
      "UPDATE products SET name = ?, slug = ?, description = ?, price = ?, sale_price = ?, discount = ?, tag = ?, category = ?, gender = ?, image_url = ?, stock = ?, featured = ?, is_new = ? WHERE id = ?"
    )
    .bind(
      input.name,
      slug,
      input.description,
      input.price,
      input.sale_price,
      input.discount,
      input.tag,
      input.category,
      input.gender,
      input.image_url,
      input.stock,
      input.featured ? 1 : 0,
      input.is_new ? 1 : 0,
      productId
    )
    .run();

  return { slug };
}

export async function deleteProduct(env: AppEnv, productId: number) {
  const db = getDb(env);
  if (!db) {
    throw new Error("Cloudflare D1 binding is required for product deletion.");
  }

  const referenced = await db
    .prepare("SELECT COUNT(*) AS count FROM order_items WHERE product_id = ?")
    .bind(productId)
    .first<{ count: number }>();

  if (Number(referenced?.count ?? 0) > 0) {
    throw new Error("This product is already attached to customer orders and cannot be deleted.");
  }

  await db.prepare("DELETE FROM products WHERE id = ?").bind(productId).run();
}
