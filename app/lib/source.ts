import type { SheetText } from "./sheet";

/** Downloads both tabs from their "Publish to web" CSV links. Throws when either link is missing. */
export async function readSheet(env: Env): Promise<SheetText> {
  if (!env.ANNOUNCEMENTS_CSV_URL || !env.LOCATIONS_CSV_URL) {
    throw new Error("The sheet links are not set. Store ANNOUNCEMENTS_CSV_URL and LOCATIONS_CSV_URL as secrets.");
  }
  const [announcements, locations] = await Promise.all([
    fetchCsv(env.ANNOUNCEMENTS_CSV_URL, "Announcements"),
    fetchCsv(env.LOCATIONS_CSV_URL, "Locations"),
  ]);
  return { announcements, locations };
}

async function fetchCsv(url: string, tab: string): Promise<string> {
  // Published CSV links contain /spreadsheets/d/e/. The sheet's normal address does not.
  if (url.includes("/spreadsheets/d/") && !url.includes("/spreadsheets/d/e/")) {
    throw new Error(
      `The ${tab} link is the sheet's normal address. Use the link from File > Share > Publish to web, with the ${tab} tab and Comma-separated values (.csv) selected.`,
    );
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) }).catch((err: Error) => {
    throw new Error(`The ${tab} link could not be reached: ${err.message}`);
  });
  if (!res.ok) throw new Error(`The ${tab} link returned HTTP ${res.status}.`);
  const text = await res.text();
  // A sign-in page or the normal sheet link returns HTML instead of CSV.
  if (/^\s*</.test(text)) {
    throw new Error(
      `The ${tab} link returned a web page, not CSV. Publish the ${tab} tab to the web as CSV and store that link.`,
    );
  }
  return text;
}
