# Satsang Announcements: maintenance guide

For the coordinators who run the announcements and for IT. Setup and deployment are in the [README](../README.md).

## Owners

Keep a filled-in copy of this table with the organization's records, not in this repository, which is public.

| Part                                            | Owner        | Backup |
| ----------------------------------------------- | ------------ | ------ |
| Master Google Sheet (content)                   |              |        |
| Google account that owns the sheet              |              |        |
| Cloudflare account and Worker                   |              |        |
| Short link and QR codes                         | Content Team |        |
| Check page key (`CHECK_KEY`)                    |              |        |
| Checking registration links before each satsang |              |        |

## The master sheet

Owned by an organization Google account and shared with coordinators as Editor. Record its address in the private copy above.

The app finds columns by their header, so columns can be reordered and extra columns are ignored. Leave the header row as it is, and protect it with Data > Protect sheets and ranges. File > Version history restores anything deleted by mistake.

### Announcements tab

| Column               | Required | Format                                                   | Meaning                                                                                                                                                                                   |
| -------------------- | -------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visible              | Yes      | Yes or No                                                | Only Yes puts the row on screen. Blank counts as No, so a half-typed row never goes live                                                                                                  |
| Priority             | No       | Number                                                   | Lower shows first. Blank goes after numbered rows                                                                                                                                         |
| Program Name         | Yes      | Text                                                     | Tile title                                                                                                                                                                                |
| Banner Image URL     | No       | Link starting with `https://`                            | JPG, PNG or WebP in 4:3 shape, about 1200 x 900 pixels and under 500 KB. Google Drive images need sharing set to Anyone with the link. Missing, broken or over 2 MB shows the placeholder |
| Start Date           | No       | `2026-12-29`                                             | Program date on the tile                                                                                                                                                                  |
| End Date             | No       | `2026-12-29`                                             | Last day of a multi-day program                                                                                                                                                           |
| Show Until           | No       | `2026-12-29`                                             | Last day on screen, for example when registration closes                                                                                                                                  |
| Delivery Mode        | No       | In Person or Online                                      | Badge on the tile                                                                                                                                                                         |
| Venue, City, Country | No       | Text                                                     | Place line on the tile                                                                                                                                                                    |
| Languages            | No       | Separated by commas                                      | One label per language                                                                                                                                                                    |
| Satsang Locations    | Yes      | Names from the Locations tab separated by commas, or All | Where the tile appears                                                                                                                                                                    |
| Registration URL     | No       | Link starting with `https://`                            | Opened when the tile is tapped. Without a valid link the tile says "Registration link coming soon" and is not clickable                                                                   |

Dates also accept `29/12/2026`, read day first.

### Locations tab

| Column   | Required | Meaning                                  |
| -------- | -------- | ---------------------------------------- |
| Location | Yes      | Satsang location name, once per location |
| Country  | No       | Groups the location list                 |

Names match ignoring case, extra spaces, punctuation and accents, so `london ` and `London` are the same location and `Zurich` matches `Zürich`.

## Display rules

1. A row is not shown at all when Program Name is empty, a date cannot be read, End Date is before Start Date, End Date has no Start Date, or Visible is neither Yes nor No. The check page lists these as Not shown.
2. A valid row is on screen when Visible is Yes and today is not after its last day. The last day is the earlier of Show Until and the program's last day (End Date, or Start Date for a one-day program). A row with no dates stays until Visible is No.
3. Today is the date in the UK, so a tile never disappears early anywhere in Europe.
4. A location shows a tile when Satsang Locations says All or names that location.
5. The home page lists every location with at least one tile on screen, grouped by country. Below it, every program on screen appears once, with the locations that show it.
6. Tiles are ordered by Priority, then Start Date, then Program Name. Blanks go last.
7. Search on the home page looks in Program Name, Venue, City, Country, Languages, Delivery Mode, the satsang locations that show the program and their countries, and the month of Start Date and End Date. Every word typed must match the start of a word there. Case and accents are ignored, so `zurich` finds Zürich and `dec` finds December.
8. Each location has its own address, built from its name: `/london`, `/zurich`. Renaming a location changes its address.

## Refresh

The Worker reads the sheet every 5 minutes and stores a checked copy in Cloudflare KV. Attendee pages read only that copy. Google can take a few minutes to publish an edit, and attendee pages update within about two minutes of a read, so an edit normally appears within 10 minutes.

The check page's Refresh now reads the sheet straight away. If the sheet cannot be read, or a required column is missing, the stored copy stays as it was and the check page shows the reason until it is fixed.

## Access and sharing

| What                                            | Who has access             | How to change it                                              |
| ----------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| Editing the sheet                               | Coordinators, as Editor    | Google Drive sharing                                          |
| Published CSV links                             | Anyone who has the links   | File > Share > Publish to web > Stop publishing cuts them off |
| CSV links and check page key, as Worker secrets | Cloudflare account members | `npx wrangler secret put <NAME>`                              |
| Check page                                      | Anyone with the key        | Set a new `CHECK_KEY`, then share the new link                |
| Cloudflare account                              | Named members              | Cloudflare dashboard, account members                         |

Everything in the Announcements and Locations tabs can be read by anyone with the published links, including rows set to No. Keep private notes in another tab or file.

## Short link and QR codes

The Content Team owns the short link and every QR code. QR codes point at the short link, never at the Worker address, so the target can change without reprinting. A venue's short link can point at its location, for example `/london`.

## Runbook

**Add an announcement.** Fill a new row and leave Visible blank while you type. Put All in Satsang Locations, or names from the Locations tab. Set Visible to Yes. Open the check page, press Refresh now and fix anything it lists for the row.

**Retire an announcement.** Set Visible to No. Tiles also leave by themselves after their last day; past rows can stay in the sheet.

**Add a location.** Add a row to the Locations tab, then use its name in Satsang Locations. It appears in the list once a tile is on screen there.

**Before each satsang.** Open the attendee page for your location and tap each tile to confirm the registration page opens.

## Troubleshooting

| What you see                                | Cause                                                                | Fix                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Check page: "returned a web page, not CSV"  | The tab was unpublished, or the stored link is the normal sheet link | Publish the tab as CSV again and store the link with `npx wrangler secret put` |
| Check page: a column is missing             | The header row was changed                                           | Restore it from the template or from Version history                           |
| A program is missing at one location        | Location name misspelt, or the row has a problem                     | Check page                                                                     |
| Placeholder instead of the banner           | Image not public, not an image, or over 2 MB                         | Open the link in a private browser window                                      |
| `/check` returns 404                        | Wrong key in the link                                                | Use the link with the current `CHECK_KEY`                                      |
| Worker logs show "exceeded resource limits" | The free plan's CPU limit                                            | Move to Workers Paid ($5 a month). Nothing else changes                        |

## Privacy

Attendees use the page anonymously. It sets no cookies, runs no scripts and has no forms or analytics. Banner images and fonts are served from this site, so attendees' phones do not contact other hosts. Per-request logs are off.
