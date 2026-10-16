import { describe, expect, it } from "vitest";
import { parseCsv } from "../app/lib/csv";
import { formatDates, parseDate, today } from "../app/lib/dates";
import { clean, parseYesNo, slugify, splitList } from "../app/lib/text";

describe("csv", () => {
  it("handles quotes, embedded commas and line breaks, CRLF and a byte-order mark", () => {
    expect(parseCsv('\uFEFFa,b,c\r\n"x, y","say ""hi""","line1\nline2"\r\n')).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "line1\nline2"],
    ]);
  });

  it("keeps empty trailing cells", () => {
    expect(parseCsv("a,b,\n1,,\n")).toEqual([
      ["a", "b", ""],
      ["1", "", ""],
    ]);
  });
});

describe("names", () => {
  it("tidies spaces and keeps the joiners Tamil needs", () => {
    expect(clean("  London\u00A0 ")).toBe("London");
    expect(clean("க்\u200Dஷ")).toBe("க்\u200Dஷ");
  });

  it("matches location names regardless of case, spacing, punctuation and Latin or Greek accents", () => {
    expect(slugify(" London ")).toBe("london");
    expect(slugify("Zürich")).toBe("zurich");
    expect(slugify("St. Albans")).toBe("st-albans");
    expect(slugify("Αθήνα")).toBe("αθηνα");
  });

  it("keeps marks that change a word in other scripts", () => {
    expect(slugify("சென்னை")).not.toBe(slugify("சனன"));
  });

  it("splits lists without duplicates and keeps bracketed commas together", () => {
    expect(splitList("English, Tamil;Hindi\nenglish , ")).toEqual(["English", "Tamil", "Hindi"]);
    expect(splitList("Chinese (Mandarin, Cantonese), English")).toEqual(["Chinese (Mandarin, Cantonese)", "English"]);
  });

  it("reads Yes and No, with blank as No, and rejects anything else", () => {
    expect([parseYesNo("Yes"), parseYesNo("TRUE"), parseYesNo(""), parseYesNo("no")]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(parseYesNo("-")).toBeNull();
  });
});

describe("dates", () => {
  it("reads ISO and day-first dates and rejects impossible ones", () => {
    expect(parseDate("2026-12-29")).toBe("2026-12-29");
    expect(parseDate("29/12/2026")).toBe("2026-12-29");
    expect(parseDate("3.4.2027")).toBe("2027-04-03");
    expect(parseDate("31/02/2027")).toBeNull();
    expect(parseDate("Dec 29")).toBeNull();
  });

  it("formats one day and ranges compactly", () => {
    expect(formatDates("2026-11-07", null)).toBe("7 Nov 2026");
    expect(formatDates("2027-03-04", "2027-03-07")).toMatch(/^4\s*–\s*7 Mar 2027$/);
    expect(formatDates("2026-12-29", "2027-01-05")).toMatch(/^29 Dec 2026\s*–\s*5 Jan 2027$/);
  });

  it("changes day at midnight UK time", () => {
    expect(today(new Date("2026-10-15T22:59:00Z"))).toBe("2026-10-15");
    expect(today(new Date("2026-10-15T23:01:00Z"))).toBe("2026-10-16");
  });
});
