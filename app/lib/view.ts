import { longDate } from "./dates";
import { slugify } from "./text";
import type { Announcement, DeliveryMode, SatsangLocation, Snapshot } from "./types";

export const MODE_LABEL: Record<DeliveryMode, string> = { "in-person": "In Person", online: "Online" };

export function isOnScreen(a: Announcement, today: string): boolean {
  return a.visible && (!a.lastDay || today <= a.lastDay);
}

function shownAt(a: Announcement, slug: string): boolean {
  return a.locations === "all" || a.locations.includes(slug);
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** Priority first, then start date, then name. Blanks go last. The same sheet always gives the same order. */
function byPriority(a: Announcement, b: Announcement): number {
  return (
    compareBlankLast(a.priority, b.priority, (x, y) => x - y) ||
    compareBlankLast(a.start, b.start, (x, y) => x.localeCompare(y)) ||
    collator.compare(a.title, b.title) ||
    a.row - b.row
  );
}

function compareBlankLast<T>(a: T | null, b: T | null, compare: (a: T, b: T) => number): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  return compare(a, b);
}

export function programsAt(snapshot: Snapshot, location: SatsangLocation, today: string): Announcement[] {
  return snapshot.announcements.filter((a) => isOnScreen(a, today) && shownAt(a, location.slug)).sort(byPriority);
}

export interface CountryGroup {
  country: string;
  locations: SatsangLocation[];
}

/** Locations with at least one program on screen today, grouped by country. Locations without a country go last. */
export function locationsByCountry(snapshot: Snapshot, today: string): CountryGroup[] {
  const live = snapshot.announcements.filter((a) => isOnScreen(a, today));
  const groups = new Map<string, CountryGroup>();
  for (const location of snapshot.locations) {
    if (!live.some((a) => shownAt(a, location.slug))) continue;
    const key = slugify(location.country);
    const group = groups.get(key) ?? { country: location.country, locations: [] };
    group.locations.push(location);
    groups.set(key, group);
  }
  for (const group of groups.values()) group.locations.sort((a, b) => collator.compare(a.name, b.name));
  return [...groups.values()].sort(
    (a, b) => Number(!a.country) - Number(!b.country) || collator.compare(a.country, b.country),
  );
}

/** Finds a location by the name in the address, in any casing or accent: "/Zürich" finds "zurich". */
export function findLocation(snapshot: Snapshot, name: string): SatsangLocation | undefined {
  const slug = slugify(name);
  return snapshot.locations.find((l) => l.slug === slug);
}

export interface Listing {
  program: Announcement;
  /** Names of the locations that show the program, in alphabetical order, or "all". */
  where: string[] | "all";
}

export interface Browse {
  /** Programs on screen today at any location, before the search narrows them. */
  total: number;
  groups: CountryGroup[];
  programs: Listing[];
}

/**
 * The home page: every location and every program on screen today, each program once. A search keeps the
 * locations and programs that contain every word of it, matching the start of words in any casing or accent.
 */
export function browse(snapshot: Snapshot, today: string, query = ""): Browse {
  const live = snapshot.announcements
    .filter((a) => isOnScreen(a, today) && (a.locations === "all" || a.locations.length > 0))
    .sort(byPriority);
  const groups = locationsByCountry(snapshot, today);
  const listings = live.map((program) => ({ program, where: whereShown(snapshot, program) }));

  const terms = words(query).slice(0, 10);
  if (terms.length === 0) return { total: live.length, groups, programs: listings };

  return {
    total: live.length,
    groups: groups
      .map((g) => ({ ...g, locations: g.locations.filter((l) => matches([l.name, l.country], terms)) }))
      .filter((g) => g.locations.length > 0),
    programs: listings.filter(({ program }) => matches(searchText(snapshot, program), terms)),
  };
}

function whereShown(snapshot: Snapshot, a: Announcement): string[] | "all" {
  if (a.locations === "all") return "all";
  return snapshot.locations
    .filter((l) => shownAt(a, l.slug))
    .map((l) => l.name)
    .sort(collator.compare);
}

/** What a search looks in: name, place, languages, mode, the locations that show the program, and its dates. */
function searchText(snapshot: Snapshot, a: Announcement): string[] {
  return [
    a.title,
    a.place,
    ...a.languages,
    a.mode ? MODE_LABEL[a.mode] : "",
    ...snapshot.locations.filter((l) => shownAt(a, l.slug)).flatMap((l) => [l.name, l.country]),
    a.start ? longDate(a.start) : "",
    a.end ? longDate(a.end) : "",
  ];
}

function words(text: string): string[] {
  return slugify(text).split("-").filter(Boolean);
}

function matches(texts: string[], terms: string[]): boolean {
  const haystack = texts.flatMap(words);
  return terms.every((term) => haystack.some((word) => word.startsWith(term)));
}
