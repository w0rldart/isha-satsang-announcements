import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../app/lib/sheet";
import { findLocation, isOnScreen, locationsByCountry, programsAt } from "../app/lib/view";
import { fixtureSheet } from "./fixtures";

const snapshot = buildSnapshot(fixtureSheet, "test");
const TODAY = "2026-10-15";

const titlesAt = (name: string, today = TODAY) =>
  programsAt(snapshot, findLocation(snapshot, name)!, today).map((a) => a.title);

describe("what attendees see", () => {
  it("shows a location's own programs and those for All, ordered by priority, then date, then name", () => {
    expect(titlesAt("london")).toEqual([
      "Samyama with Sadhguru",
      "Inner Engineering Online",
      "Isha Kriya Online Session",
      "Inner Engineering Completion",
      "ஈஷா தமிழ் சத்சங்கம்",
      "हिन्दी सत्संग 🙏",
      "Bhava Spandana Program: residential program with an arrival-day orientation and a closing integration session",
      "Guru Purnima Celebration",
    ]);
  });

  it("shows nothing that belongs only to another location", () => {
    expect(titlesAt("paris")).not.toContain("Inner Engineering Completion");
    expect(titlesAt("paris")).toContain("Yantra Ceremony");
  });

  it("hides rows set to No and rows whose last day has passed", () => {
    expect(titlesAt("london")).not.toContain("Spring Retreat (draft)");
    expect(titlesAt("london")).not.toContain("Mahashivratri Screening");
    const samyama = snapshot.announcements.find((a) => a.title === "Samyama with Sadhguru")!;
    expect([isOnScreen(samyama, "2026-12-20"), isOnScreen(samyama, "2026-12-21")]).toEqual([true, false]);
  });

  it("lists every location with something on screen, grouped by country in alphabetical order", () => {
    const groups = locationsByCountry(snapshot, TODAY);
    expect(groups.map((g) => g.country)).toEqual([
      "France",
      "Germany",
      "Greece",
      "Norway",
      "Portugal",
      "Switzerland",
      "United Kingdom",
    ]);
    expect(groups.at(-1)?.locations.map((l) => l.name)).toEqual(["London", "Manchester"]);
  });

  it("lists only locations with something on screen", () => {
    const later = locationsByCountry(snapshot, "2027-08-01").flatMap((g) => g.locations.map((l) => l.name));
    // Inner Engineering Online has no end date and is shown everywhere.
    expect(later).toHaveLength(9);
    const parisOnly = buildSnapshot(
      { announcements: "Visible,Program Name,Satsang Locations\nYes,Talk,Paris\n", locations: fixtureSheet.locations },
      "test",
    );
    expect(locationsByCountry(parisOnly, TODAY).flatMap((g) => g.locations.map((l) => l.name))).toEqual(["Paris"]);
  });

  it("finds a location from the address in any casing or accent", () => {
    expect(findLocation(snapshot, "Zürich")?.slug).toBe("zurich");
    expect(findLocation(snapshot, "LONDON")?.name).toBe("London");
    expect(findLocation(snapshot, "nowhere")).toBeUndefined();
  });
});
