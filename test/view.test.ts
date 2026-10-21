import { describe, expect, it } from "vitest";
import { buildSnapshot } from "../app/lib/sheet";
import { browse, findLocation, isOnScreen, locationsByCountry, programsAt } from "../app/lib/view";
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

describe("the home page", () => {
  const titles = (query?: string) => browse(snapshot, TODAY, query).programs.map((l) => l.program.title);
  const places = (query: string) =>
    browse(snapshot, TODAY, query).groups.flatMap((g) => g.locations.map((l) => l.name));

  it("lists every program on screen once, in the same order as a location page", () => {
    const all = titles();
    expect(all).toHaveLength(13);
    expect(new Set(all).size).toBe(13);
    expect(all.slice(0, 4)).toEqual([
      "Samyama with Sadhguru",
      "Inner Engineering Online",
      "Isha Kriya Online Session",
      "Hatha Yoga: Upa Yoga Workshop",
    ]);
    expect(all).not.toContain("Spring Retreat (draft)");
    expect(all).not.toContain("Mahashivratri Screening");
    expect(browse(snapshot, TODAY).total).toBe(13);
  });

  it("says where each program is announced", () => {
    const where = (title: string) => browse(snapshot, TODAY).programs.find((l) => l.program.title === title)?.where;
    expect(where("Samyama with Sadhguru")).toBe("all");
    expect(where("Inner Engineering Completion")).toEqual(["London", "Manchester"]);
    expect(where(titles().at(-2)!)).toEqual(["Berlin", "London", "Manchester"]);
  });

  it("finds programs by the start of words in their name", () => {
    expect(titles("inner engin")).toEqual(["Inner Engineering Online", "Inner Engineering Completion"]);
    expect(titles("don")).toEqual([]);
  });

  it("finds a location and everything announced there, in any casing or accent", () => {
    const zurich = [
      "Samyama with Sadhguru",
      "Inner Engineering Online",
      "Isha Kriya Online Session",
      "Guided Meditation Evening",
    ];
    expect(titles("Zürich")).toEqual(zurich);
    expect(titles("ZURICH")).toEqual(zurich);
    expect(places("zurich")).toEqual(["Zürich"]);
    expect(places("germany")).toEqual(["Berlin", "Munich"]);
  });

  it("finds programs by language, delivery mode and month", () => {
    expect(titles("tamil")).toEqual(["Inner Engineering Online"]);
    expect(titles("தமிழ்")).toEqual(["ஈஷா தமிழ் சத்சங்கம்"]);
    expect(titles("online")).toEqual([
      "Inner Engineering Online",
      "Isha Kriya Online Session",
      "ஈஷா தமிழ் சத்சங்கம்",
      "हिन्दी सत्संग 🙏",
    ]);
    expect(titles("december")).toEqual([
      "Samyama with Sadhguru",
      "Guided Meditation Evening",
      "Шамбхави Махамудра Крийя",
    ]);
    expect(titles("αθηνα")).toEqual(["Ημέρα Γιόγκα στην Αθήνα"]);
  });

  it("needs every word of the search to match", () => {
    expect(titles("london yoga")).toEqual(["Samyama with Sadhguru"]);
    const none = browse(snapshot, TODAY, "xyz");
    expect([none.programs, none.groups, none.total]).toEqual([[], [], 13]);
  });

  it("treats a blank search as no search", () => {
    expect(titles("  ")).toEqual(titles());
    expect(places(" ,")).toEqual(places(""));
  });
});
