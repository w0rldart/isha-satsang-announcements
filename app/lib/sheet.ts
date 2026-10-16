import { parseCsv } from "./csv";
import { parseDate } from "./dates";
import { clean, parseYesNo, slugify, splitList } from "./text";
import type { Announcement, DeliveryMode, Issue, SatsangLocation, Snapshot } from "./types";

/** Column headers as in the sheet template. Case, spaces and punctuation are ignored when matching. */
const ANNOUNCEMENT_COLUMNS = {
  visible: "Visible",
  priority: "Priority",
  title: "Program Name",
  banner: "Banner Image URL",
  start: "Start Date",
  end: "End Date",
  showUntil: "Show Until",
  mode: "Delivery Mode",
  venue: "Venue",
  city: "City",
  country: "Country",
  languages: "Languages",
  locations: "Satsang Locations",
  registration: "Registration URL",
} as const;

type Field = keyof typeof ANNOUNCEMENT_COLUMNS;

/** "In Person", "In-Person" and "online" all count. */
const MODES: Record<string, DeliveryMode> = { "in-person": "in-person", online: "online" };

/** Without these the whole sheet would read as empty, so the refresh stops and the last good data stays up. */
const REQUIRED: Field[] = ["visible", "title", "locations"];

export interface SheetText {
  announcements: string;
  locations: string;
}

/** Validates both tabs. Throws when a tab is unusable; problems with single rows become issues instead. */
export function buildSnapshot(sheet: SheetText, fingerprint: string, now = new Date()): Snapshot {
  const issues: Issue[] = [];
  const locations = readLocations(parseCsv(sheet.locations), issues);
  const known = new Set(locations.map((l) => l.slug));

  const [header = [], ...rows] = parseCsv(sheet.announcements);
  const columns = findColumns(header, ANNOUNCEMENT_COLUMNS);
  for (const field of REQUIRED) {
    if (columns[field] < 0) {
      throw new Error(
        `The Announcements tab has no “${ANNOUNCEMENT_COLUMNS[field]}” column. Restore the header row from the template.`,
      );
    }
  }
  for (const field of Object.keys(ANNOUNCEMENT_COLUMNS) as Field[]) {
    if (columns[field] < 0) {
      issues.push({
        tab: "Announcements",
        row: null,
        level: "warning",
        message: `The “${ANNOUNCEMENT_COLUMNS[field]}” column is missing, so it reads as empty.`,
      });
    }
  }

  const announcements: Announcement[] = [];
  rows.forEach((cells, i) => {
    if (cells.every((c) => clean(c) === "")) return;
    const result = readAnnouncement((field) => clean(cells[columns[field]]), i + 2, known);
    issues.push(...result.issues);
    if (result.announcement) announcements.push(result.announcement);
  });

  return { builtAt: now.toISOString(), fingerprint, locations, announcements, issues };
}

function readAnnouncement(
  get: (field: Field) => string,
  row: number,
  known: Set<string>,
): { announcement: Announcement | null; issues: Issue[] } {
  const title = get("title");
  const issues: Issue[] = [];
  const flag = (level: Issue["level"], message: string) =>
    issues.push({ tab: "Announcements", row, level, program: title || undefined, message });

  const date = (field: "start" | "end" | "showUntil") => {
    const text = get(field);
    const value = text ? parseDate(text) : null;
    if (text && !value) {
      flag("error", `${ANNOUNCEMENT_COLUMNS[field]} “${text}” is not a date. Use the format 2026-12-29.`);
    }
    return value;
  };
  const start = date("start");
  const end = date("end");
  const showUntil = date("showUntil");
  const lastDay = earliest(showUntil, end ?? start);

  if (!title) flag("error", "Program Name is empty.");
  if (end && !start) flag("error", "End Date is set but Start Date is empty.");
  if (start && end && end < start) flag("error", "End Date is before Start Date.");

  const visible = parseYesNo(get("visible"));
  if (visible === null) flag("error", `Visible is “${get("visible")}”. Use Yes or No.`);

  const priorityText = get("priority").replace(",", ".");
  const priority = priorityText && Number.isFinite(Number(priorityText)) ? Number(priorityText) : null;
  if (priorityText && priority === null) {
    flag("warning", `Priority “${get("priority")}” is not a number, so it sorts as if blank.`);
  }

  const mode = MODES[slugify(get("mode"))] ?? null;
  if (!get("mode")) flag("warning", "Delivery Mode is empty, so no badge is shown.");
  else if (!mode) flag("warning", `Delivery Mode “${get("mode")}” is not In Person or Online, so no badge is shown.`);
  if (mode === "in-person" && (!get("city") || !get("country"))) {
    flag("warning", "In Person program without a City or Country.");
  }

  const languages = splitList(get("languages"));
  if (languages.length === 0) flag("warning", "No languages listed.");

  const names = splitList(get("locations"));
  const locations = names.some((n) => slugify(n) === "all") ? "all" : names.map(slugify).filter((s) => known.has(s));
  for (const name of names) {
    if (locations !== "all" && !known.has(slugify(name))) {
      flag("warning", `“${name}” is not in the Locations tab, so the program is not shown there.`);
    }
  }
  if (locations !== "all" && locations.length === 0) {
    flag("warning", "No satsang location, so the program is not shown anywhere. Use All for every location.");
  }

  const registration = readUrl(get("registration"));
  if (registration.problem) {
    flag("warning", `Registration URL ${registration.problem}. The tile shows “Registration link coming soon”.`);
  } else if (!registration.url) {
    flag("warning", "No Registration URL. The tile shows “Registration link coming soon”.");
  }

  const banner = readUrl(get("banner"));
  if (banner.problem) flag("warning", `Banner Image URL ${banner.problem}. The tile shows the placeholder image.`);

  for (const issue of issues) issue.lastDay = lastDay;
  if (issues.some((x) => x.level === "error")) return { announcement: null, issues };

  return {
    issues,
    announcement: {
      row,
      title,
      visible: visible === true,
      priority,
      start,
      end,
      lastDay,
      mode,
      place: [get("venue"), get("city"), get("country")].filter(Boolean).join(", "),
      languages,
      locations,
      registrationUrl: registration.url,
      imageUrl: banner.url ? directImageUrl(banner.url) : null,
    },
  };
}

function readLocations(table: string[][], issues: Issue[]): SatsangLocation[] {
  const [header = [], ...rows] = table;
  const columns = findColumns(header, { name: "Location", country: "Country" });
  if (columns.name < 0) {
    throw new Error("The Locations tab has no “Location” column. Check the Locations link and the header row.");
  }

  const bySlug = new Map<string, SatsangLocation>();
  rows.forEach((cells, i) => {
    const name = clean(cells[columns.name]);
    const slug = slugify(name);
    if (!slug) return;
    const existing = bySlug.get(slug);
    const problem =
      slug === "all"
        ? "“All” means every location, so it cannot be a location name."
        : existing && `Same location as “${existing.name}” above. This row is ignored.`;
    if (problem) issues.push({ tab: "Locations", row: i + 2, level: "warning", program: name, message: problem });
    else bySlug.set(slug, { slug, name, country: clean(cells[columns.country]) });
  });
  return [...bySlug.values()];
}

function findColumns<T extends Record<string, string>>(header: string[], names: T): Record<keyof T, number> {
  const keys = header.map(slugify);
  const out = {} as Record<keyof T, number>;
  for (const field of Object.keys(names) as (keyof T)[]) out[field] = keys.indexOf(slugify(names[field]));
  return out;
}

/** Complete links only. A link without https:// is reported, not guessed: "banner.jpg" is not a website. */
function readUrl(text: string): { url: string | null; problem: string | null } {
  if (!text) return { url: null, problem: null };
  if (/\s/.test(text)) return { url: null, problem: `“${text}” contains spaces` };
  if (!/^https?:\/\//i.test(text)) return { url: null, problem: `“${text}” does not start with https://` };
  const url = URL.parse(text);
  if (!url || !url.hostname.includes(".") || url.username || url.password) {
    return { url: null, problem: `“${text}” is not a valid web address` };
  }
  return { url: url.toString(), problem: null };
}

/** Google Drive share links open a viewer page. The download address returns the image itself. */
export function directImageUrl(url: string): string {
  const u = new URL(url);
  if (u.hostname !== "drive.google.com" && u.hostname !== "docs.google.com") return url;
  const id = u.pathname.match(/\/d\/([\w-]{10,})/)?.[1] ?? u.searchParams.get("id");
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

function earliest(a: string | null, b: string | null): string | null {
  if (!a || !b) return a ?? b;
  return a < b ? a : b;
}
