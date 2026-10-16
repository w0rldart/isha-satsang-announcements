import type { CountryGroup } from "../lib/view";
import { ChevronIcon } from "./icons";
import { Notice } from "./Page";

/** The location list, grouped by country. `notFound` is set when the address named no known location. */
export function LocationPicker({ groups, notFound = false }: { groups: CountryGroup[]; notFound?: boolean }) {
  if (groups.length === 0) {
    return (
      <Notice heading="h1" title="No programs are announced right now">
        New programs are announced at each satsang. Check back after the next one.
      </Notice>
    );
  }

  return (
    <>
      <div className="intro">
        <h1 className="intro-title">Which satsang are you attending?</h1>
        <p className="intro-text">Choose your location to see the programs announced there.</p>
      </div>
      {notFound && (
        <p className="alert" role="status">
          That address doesn’t match a satsang location. Choose yours from the list.
        </p>
      )}
      <nav className="countries" aria-label="Satsang locations">
        {groups.map((group) => (
          <div className="country" key={group.country}>
            <h2 className="country-name">{group.country || "Other locations"}</h2>
            <ul>
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
    </>
  );
}
