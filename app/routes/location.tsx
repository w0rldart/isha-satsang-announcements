import { data, redirect } from "react-router";
import { LocationPicker } from "../components/LocationPicker";
import { Notice, Page } from "../components/Page";
import { Tile } from "../components/Tile";
import { cloudflareContext } from "../context";
import { today } from "../lib/dates";
import { getSnapshot } from "../lib/snapshot";
import { findLocation, locationsByCountry, programsAt } from "../lib/view";
import { pageMeta } from "../meta";
import type { Route } from "./+types/location";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const snapshot = await getSnapshot(env);
  const url = new URL(request.url);
  const origin = url.origin;
  const headers = { "Cache-Control": "public, max-age=60" };
  const location = findLocation(snapshot, params.location);

  if (!location) {
    const groups = locationsByCountry(snapshot, today());
    return data({ origin, view: "unknown" as const, groups }, { status: 404, headers });
  }
  // One address per location: /London, /london/ and /Z%C3%BCrich go to /london and /zurich.
  if (params.location !== location.slug || url.pathname.endsWith("/")) {
    throw redirect(`/${encodeURIComponent(location.slug)}`, 301);
  }

  const programs = programsAt(snapshot, location, today());
  return data({ origin, view: "location" as const, location, programs, version: snapshot.fingerprint }, { headers });
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (loaderData?.view !== "location") return pageMeta({ origin: loaderData?.origin, title: "Location not found" });
  const { name } = loaderData.location;
  return pageMeta({
    origin: loaderData.origin,
    title: name,
    description: `Programs announced at the ${name} satsang.`,
  });
}

export default function Location({ loaderData }: Route.ComponentProps) {
  if (loaderData.view === "unknown") {
    return (
      <Page>
        <LocationPicker groups={loaderData.groups} notFound />
      </Page>
    );
  }

  const { location, programs, version } = loaderData;
  return (
    <Page>
      <div className="place-head">
        <h1 className="place-name">{location.name}</h1>
        {programs.length > 0 && (
          <p className="place-meta">
            {programs.length === 1 ? "1 program announced" : `${programs.length} programs announced`}
          </p>
        )}
        <a className="change-link" href="/">
          Change location
        </a>
      </div>

      {programs.length > 0 ? (
        <div className="tiles">
          {programs.map((program, i) => (
            <Tile key={program.row} program={program} version={version} first={i === 0} />
          ))}
        </div>
      ) : (
        <Notice title={`Nothing is announced for ${location.name} right now`}>
          New programs are announced at each satsang. Check back after the next one.
        </Notice>
      )}
    </Page>
  );
}
