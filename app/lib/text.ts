/** Display text: Unicode NFC, single spaces, trimmed. Zero-width joiners stay, because Tamil and Devanagari need them. */
export function clean(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFC")
    .replace(/[\u200B\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lowercase form of a name for matching and addresses. Punctuation and spaces become hyphens, and accents on
 * Latin and Greek letters go, so "Zürich " and "zurich" match. Marks in other scripts stay: they change the word.
 */
export function slugify(value: string | undefined): string {
  return clean(value)
    .normalize("NFKD")
    .replace(/([\p{Script=Latin}\p{Script=Greek}])\p{M}+/gu, "$1")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Splits "English, Tamil; Hindi" into unique items. Commas inside brackets do not split. */
export function splitList(value: string | undefined): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of value ?? "") {
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    if (depth === 0 && /[,;\n|]/.test(ch)) {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);

  const seen = new Set<string>();
  return items.map(clean).filter((item) => {
    const key = slugify(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Yes/No cells. TRUE and FALSE also work, for checkbox columns. Blank is No. Anything else is null. */
export function parseYesNo(value: string): boolean | null {
  const v = value.toLowerCase();
  if (v === "" || v === "no" || v === "false") return false;
  if (v === "yes" || v === "true") return true;
  return null;
}
