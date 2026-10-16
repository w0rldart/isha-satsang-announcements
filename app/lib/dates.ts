import { TIME_ZONE } from "../config";

/** Reads 2026-12-29, or 29/12/2026 with / . or - between parts. Day comes before month. Null if unreadable. */
export function parseDate(text: string): string | null {
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return toIso(+iso[1], +iso[2], +iso[3]);
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return toIso(+dmy[3], +dmy[2], +dmy[1]);
  return null;
}

function toIso(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date.toISOString().slice(0, 10) : null;
}

/** Today's date (YYYY-MM-DD) in the time zone that decides when a program has passed. */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const format = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "7 Nov 2026" for one day; "4–7 Mar 2027" or "29 Dec 2026 – 5 Jan 2027" for a range. */
export function formatDates(start: string, end: string | null): string {
  const from = new Date(`${start}T00:00:00Z`);
  return end && end !== start ? format.formatRange(from, new Date(`${end}T00:00:00Z`)) : format.format(from);
}
