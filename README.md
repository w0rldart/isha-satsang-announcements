# Satsang Announcements

Attendees scan a QR code at satsang, choose their location and see the programs announced there. Each program links to its registration page. Coordinators manage everything in one Google Sheet.

React Router v8 on Cloudflare Workers, on the free plan. Pages are server-rendered HTML with no JavaScript, no cookies and no tracking.

The runbook for coordinators and IT is in [docs/MAINTENANCE.md](docs/MAINTENANCE.md).

## How it works

```
Google Sheet ──(every 5 minutes)──> Worker validates the rows ──> Workers KV
Attendee ──> short link or QR code ──> Worker renders the page from KV
```

Attendee pages read the stored copy, not the sheet. If the sheet breaks, attendees keep the last good version and the check page says what to fix. Banner images are served from this site and kept in Cloudflare's cache, so each image host is asked once per data center, not once per visitor.

## Run it locally

Needs Node 22.22 or later.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

Open http://localhost:5173. Without sheet links in `.dev.vars`, the app reads the sample sheet in `fixtures/`. The check page is at http://localhost:5173/check?key=local-check-key.

```bash
npm test
npm run typecheck
```

## Deploy

1. Create the sheet. Upload `sheet-template/Satsang-Announcements-Template.xlsx` to Google Drive and choose File > Save as Google Sheets. Keep File > Settings > Locale on a European country.
2. Publish the two tabs. In the sheet choose File > Share > Publish to web, pick the Announcements tab and Comma-separated values (.csv), publish and copy the link. Do the same for the Locations tab. Leave automatic republishing on. Publish only these two tabs, and do not limit access to your organization: the Worker reads the links without signing in.
3. Deploy:
   ```bash
   npx wrangler login
   npm run deploy
   ```
   The first deploy creates the KV namespace and writes its id into `wrangler.jsonc`. Commit that change.
4. Store the secrets. Each command asks for the value and takes effect straight away:
   ```bash
   npx wrangler secret put ANNOUNCEMENTS_CSV_URL
   npx wrangler secret put LOCATIONS_CSV_URL
   npx wrangler secret put CHECK_KEY
   ```
   Use a long random value for `CHECK_KEY`. The check page is `/check?key=<CHECK_KEY>`; without the key it returns 404.
5. Use your own domain. Cloudflare's cache only works there; on the `workers.dev` address the Worker downloads each banner again for every visitor. The domain's DNS must be on Cloudflare. Uncomment `routes` in `wrangler.jsonc`, set the domain and deploy again.

Print QR codes for a short link the Content Team controls, never for the Worker address, so the target can change without reprinting. A venue's short link can open its location directly, for example `/london`.

## Configuration

| Where            | What                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Secrets          | `ANNOUNCEMENTS_CSV_URL` and `LOCATIONS_CSV_URL`, the two published CSV links. `CHECK_KEY`, the check page password |
| `app/config.ts`  | Organization name, site name, and the time zone that decides when a date has passed                                |
| `wrangler.jsonc` | Refresh schedule, logging, KV namespace, custom domain                                                             |

The CSV links are secrets because anyone with them can read the published tabs, including rows not yet visible.

## Project layout

```
app/
  routes/home.tsx        location list
  routes/location.tsx    one location's programs (/london)
  routes/check.tsx       coordinator check page
  routes/banner.ts       serves banner images from this site, with a placeholder on failure
  components/            page frame, location list, program tile, icons
  lib/sheet.ts           column rules and validation
  lib/snapshot.ts        refresh and storage in KV
  lib/view.ts            what is on screen today, and in what order
  styles/app.css         all styling
workers/app.ts           Worker entry: web requests and the scheduled refresh
fixtures/                sample sheet for local development and tests
sheet-template/          the master sheet template
```

## License

MIT. See [LICENSE](LICENSE).
