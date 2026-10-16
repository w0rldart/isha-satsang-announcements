import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("check", "routes/check.tsx"),
  route("banner/:version/:row", "routes/banner.ts"),
  route(":location", "routes/location.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
