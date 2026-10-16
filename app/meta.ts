import { ORGANIZATION, SITE_NAME } from "./config";

/** Title, description and the preview shown when a link is shared in a chat app. */
export function pageMeta({ origin, title, description }: { origin?: string; title?: string; description?: string }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | ${ORGANIZATION}`;
  return [
    { title: fullTitle },
    { property: "og:title", content: fullTitle },
    { property: "og:site_name", content: ORGANIZATION },
    { property: "og:type", content: "website" },
    ...(description
      ? [
          { name: "description", content: description },
          { property: "og:description", content: description },
        ]
      : []),
    ...(origin ? [{ property: "og:image", content: `${origin}/share.png` }] : []),
  ];
}
