import { describe, expect, it } from "vitest";
import { buildSnapshot, directImageUrl } from "../app/lib/sheet";
import { fixtureSheet } from "./fixtures";

const LOCATIONS = "Location,Country\nLondon,United Kingdom\nParis,France\n";
const HEADER = "Visible,Program Name,Start Date,End Date,Show Until,Delivery Mode,Satsang Locations,Registration URL";

function build(rows: string[], locations = LOCATIONS) {
  return buildSnapshot({ announcements: [HEADER, ...rows].join("\n"), locations }, "test");
}

const issuesFor = (snapshot: ReturnType<typeof build>, program: string) =>
  snapshot.issues.filter((i) => i.program === program).map((i) => i.message);

describe("reading the sheet", () => {
  const snapshot = buildSnapshot(fixtureSheet, "test");

  it("keeps valid rows, including hidden ones, and leaves out rows with errors", () => {
    const titles = snapshot.announcements.map((a) => a.title);
    expect(titles).toContain("Spring Retreat (draft)");
    expect(titles).not.toContain("Wrong Dates Example");
    expect(snapshot.issues.find((i) => i.program === "Wrong Dates Example")).toMatchObject({
      level: "error",
      row: 17,
      message: "End Date is before Start Date.",
    });
  });

  it("matches location names regardless of case and spacing, and reports unknown ones", () => {
    const bhava = snapshot.announcements.find((a) => a.title.startsWith("Bhava Spandana"));
    expect(bhava?.locations).toEqual(["london", "manchester", "berlin"]);
    expect(issuesFor(snapshot, bhava!.title)).toContain(
      "“Londn” is not in the Locations tab, so the program is not shown there.",
    );
  });

  it("keeps Hindi, Tamil, Greek, Cyrillic and emoji intact", () => {
    const titles = snapshot.announcements.map((a) => a.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "हिन्दी सत्संग 🙏",
        "ஈஷா தமிழ் சத்சங்கம்",
        "Ημέρα Γιόγκα στην Αθήνα",
        "Шамбхави Махамудра Крийя",
      ]),
    );
  });

  it("keeps every language in order", () => {
    const online = snapshot.announcements.find((a) => a.title === "Inner Engineering Online");
    expect(online?.languages).toHaveLength(12);
    expect(online?.languages.slice(0, 3)).toEqual(["English", "Tamil", "Hindi"]);
  });

  it("leaves bad registration links unclickable and says why", () => {
    const zurich = snapshot.announcements.find((a) => a.title === "Guided Meditation Evening");
    expect(zurich?.registrationUrl).toBeNull();
    expect(issuesFor(snapshot, "Guided Meditation Evening")[0]).toMatch(/contains spaces/);
  });
});

describe("rules", () => {
  it("shows a tile until the earlier of Show Until and the program's last day", () => {
    const snapshot = build([
      "Yes,Short window,2026-11-10,2026-11-12,2026-11-01,Online,All,https://example.org/a",
      "Yes,Late show until,2026-11-10,2026-11-12,2026-12-31,Online,All,https://example.org/b",
      "Yes,One day,2026-11-10,,,Online,All,https://example.org/c",
      "Yes,No dates,,,,Online,All,https://example.org/d",
    ]);
    expect(snapshot.announcements.map((a) => a.lastDay)).toEqual(["2026-11-01", "2026-11-12", "2026-11-10", null]);
  });

  it("publishes only rows whose Visible is Yes, and flags values that are not Yes or No", () => {
    const snapshot = build([
      "Yes,Shown,2026-11-10,,,Online,All,https://example.org/a",
      ",Blank,2026-11-10,,,Online,All,https://example.org/b",
      "-,Dash,2026-11-10,,,Online,All,https://example.org/c",
    ]);
    expect(snapshot.announcements.map((a) => [a.title, a.visible])).toEqual([
      ["Shown", true],
      ["Blank", false],
    ]);
    expect(issuesFor(snapshot, "Dash")).toContain("Visible is “-”. Use Yes or No.");
  });

  it("rejects unreadable dates and an End Date without a Start Date", () => {
    const snapshot = build([
      "Yes,Typo,2026-13-01,,,Online,All,https://example.org/a",
      "Yes,No start,,2026-11-01,,Online,All,https://example.org/b",
    ]);
    expect(snapshot.announcements).toEqual([]);
    expect(issuesFor(snapshot, "Typo")[0]).toBe("Start Date “2026-13-01” is not a date. Use the format 2026-12-29.");
    expect(issuesFor(snapshot, "No start")).toContain("End Date is set but Start Date is empty.");
  });

  it("accepts In Person written either way and flags other delivery modes", () => {
    const snapshot = build([
      "Yes,A,2026-11-10,,,In Person,All,https://example.org/a",
      "Yes,B,2026-11-10,,,Hybrid,All,https://example.org/b",
    ]);
    expect(snapshot.announcements.map((a) => a.mode)).toEqual(["in-person", null]);
    expect(issuesFor(snapshot, "B")).toContain(
      "Delivery Mode “Hybrid” is not In Person or Online, so no badge is shown.",
    );
  });

  it("refuses a sheet whose header lost a required column, so the last good data stays up", () => {
    expect(() => buildSnapshot({ announcements: "Program,Where\nx,y\n", locations: LOCATIONS }, "x")).toThrow(
      /“Visible” column/,
    );
    expect(() => build([], "City\nLondon\n")).toThrow(/“Location” column/);
  });

  it("treats All as every location and never as a location name", () => {
    const snapshot = build(["Yes,Everywhere,2026-11-10,,,Online,all,https://example.org/a"], `${LOCATIONS}All,\n`);
    expect(snapshot.announcements[0].locations).toBe("all");
    expect(snapshot.locations.map((l) => l.slug)).toEqual(["london", "paris"]);
  });
});

describe("images", () => {
  it("turns Google Drive share links into direct downloads", () => {
    const direct = "https://drive.google.com/uc?export=download&id=1AbCdEfGhIjKlMnOp";
    expect(directImageUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing")).toBe(direct);
    expect(directImageUrl("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp")).toBe(direct);
    expect(directImageUrl("https://example.org/a.jpg")).toBe("https://example.org/a.jpg");
  });
});
