import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

/** Pages ship no JavaScript, so the whole page is rendered before the response starts and the status code is final. */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  let status = responseStatusCode;
  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
    onError(error: unknown) {
      status = 500;
      console.error(error);
    },
  });
  await body.allReady;

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  responseHeaders.set(
    "Content-Security-Policy",
    "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  );
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(body, { headers: responseHeaders, status });
}
