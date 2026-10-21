import { data, redirect } from "react-router";
import { Browse } from "../components/Browse";
import { Page } from "../components/Page";
import { cloudflareContext } from "../context";
import { today } from "../lib/dates";
import { getSnapshot } from "../lib/snapshot";
import { clean, slugify } from "../lib/text";
import { browse } from "../lib/view";
import { pageMeta } from "../meta";
import type { Route } from "./+types/home";

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = clean(url.searchParams.get("q") ?? "").slice(0, 100);
  // A search with no words in it goes back to the plain address.
  if (url.searchParams.has("q") && !slugify(query)) throw redirect("/");

  const { env } = context.get(cloudflareContext);
  const snapshot = await getSnapshot(env);
  return data(
    { origin: url.origin, query, version: snapshot.fingerprint, ...browse(snapshot, today(), query) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  return pageMeta({
    origin: loaderData?.origin,
    title: loaderData?.query ? `Results for “${loaderData.query}”` : undefined,
    description: "Programs announced at satsang, with links to register. Search them or choose your location.",
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <Page>
      <Browse {...loaderData} />
    </Page>
  );
}
