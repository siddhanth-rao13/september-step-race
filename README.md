# September Step Race

URL - https://september-step-race.onrender.com

A private step-count race for September 2026, drawn as a retro pixel-art running
game. Five runners move along one long horizontal road; the further right you
are, the more steps you have walked. The whole race is one wide world and the
phone screen is a window onto it, so you swipe left and right to move through it.

Built with Next.js, React and TypeScript. The only data source is an Excel
workbook in the repository — there is no database and no backend service.

---

## Local development

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

Other commands:

```bash
npm run validate   # check data/steps.xlsx and print the standings
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run build      # production build
npm start          # run the production build
```

---

## Updating the steps (the thing you will do most)

1. Open [`data/steps.xlsx`](./data/steps.xlsx).
2. Go to the sheet named **Steps**.
3. Find the row for the day, or add a new one at the bottom.
4. Type each person's steps for that day under their name.
5. **Leave a cell blank if you do not have that person's number yet.** A blank
   cell means "not updated" — it is never counted as zero, and the site shows
   `Today: Not updated` for that person.
6. Save the file.
7. Update `lastUpdated` in [`lib/race-config.ts`](./lib/race-config.ts) to the
   date and time you did this (optional, but it is what the header shows).
8. Commit and push. The deployed site picks up the change on the next request.

The sheet must look like this, with the header row spelled exactly this way:

| Date     | Chetana | Siddhanth | Praneeth | Venkat | Sujan |
| -------- | ------- | --------- | -------- | ------ | ----- |
| 1-09-26  | 8420    | 12680     | 7310     | 4985   | 10940 |
| 2-09-26  | 9675    | 11120     | 8155     | 6430   | 9240  |
| 3-09-26  | 7150    |           | 6940     | 7825   | 12085 |

Dates can be written as `1-09-26`, `01-09-2026`, `2026-09-01`, or as a real
Excel date cell — all are understood. Rows outside the race window
(`startDate`…`endDate`) are ignored.

Run `npm run validate` after editing to see exactly what the site will show.

---

## Changing the race settings

Everything is in [`lib/race-config.ts`](./lib/race-config.ts).

| Setting            | What it does                                                              |
| ------------------ | ------------------------------------------------------------------------- |
| `startDate`        | First day counted, inclusive.                                             |
| `endDate`          | Last day counted, inclusive.                                              |
| `maximumSteps`     | Where the finish line is. Change it to `500000` and the road, the axis, the milestones and the finish line all extend automatically. |
| `axisInterval`     | Spacing between milestones, e.g. `5000`.                                  |
| `lastUpdated`      | The date and time shown as `DATA UPDATED` in the header.                  |
| `participants`     | Who is in the race.                                                       |

`sceneConfig` in the same file controls how the world is drawn:

| Setting              | What it does                                                     |
| -------------------- | ---------------------------------------------------------------- |
| `pixelsPerInterval`  | Horizontal pixels between two milestones. Raise it to spread the race out, lower it to fit more on screen. |
| `startPad`/`endPad`  | Empty world before 0K and after the finish line.                 |
| `majorEvery`         | Every Nth milestone gets a bold axis label (default: every 5th, so every 25K). |
| `decorEvery`         | Roughly one roadside prop every N milestones.                    |

Nothing is hard-coded in the UI — the runners, the milestone signs, the axis
ticks and the finish line are all placed by the same `stepsToX` function, so
they can never fall out of alignment.

### Adding a participant

1. Add an entry to `participants` in `lib/race-config.ts` with a unique `id`, a
   `name`, a `gender`, a `sprite` file name from `public/assets/`, and an
   `accent` colour.
2. Add a column to `data/steps.xlsx` whose heading is **exactly** the `name`.
3. Commit and push.

Rankings, nameplate placement and the tooltip all adapt on their own.

---

## Where things live

```
app/
  layout.tsx          page shell and the pixel font
  page.tsx            the header and the race
  globals.css         every style in the site
  data/page.tsx       a plain table of what was read from the workbook (/data)
  fonts/              Press Start 2P, self-hosted so builds need no network
components/
  race-scene.tsx      the scrolling race world and the runner tooltip
lib/
  race-config.ts      all settings — start here
  race-data.ts        reads the workbook, works out totals and rankings
  race-scene.ts       turns step counts into positions in the world
  format.ts           number and date formatting
data/steps.xlsx       the source of truth
public/assets/        the pixel art
scripts/validate-race.ts
```

The layers are deliberately separate: `race-config` holds decisions,
`race-data` holds the workbook, `race-scene` holds the maths, and
`race-scene.tsx` only draws.

### `/data`

<http://localhost:3000/data> shows a plain table of the parsed workbook,
the totals, the ranks and the computed positions. Useful for checking a
workbook edit. It is not linked from the race page.

---

## Notes on the details

- **Dates and numbers never depend on the viewer's device.** Step counts are
  formatted by hand (`37,614`) and the `DATA UPDATED` label is read straight out
  of the `lastUpdated` string, so the server and the browser always agree and
  the time shown is the data's time, not the reader's clock.
- **Blank means blank.** A missing cell is `null` all the way through, so a
  person who has not reported yet is never shown as having walked 0 steps.
- **Nameplates never collide.** They are spread over two rows by a small
  packing pass, so even runners a few hundred steps apart stay readable.
- **The art is used as supplied**, only cropped and resized. The city backdrop
  and the road are mirror-tiled so they repeat across the whole world without a
  visible seam.

---

## Deploying to Render

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment: `Node`

No database, no environment variables, no external services.
