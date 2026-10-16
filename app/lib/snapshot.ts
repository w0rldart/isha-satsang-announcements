import { buildSnapshot } from "./sheet";
import { readSheet } from "./source";
import type { RefreshError, Snapshot } from "./types";

const SNAPSHOT_KEY = "snapshot";
const ERROR_KEY = "refresh-error";

/**
 * Reads the sheet and stores a validated snapshot in KV. Runs from the cron trigger and from "Refresh now".
 * An unchanged sheet is not processed again unless forced. On failure the stored snapshot stays as it was,
 * so attendees keep seeing the last good version, and the error is kept for the check page.
 */
export async function refreshSnapshot(env: Env, { force = false } = {}): Promise<Snapshot> {
  try {
    const stored = force ? null : await env.SNAPSHOTS.get<Snapshot>(SNAPSHOT_KEY, "json");
    const snapshot = await readSnapshot(env, stored);
    if (snapshot !== stored) await env.SNAPSHOTS.put(SNAPSHOT_KEY, JSON.stringify(snapshot));
    if (await getRefreshError(env)) await env.SNAPSHOTS.delete(ERROR_KEY);
    return snapshot;
  } catch (err) {
    await recordError(env, err instanceof Error ? err.message : String(err)).catch(() => undefined);
    throw err;
  }
}

/**
 * The stored snapshot. Right after the first deploy KV is still empty, so the sheet is read for this request.
 * Saving it is left to the next scheduled refresh: many first visitors at once would all write the same key.
 */
export async function getSnapshot(env: Env): Promise<Snapshot> {
  const stored = await env.SNAPSHOTS.get<Snapshot>(SNAPSHOT_KEY, { type: "json", cacheTtl: 60 });
  return stored ?? readSnapshot(env, null);
}

export function getRefreshError(env: Env): Promise<RefreshError | null> {
  return env.SNAPSHOTS.get<RefreshError>(ERROR_KEY, "json");
}

/** Reads the sheet. Returns `stored` itself when the sheet has not changed since it was built. */
async function readSnapshot(env: Env, stored: Snapshot | null): Promise<Snapshot> {
  const sheet = await readSheet(env);
  const fingerprint = await sha256(`${sheet.announcements}\n\n${sheet.locations}`);
  return stored?.fingerprint === fingerprint ? stored : buildSnapshot(sheet, fingerprint);
}

/** Written only when the message changes, so a sheet that stays broken does not use up the daily KV writes. */
async function recordError(env: Env, message: string) {
  const current = await getRefreshError(env);
  if (current?.message !== message) {
    await env.SNAPSHOTS.put(ERROR_KEY, JSON.stringify({ since: new Date().toISOString(), message }));
  }
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
