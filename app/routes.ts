import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("men", "routes/men.tsx"),
  route("women", "routes/women.tsx"),
  route("sale", "routes/sale.tsx"),
  route("lifestyle", "routes/lifestyle.tsx"),
  route("search", "routes/search.tsx"),
  route("product/:slug", "routes/product.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("logout", "routes/logout.tsx"),
  route("profile", "routes/profile.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("admin", "routes/admin.tsx"),
  route("api/newsletter", "routes/api.newsletter.ts"),
] satisfies RouteConfig;
