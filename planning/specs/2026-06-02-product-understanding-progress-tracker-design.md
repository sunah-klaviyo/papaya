# Design: Product Understanding Progress Tracker

**Date:** 2026-06-02
**Status:** Approved (design); ready for implementation planning
**Author:** Sunah Lee (with Claude)

## Purpose

A static, shareable web page that visualizes progress on the Linear project
[**Improving Product Understanding**](https://linear.app/klaviyo/project/improving-product-understanding-5832aed06e4e/overview)
for stakeholders. It renders two views from a single hand-maintained data file:

1. A **timeline (Gantt)** — milestones laid out on a month + week axis, one row per person, with a "today" marker.
2. A **milestone dependency diagram** — a separate node-link graph showing how milestones depend on each other (the one thing Linear cannot express).

Deployed to GitHub Pages and updated by editing a markdown file and pushing.

## Background & constraints

- The Linear project has **9 milestones**; only 2 have target dates and none have durations or estimates. So timeline dates and **all** dependency relationships must be supplied by hand — they do not exist in Linear.
- A static GitHub Pages site **cannot call the Linear API at runtime** (no server; the API needs a token that can't ship in a public page). The data is therefore captured into a file the page reads.
- Owner's preference: simple, functional, low-maintenance. Updating the chart should be "edit a file, push" — no build step, no secrets, no CI.

## Key decisions (resolved during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Timeline rows | **One row per person** (Sunah, Meredith); bars are the milestones that person owns. |
| 2 | Data source | **One hand-maintained `plan.md`**, fetched and parsed in the browser. No runtime Linear API. |
| 3 | Progress tracking | **None per-day / no percent.** A milestone is a bar between two dates; the "today" line shows where we are. |
| 4 | Scheduling | **Cascade (auto-shift).** Author edits dates; dependents auto-reflow right (see Scheduler). |
| 5 | Dependency arrows | **Not on the timeline.** Shown in a **separate dependency diagram** below it (the timeline was too cluttered with overlaid arrows). |
| 6 | Timeline window | **Starts at a configurable view date (currently May 1, 2026).** Earlier portions are dropped/clipped. |
| 7 | Colors | **All bars one blue** for now (no per-owner color). Lanes separated by labels + zebra background. |
| 8 | Stack | **Zero-build static site:** plain HTML + ES-module JS + CSS, no framework, no dependencies. |

## Architecture

```
docs/                         ← GitHub Pages serves this folder
  index.html                  page shell: <h1>, two cards (#chart, #dag), legends
  styles.css
  plan.md                     ← the data the user hand-edits
  src/
    parse.js     parsePlan(text)        -> { config, milestones[] }
    schedule.js  schedule(milestones)   -> milestones with effectiveStart/effectiveEnd
    layout.js    timeline + dep-graph geometry helpers (pure)
    timeline.js  renderTimeline(container, scheduled, config)
    depgraph.js  renderDepGraph(container, milestones)
    app.js       fetch('plan.md') -> parse -> schedule -> render both views
test/
  parse.test.js
  schedule.test.js
  layout.test.js
.github/  (optional) — not required; Pages serves /docs directly
```

**Runtime flow:** browser loads `index.html` → `app.js` (`<script type="module">`) → `fetch('plan.md')` (same-origin on Pages) → `parsePlan` → `schedule` → `renderTimeline` + `renderDepGraph`. Edit `plan.md`, push, the site reflects it on next load. No build.

Core logic (`parse`, `schedule`, `layout`) is written as pure ES modules with **no DOM access**, so the same files are imported by the browser and by `node --test`.

## Data format (`plan.md`)

A small config block followed by one `##` section per milestone. Chosen because it is trivial to hand-edit and trivial to parse with a few lines of JS (no markdown library needed).

```markdown
---
view-start: 2026-05-01
---

## align: Disambiguate high-level requirements
- owner: Sunah
- start: 2026-03-16
- end: 2026-04-10
- depends-on:

## tech-spec: Disambiguate technical requirements and produce tech spec
- owner: Sunah
- start: 2026-04-10
- end: 2026-05-22
- depends-on: align

## datastore: Build unified product datastore
- owner: Sunah
- start: 2026-05-22
- end: 2026-06-17
- depends-on: tech-spec
```

Rules:
- Heading: `## <id>: <Title>`. `id` is a short stable slug used by `depends-on` (renaming the Title never breaks links).
- Fields: `owner` (`Sunah` | `Meredith`), `start` and `end` as `YYYY-MM-DD`, `depends-on` as a comma-separated list of ids (empty = no dependency).
- Front-matter config (between `---` fences): `view-start` (timeline window start). Optional; defaults to the earliest milestone start. Room to add more config later (e.g. `today` override) without changing the parser shape.
- `parsePlan` returns `{ config, milestones: [{id, name, owner, start, end, deps[]}] }` and **validates**: unknown `depends-on` ids, duplicate ids, dependency cycles, and `end < start` are reported as clear errors surfaced on the page (rather than silently mis-rendering).

The repo ships a seeded `plan.md` containing all 9 real milestones: real Linear dates where they exist (`align` → 4/10, `tech-spec` → 5/22), reasonable placeholder dates elsewhere, owners assigned from Linear issue assignees, and a starter dependency graph — all of which the owner edits going forward.

## Scheduler (`schedule.js`) — the cascade

Pure function over **working days** (weekends and the owner's PTO are skipped). Each task needs `requiredWork` working days of effort — its `days` estimate, or the working-day span of its declared dates when `days` is absent. Declared dates are the baseline; dependencies push dependents right but never pull them earlier.

```
requiredWork(m)    = days(m)  ?? workingDaysBetween(declaredStart(m), declaredEnd(m))
effectiveStart(m)  = nextWorkable( max( declaredStart(m), max over d in deps(m) of effectiveEnd(d) ), owner(m) )
effectiveEnd(m)    = the requiredWork-th workable day on/after effectiveStart  // skips weekends + owner PTO
```

`workable(day, owner)` = the day is Mon–Fri **and** not in that owner's PTO. Computed by topological order over the dependency DAG (forward pass). Consequences:
- A PTO day (or weekend) inside a task's window pushes its end out by that many working days — the task still gets its full `requiredWork` of actual work.
- Author extends a milestone → every downstream dependent slides right; nothing dependent ever starts before its prerequisite ends.
- A milestone whose declared start is already later than all its dependencies' ends stays put (no left-pull).
- Cross-person dependencies are respected (a Meredith milestone can wait on a Sunah milestone).

The timeline renders **effective** dates; `plan.md` keeps the author's declared baseline. PTO data flows in from the `## pto:` section.

## View 1 — Timeline (`timeline.js`)

- **Axis (working days only, dual band):** the x-axis counts **weekdays only** — weekends collapse to zero width. A month band sits on top; below it, the week band is divided into **Mon–Fri blocks (5 working days each)**, labeled by each block's Monday date. Vertical gridlines at week and month boundaries.
- **Window:** the axis origin is the first **Monday on/after** `config.view-start` (so blocks are clean Mon–Fri), running to the latest effective end (+ small working-day padding). Milestones ending before the window are omitted; milestones starting before it are **clipped** at the left edge and marked (flat left corner + accent stripe) to signal "started earlier."
- **Rows = people** (`Sunah`, `Meredith`), each a labeled lane with a faint zebra background. **Bars = milestones owned by that person**, positioned and sized in working days (a bar covers through its end day, so its width equals its **business-day length**). All one blue. Each bar's label is the milestone name followed by that business-day length in parentheses, e.g. `Build product datastore (5d)` — which matches the optional `days` field in `plan.md` when the dates were derived from it.
- **Overlap handling:** within a lane, bars are packed onto **sub-rows** by greedy interval assignment so overlapping milestones never visually collide (e.g. Ingestion + Integration).
- **Today:** a red vertical line at the current date (real `new Date()` by default). No text label.
- **PTO:** an optional `## pto:` section in `plan.md` lists each person's days off (`- Meredith: 2026-05-08`). Each PTO day grays out a one-working-day slice (1/5 of a week block) in that person's lane. PTO is purely visual — it does not reschedule tasks.
- **No dependency arrows here.**

## View 2 — Dependency diagram (`depgraph.js`)

A separate node-link graph below the timeline.

- **Nodes:** every milestone (including any before the timeline window — this view is the logical structure, independent of dates). Each node shows the milestone name and owner.
- **Layout:** layered left→right by **dependency depth** = longest path from a root (`layer(m) = 0` if no deps, else `max(layer(dep)) + 1`). Nodes in a layer share a column and are stacked/centered vertically.
- **Edges:** a curved (cubic-bezier) arrow from each prerequisite's right side to each dependent's left side, arrowhead = prerequisite → dependent.
- Driven by the same parsed data, so editing `depends-on` in `plan.md` updates this diagram automatically.

## Testing

Pure modules get unit tests via Node's built-in runner (`node --test`), no dependencies:
- **`parse.test.js`:** well-formed file → correct structure; config defaults; and each validation error (unknown dep id, duplicate id, cycle, `end < start`).
- **`schedule.test.js`:** simple chain; an `end` extension that cascades a dependent; fan-out (one prerequisite, several dependents); a fan-in (`backfill` depends on two); and a declared start later than its dependency (must **not** pull left).
- **`layout.test.js`:** sub-row packing assigns overlapping intervals to distinct rows and non-overlapping to the same row; dependency-depth layering assigns expected layers for the seeded graph.

## Deployment

- Site lives in **`docs/`** on the default branch.
- GitHub Pages → **Deploy from branch → `main` / `/docs`**. No workflow file or secrets needed.
- Repo: `sunah-klaviyo/papaya` → published at **https://sunah-klaviyo.github.io/papaya/**.
- Update workflow: edit `docs/plan.md` → commit → push → Pages redeploys automatically.

## Out of scope (YAGNI for now)

- Live Linear API sync / progress percentages (decision #3).
- Per-owner colors or status shading (#7) — trivial to add later via an optional field.
- Dependency arrows overlaid on the timeline (#5).
- A build step, framework, or bundler (#8).
