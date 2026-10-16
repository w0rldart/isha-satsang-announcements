import { data, redirect } from "react-router";
import { Page } from "../components/Page";
import { TIME_ZONE } from "../config";
import { cloudflareContext } from "../context";
import { today } from "../lib/dates";
import { getRefreshError, getSnapshot, refreshSnapshot } from "../lib/snapshot";
import type { Issue } from "../lib/types";
import { isOnScreen } from "../lib/view";
import type { Route } from "./+types/check";

const clock = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE });
const time = (iso: string) => `${clock.format(new Date(iso))} UK time`;

/** Constant-time comparison, so response timing reveals nothing about the key. No key set means no access. */
function keyMatches(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  return a.byteLength === b.byteLength && crypto.subtle.timingSafeEqual(a, b);
}

function notFound(): never {
  throw data(null, { status: 404 });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!keyMatches(key, env.CHECK_KEY)) notFound();

  const [snapshot, refreshError] = await Promise.all([
    getSnapshot(env).catch((err: Error) => err),
    getRefreshError(env),
  ]);
  const now = today();
  const ok = !(snapshot instanceof Error);

  const problems = ok
    ? snapshot.issues
        // Rows whose last day has passed no longer matter to attendees.
        .filter((issue) => !issue.lastDay || issue.lastDay >= now)
        .sort((a, b) => Number(a.level === "warning") - Number(b.level === "warning") || (a.row ?? 0) - (b.row ?? 0))
    : [];

  return data(
    {
      key,
      loadError: ok ? null : snapshot.message,
      refreshError: refreshError && { since: time(refreshError.since), message: refreshError.message },
      readAt: ok ? time(snapshot.builtAt) : null,
      // Confirms a Refresh now: a forced refresh always rebuilds, so the time becomes the current time.
      justRead: ok && Date.now() - Date.parse(snapshot.builtAt) < 120_000,
      onScreen: ok ? snapshot.announcements.filter((a) => isOnScreen(a, now)).length : 0,
      problems,
    },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}

/** "Refresh now" posts the form, so the key never has to be in a link that changes anything. */
export async function action({ request, context }: Route.ActionArgs) {
  const { env } = context.get(cloudflareContext);
  const key = String((await request.formData()).get("key") ?? "");
  if (!keyMatches(key, env.CHECK_KEY)) notFound();
  // A failure is stored by refreshSnapshot and shown by the loader.
  await refreshSnapshot(env, { force: true }).catch(() => undefined);
  return redirect(`/check?${new URLSearchParams({ key })}`);
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
  return loaderHeaders;
}

export function meta() {
  return [{ title: "Check announcements" }, { name: "robots", content: "noindex" }];
}

function where(issue: Issue): string {
  return issue.row === null ? `${issue.tab} tab` : `${issue.tab}, row ${issue.row}`;
}

export default function Check({ loaderData: page }: Route.ComponentProps) {
  return (
    <Page footer={false}>
      <div className="check">
        <h1 className="check-title">Check announcements</h1>
        <p className="check-intro">What attendees see today, and anything in the sheet that needs fixing.</p>

        {page.refreshError && (
          <div className="alert alert-error" role="alert">
            <p>
              <strong>The sheet can’t be read.</strong> {page.refreshError.message}
            </p>
            <p>
              {page.readAt
                ? `Attendees still see the version read at ${page.readAt}.`
                : "Attendees see an error page until the sheet can be read."}{" "}
              Failing since {page.refreshError.since}.
            </p>
          </div>
        )}
        {page.loadError && !page.refreshError && (
          <p className="alert alert-error" role="alert">
            {page.loadError}
          </p>
        )}

        <section className="status" aria-label="Status">
          <dl className="status-list">
            <div>
              <dt>Version on screen</dt>
              <dd>
                {page.readAt ? `Read ${page.readAt}` : "Not read yet"}
                {page.justRead && <span className="just-now">Just now</span>}
              </dd>
            </div>
            <div>
              <dt>Programs on screen today</dt>
              <dd>{page.onScreen}</dd>
            </div>
          </dl>
          <div className="status-actions">
            <form method="post">
              <input type="hidden" name="key" value={page.key} />
              <button className="button button-primary" type="submit">
                Refresh now
              </button>
            </form>
            <a className="button" href="/">
              Open attendee page
            </a>
          </div>
          <p className="status-note">
            The sheet is read every 5 minutes, and Refresh now reads it straight away. Google can take a few minutes to
            publish an edit, and attendee pages update within about two minutes of a read.
          </p>
        </section>

        <section className="problems" aria-labelledby="problems-title">
          <h2 className="problems-title" id="problems-title">
            {page.problems.length === 0
              ? "Nothing to fix"
              : page.problems.length === 1
                ? "1 thing to fix"
                : `${page.problems.length} things to fix`}
          </h2>
          {page.problems.length > 0 && (
            <>
              <p className="problems-note">
                Rows marked Not shown stay off the page until they are fixed. Warnings point at something missing or not
                understood.
              </p>
              <ol className="problem-list">
                {page.problems.map((issue, i) => (
                  <li className={`problem problem-${issue.level}`} key={i}>
                    <p className="problem-where">
                      <span className="tag">{issue.level === "error" ? "Not shown" : "Warning"}</span>
                      {where(issue)}
                    </p>
                    {issue.program && <p className="problem-program">{issue.program}</p>}
                    <p className="problem-message">{issue.message}</p>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </Page>
  );
}
