import { ORGANIZATION, SITE_NAME } from "../config";
import { LotusMark } from "./icons";

/** The frame shared by every page: who this is from, the content, and for attendees a short note on privacy. */
export function Page({ children, footer = true }: { children: React.ReactNode; footer?: boolean }) {
  return (
    <div className="page">
      <header className="masthead">
        <a className="masthead-link" href="/">
          <LotusMark />
          <span className="masthead-text">
            <span className="masthead-org">{ORGANIZATION}</span>
            <span className="masthead-name">{SITE_NAME}</span>
          </span>
        </a>
      </header>
      <main id="main">{children}</main>
      {footer && (
        <footer className="footer">
          <p>Questions about a program? Ask the volunteers at your satsang.</p>
          <p>This page doesn’t use cookies or track visitors.</p>
        </footer>
      )}
    </div>
  );
}

/** A short message for an empty or missing page, with an optional next step. */
export function Notice({
  title,
  children,
  action,
  heading: Heading = "h2",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  heading?: "h1" | "h2";
}) {
  return (
    <section className="notice">
      <Heading className="notice-title">{title}</Heading>
      <p className="notice-text">{children}</p>
      {action}
    </section>
  );
}
