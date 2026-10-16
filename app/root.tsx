import "@fontsource/literata/600.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "./styles/app.css";

import literata600 from "@fontsource/literata/files/literata-latin-600-normal.woff2?url";
import sourceSans400 from "@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2?url";
import { isRouteErrorResponse, Links, Meta, Outlet, useLocation } from "react-router";
import { Notice, Page } from "./components/Page";
import type { Route } from "./+types/root";

export const links: Route.LinksFunction = () => [
  { rel: "preload", href: literata600, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "preload", href: sourceSans400, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

/** No <Scripts />: every page is complete server-rendered HTML, so it works the same on any phone. */
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f2f2ee" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#151311" media="(prefers-color-scheme: dark)" />
        <Meta />
        <Links />
      </head>
      <body>{children}</body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const { pathname, search } = useLocation();
  if (!notFound) console.error(error);
  return (
    <Page>
      <title>{notFound ? "Page not found" : "Announcements unavailable"}</title>
      <Notice
        heading="h1"
        title={notFound ? "This page doesn’t exist" : "The announcements can’t be shown right now"}
        action={
          <a className="text-link" href={notFound ? "/" : pathname + search}>
            {notFound ? "See all satsang locations" : "Try again"}
          </a>
        }
      >
        {notFound
          ? "The address may have a typo, or the page has moved."
          : "The list of programs is temporarily unavailable. Please try again in a few minutes."}
      </Notice>
    </Page>
  );
}
