import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("products/:handle", "routes/product.tsx"),
  route("collections", "routes/collections.tsx"),
  route("collections/:handle", "routes/collection.tsx"),
  route("cart", "routes/cart.tsx"),
  route("search", "routes/search.tsx"),
  route("account", "routes/account.tsx"),
  route("policies/:handle", "routes/policy.tsx"),
  route("api/reviews", "routes/api.reviews.ts"),
  route("api/checkout", "routes/api.checkout.ts"),
  route("*", "routes/catchall.tsx"),
] satisfies RouteConfig;
