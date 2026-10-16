import { data } from "react-router";
import { LocationPicker } from "../components/LocationPicker";
import { Page } from "../components/Page";
import { cloudflareContext } from "../context";
import { today } from "../lib/dates";
import { getSnapshot } from "../lib/snapshot";
import { locationsByCountry } from "../lib/view";
import { pageMeta } from "../meta";
import type { Route } from "./+types/home";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const snapshot = await getSnapshot(env);
  return data(
    { origin: new URL(request.url).origin, groups: locationsByCountry(snapshot, today()) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  return pageMeta({ origin: loaderData?.origin, description: "Programs announced at satsang. Choose your location." });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <Page>
      <LocationPicker groups={loaderData.groups} />
    </Page>
  );
}
