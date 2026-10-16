import { createContext } from "react-router";

/** Cloudflare bindings and execution context, made available to loaders and actions. */
export interface CloudflareContext {
  env: Env;
  ctx: ExecutionContext;
}

export const cloudflareContext = createContext<CloudflareContext>();
