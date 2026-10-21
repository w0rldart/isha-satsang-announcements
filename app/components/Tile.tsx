import { formatDates } from "../lib/dates";
import type { Announcement } from "../lib/types";
import { MODE_LABEL } from "../lib/view";
import { CalendarIcon, ChevronIcon, LanguageIcon, PinIcon } from "./icons";

const list = new Intl.ListFormat("en-GB", { type: "conjunction" });

/**
 * One program. The title is the link, and its ::after covers the whole tile, so the tile is one tap target
 * while screen readers hear the program name. Without a valid registration link nothing is clickable.
 * `where` lists the satsang locations that show it, for pages that mix locations.
 */
export function Tile({
  program,
  version,
  first = false,
  heading: Heading = "h2",
  where,
}: {
  program: Announcement;
  version: string;
  first?: boolean;
  heading?: "h2" | "h3";
  where?: string[] | "all";
}) {
  const image = program.imageUrl ? `/banner/${version}/${program.row}` : "/placeholder.svg";

  return (
    <article className={program.registrationUrl ? "tile tile-linked" : "tile"}>
      <img
        className="tile-image"
        src={image}
        alt=""
        width={1200}
        height={900}
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : undefined}
        decoding="async"
      />

      <div className="tile-body">
        <Heading className="tile-title">
          {program.registrationUrl ? (
            <a className="tile-link" href={program.registrationUrl}>
              {program.title}
            </a>
          ) : (
            program.title
          )}
        </Heading>
        {/* After the title for screen readers, drawn over the corner of the image. */}
        {program.mode && <p className={`badge badge-${program.mode}`}>{MODE_LABEL[program.mode]}</p>}

        <ul className="facts">
          {program.start && (
            <li className="fact fact-date">
              <CalendarIcon />
              <time dateTime={program.start}>{formatDates(program.start, program.end)}</time>
            </li>
          )}
          {program.place && (
            <li className="fact">
              <PinIcon />
              <span>{program.place}</span>
            </li>
          )}
          {program.languages.length > 0 && (
            <li className="fact">
              <LanguageIcon />
              <ul className="chips" aria-label="Languages">
                {program.languages.map((language) => (
                  <li key={language} className="chip">
                    {language}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>

        {where && <p className="tile-where">Announced at {where === "all" ? "every satsang" : list.format(where)}</p>}

        {program.registrationUrl ? (
          <p className="tile-action" aria-hidden="true">
            Register
            <ChevronIcon />
          </p>
        ) : (
          <p className="tile-action tile-action-soon">Registration link coming soon</p>
        )}
      </div>
    </article>
  );
}
