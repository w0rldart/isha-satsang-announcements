import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRefreshError, getSnapshot, refreshSnapshot } from "../app/lib/snapshot";

/** In-memory stand-in for a Workers KV namespace that counts writes. */
function memoryKv() {
  const data = new Map<string, string>();
  return {
    data,
    writes: 0,
    async get(key: string, options?: "json" | { type: "json" }) {
      const value = data.get(key);
      return value === undefined ? null : options ? JSON.parse(value) : value;
    },
    async put(key: string, value: string) {
      this.writes++;
      data.set(key, value);
    },
    async delete(key: string) {
      this.writes++;
      data.delete(key);
    },
  };
}

const ANNOUNCEMENTS = "Visible,Program Name,Satsang Locations\nYes,From the sheet,Oslo\n";
const LOCATIONS = "Location,Country\nOslo,Norway\n";

function setup() {
  const kv = memoryKv();
  const env = {
    SNAPSHOTS: kv,
    ANNOUNCEMENTS_CSV_URL: "https://sheet.test/a.csv",
    LOCATIONS_CSV_URL: "https://sheet.test/l.csv",
  };
  return { kv, env: env as unknown as Env };
}

function sheetReturns(announcements: string, locations = LOCATIONS) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => new Response(url.endsWith("a.csv") ? announcements : locations)),
  );
}

describe("snapshot store", () => {
  beforeEach(() => sheetReturns(ANNOUNCEMENTS));
  afterEach(() => vi.unstubAllGlobals());

  it("reads the sheet for the request while KV is still empty, and leaves saving to the scheduled refresh", async () => {
    const { kv, env } = setup();
    const snapshot = await getSnapshot(env);
    expect(snapshot.announcements.map((a) => a.title)).toEqual(["From the sheet"]);
    expect(kv.writes).toBe(0);
  });

  it("reports the sheet error even when recording it fails", async () => {
    const { kv, env } = setup();
    sheetReturns("<html>Sign in</html>");
    kv.put = async () => {
      throw new Error("KV write limit reached");
    };
    await expect(refreshSnapshot(env)).rejects.toThrow(/returned a web page/);
  });

  it("skips an unchanged sheet, rebuilds a changed one, and always rebuilds when forced", async () => {
    const { kv, env } = setup();
    const first = await refreshSnapshot(env);
    const writes = kv.writes;
    expect((await refreshSnapshot(env)).builtAt).toBe(first.builtAt);
    expect(kv.writes).toBe(writes);

    sheetReturns(ANNOUNCEMENTS.replace("From the sheet", "Edited"));
    expect((await refreshSnapshot(env)).announcements[0].title).toBe("Edited");
    expect(kv.writes).toBe(writes + 1);

    await refreshSnapshot(env, { force: true });
    expect(kv.writes).toBe(writes + 2);
  });

  it("keeps the last good snapshot while the sheet is broken, records the error once, and clears it on success", async () => {
    const { kv, env } = setup();
    const good = await refreshSnapshot(env);

    sheetReturns("<!DOCTYPE html><html>Sign in</html>");
    const writes = kv.writes;
    for (let i = 0; i < 3; i++) await expect(refreshSnapshot(env)).rejects.toThrow(/returned a web page, not CSV/);
    expect(kv.writes - writes).toBe(1);
    expect((await getRefreshError(env))?.message).toMatch(/Announcements link returned a web page/);
    expect((await getSnapshot(env)).fingerprint).toBe(good.fingerprint);

    sheetReturns(ANNOUNCEMENTS);
    await refreshSnapshot(env);
    expect(await getRefreshError(env)).toBeNull();
  });

  it("rejects the sheet's normal address", async () => {
    const { env } = setup();
    await expect(
      refreshSnapshot({ ...env, ANNOUNCEMENTS_CSV_URL: "https://docs.google.com/spreadsheets/d/abc/edit?gid=1" }),
    ).rejects.toThrow(
      "The Announcements link is the sheet's normal address. Use the link from File > Share > Publish to web, with the Announcements tab and Comma-separated values (.csv) selected.",
    );
  });

  it("refuses a sheet that lost a required column without touching the stored snapshot", async () => {
    const { kv, env } = setup();
    await refreshSnapshot(env);
    const stored = kv.data.get("snapshot");
    sheetReturns("Name,Where\nx,y\n");
    await expect(refreshSnapshot(env)).rejects.toThrow(/“Visible” column/);
    expect(kv.data.get("snapshot")).toBe(stored);
  });
});
