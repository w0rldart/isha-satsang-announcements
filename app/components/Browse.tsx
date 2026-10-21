import type { Browse as BrowseData } from "../lib/view";
import { LocationPicker } from "./LocationPicker";
import { Notice } from "./Page";
import { Tile } from "./Tile";

/**
 * The home page: a search, every satsang location, and every program on screen. With a search, only what
 * matches. Also shown when an address names no known location, with `notFound` set.
 */
export function Browse({
  total,
  groups,
  programs,
  version,
  query = "",
  notFound = false,
}: BrowseData & { version: string; query?: string; notFound?: boolean }) {
  if (total === 0) {
    return (
      <Notice heading="h1" title="No programs are announced right now">
        New programs are announced at each satsang. Check back after the next one.
      </Notice>
    );
  }

  const locationCount = groups.reduce((n, g) => n + g.locations.length, 0);

  return (
    <>
      <div className="intro">
        <h1 className="intro-title">What’s coming up</h1>
        <p className="intro-text">Programs announced at satsang, with links to register.</p>
      </div>

      {notFound && (
        <p className="alert" role="status">
          That address doesn’t match a satsang location. Choose yours below.
        </p>
      )}

      <form className="search" method="get" action="/" role="search">
        <label className="search-label" htmlFor="q">
          Search by program, city or language
        </label>
        <div className="search-row">
          <input
            className="search-input"
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={100}
            enterKeyHint="search"
            spellCheck={false}
          />
          <button className="button button-primary search-button" type="submit">
            Search
          </button>
        </div>
      </form>

      {query && programs.length + locationCount === 0 ? (
        <Notice
          title={`Nothing matches “${query}”`}
          action={
            <a className="text-link" href="/">
              See all programs
            </a>
          }
        >
          Check the spelling, or search for a program name, a city or a language.
        </Notice>
      ) : (
        <>
          {query && (
            <p className="results">
              {summary(programs.length, locationCount, query)}{" "}
              <a className="results-clear" href="/">
                Clear search
              </a>
            </p>
          )}

          {groups.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">{query ? "Locations" : "Satsang locations"}</h2>
                {!query && <p className="section-meta">Choose yours to see only what’s announced there.</p>}
              </div>
              <LocationPicker groups={groups} />
            </section>
          )}

          {programs.length > 0 && (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">{query ? "Programs" : "All programs"}</h2>
                {!query && <p className="section-meta">{count(programs.length, "program", "programs")}</p>}
              </div>
              <div className="tiles">
                {programs.map(({ program, where }) => (
                  <Tile key={program.row} program={program} version={version} heading="h3" where={where} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "3 programs and 1 location match “zurich”." */
function summary(programs: number, locations: number, query: string): string {
  const parts = [
    programs > 0 ? count(programs, "program", "programs") : "",
    locations > 0 ? count(locations, "location", "locations") : "",
  ].filter(Boolean);
  return `${parts.join(" and ")} ${programs + locations === 1 ? "matches" : "match"} “${query}”.`;
}
