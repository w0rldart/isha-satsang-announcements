import { cloudflareContext } from "../context";
import { getSnapshot } from "../lib/snapshot";
import type { Route } from "./+types/banner";

/** Phones should never download more than this for one tile. */
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Serves a program's banner from this site. Only images of visible rows can be fetched, by row, so this is not an
 * open proxy. A missing, blocked, oversized or non-image file becomes the placeholder, so the grid never shows a
 * broken image, and attendees' phones never contact the image host. Each result is kept in Cloudflare's cache
 * (on a custom domain), so the image host is asked once per data center, not once per visitor. `version` changes
 * with every sheet edit, so an edited image is never served from a stale cache.
 */
export async function loader({ request, params, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  const cache = await caches.open("banners");
  const cached = await cache.match(request);
  if (cached) return cached;

  const snapshot = await getSnapshot(env);
  const url = snapshot.announcements.find((a) => a.row === Number(params.row) && a.visible)?.imageUrl;
  const image = url ? await download(url) : null;
  const response = image
    ? new Response(image.bytes, {
        headers: {
          "Content-Type": image.type,
          "Cache-Control": "public, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      })
    : // A failure is kept for 5 minutes, so a fixed image shows up again soon.
      new Response(null, {
        status: 302,
        headers: {
          Location: new URL("/placeholder.svg", request.url).toString(),
          "Cache-Control": "public, max-age=300",
        },
      });
  ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

async function download(url: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; type: string } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        accept: "image/avif,image/webp,image/*;q=0.8",
        "user-agent": "Mozilla/5.0 (compatible; SatsangAnnouncements)",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok || !res.body || Number(res.headers.get("content-length")) > MAX_BYTES) return null;
    // Read in chunks and stop at the limit: Google Drive often sends no length up front.
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (let part = await reader.read(); !part.done; part = await reader.read()) {
      size += part.value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    chunks.reduce((offset, chunk) => (bytes.set(chunk, offset), offset + chunk.byteLength), 0);
    const type = imageType(bytes);
    return type ? { bytes, type } : null;
  } catch {
    return null;
  }
}

/**
 * Identifies the image from its first bytes. The server's Content-Type is not trusted: Google Drive sends images as
 * application/octet-stream, and a sign-in page must never be served as a banner.
 */
function imageType(b: Uint8Array): string | null {
  const text = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && text(1, 4) === "PNG") return "image/png";
  if (text(0, 4) === "GIF8") return "image/gif";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  if (text(4, 8) === "ftyp" && /avi[fs]/.test(text(8, 32))) return "image/avif";
  return null;
}
