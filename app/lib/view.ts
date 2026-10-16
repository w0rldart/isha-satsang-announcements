import { slugify } from "./text";
import type { Announcement, SatsangLocation, Snapshot } from "./types";

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
