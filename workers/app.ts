import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "../app/context";
import { refreshSnapshot } from "../app/lib/snapshot";

const requestHandler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);

export default {
  fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },

  // Cron trigger: reads the sheet. A failure is stored for the check page; attendees keep the last good version.
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(refreshSnapshot(env).catch((err) => console.error("Sheet refresh failed:", err)));
  },
} satisfies ExportedHandler<Env>;
