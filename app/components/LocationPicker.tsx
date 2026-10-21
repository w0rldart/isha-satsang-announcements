import type { CountryGroup } from "../lib/view";
import { ChevronIcon } from "./icons";

/** Satsang locations as links to their pages, grouped by country. */
export function LocationPicker({ groups }: { groups: CountryGroup[] }) {
  return (
    <nav className="countries" aria-label="Satsang locations">
      {groups.map((group) => (
        <div className="country" key={group.country}>
          <h3 className="country-name">{group.country || "Other locations"}</h3>
          <ul className="places">
            {group.locations.map((location) => (
              <li key={location.slug}>
                <a className="place-link" href={`/${encodeURIComponent(location.slug)}`}>
                  <span>{location.name}</span>
                  <ChevronIcon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
