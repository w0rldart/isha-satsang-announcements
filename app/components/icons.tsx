/** Line icons drawn for this app. Decorative: the text beside each one carries the meaning. */
const line = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
  className: "icon",
};

export function CalendarIcon() {
  return (
    <svg {...line}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function PinIcon() {
  return (
    <svg {...line}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function LanguageIcon() {
  return (
    <svg {...line}>
      <path d="M4 5.5h9M8.5 4v1.5M6 5.5c.6 3 2.6 5.4 5 6.5M11 5.5c-.7 3.4-3 6-6 7.2" />
      <path d="M12.5 20l3.5-8.5 3.5 8.5M13.7 17.2h4.6" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg {...line} width={16} height={16} strokeWidth={2}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** A lotus drawn for this app, used beside the organization name and as the favicon. */
export function LotusMark() {
  return (
    <svg className="mark" width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M16 5c-3.2 3.6-3.6 9.6 0 15 3.6-5.4 3.2-11.4 0-15Zm0 15c-5-1-9.2-4.6-10.6-9.8 4.6.6 8.9 4 10.6 9.8Zm0 0c5-1 9.2-4.6 10.6-9.8-4.6.6-8.9 4-10.6 9.8Z"
      />
      <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M7 24.5h18" />
    </svg>
  );
}
