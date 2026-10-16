export type DeliveryMode = "in-person" | "online";

export interface SatsangLocation {
  /** Used for matching and in the address: "Zürich" becomes "zurich". */
  slug: string;
  name: string;
  country: string;
}

export interface Announcement {
  /** Row in the sheet, counting the header as row 1. */
  row: number;
  title: string;
  visible: boolean;
  priority: number | null;
  /** All dates are YYYY-MM-DD. */
  start: string | null;
  end: string | null;
  /** Last day on screen: the earlier of Show Until and the program's last day. Null means no end. */
  lastDay: string | null;
  mode: DeliveryMode | null;
  /** Venue, city and country, joined. */
  place: string;
  languages: string[];
  /** Location slugs, or "all". */
  locations: string[] | "all";
  registrationUrl: string | null;
  imageUrl: string | null;
}

export interface Issue {
  tab: "Announcements" | "Locations";
  /** Null for problems with the whole tab. */
  row: number | null;
  level: "error" | "warning";
  program?: string;
  message: string;
  /** The row's last day on screen, so the check page can leave out rows that have ended. */
  lastDay?: string | null;
}

export interface Snapshot {
  builtAt: string;
  /** Hash of the sheet text, so an unchanged sheet is not processed again. */
  fingerprint: string;
  locations: SatsangLocation[];
  /** Rows without errors, including hidden ones. */
  announcements: Announcement[];
  issues: Issue[];
}

export interface RefreshError {
  since: string;
  message: string;
}
