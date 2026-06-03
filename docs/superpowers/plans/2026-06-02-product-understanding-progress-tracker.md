# Product Understanding Progress Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-build static site (deployed to GitHub Pages) that renders a person-laned Gantt timeline plus a separate milestone dependency diagram from a hand-maintained `plan.md`.

**Architecture:** Plain ES-module JS, no framework/bundler/deps. Pure logic modules (`dates`, `parse`, `schedule`, `layout`) are imported by both the browser and `node --test`. The browser fetches `plan.md`, parses it, runs a dependency-aware cascade scheduler, then renders two views into the page. Updating the chart is "edit `plan.md`, push."

**Tech Stack:** HTML, CSS, vanilla ES modules, Node's built-in test runner (`node --test`), GitHub Pages (deploy from `/docs`).

**Spec:** `docs/superpowers/specs/2026-06-02-product-understanding-progress-tracker-design.md`

---

## File Structure

```
package.json                  type:module, "test": "node --test"
docs/                         ← GitHub Pages serves this folder
  index.html                  shell: <h1>, #chart card, #dag card, #error banner
  styles.css                  all visual styling (classes used by renderers)
  plan.md                     ← the hand-edited data file
  src/
    dates.js      toEpochDay / fromEpochDay / todayEpochDay  (pure)
    parse.js      parsePlan(text) -> {config, milestones[]}  + validation (pure)
    schedule.js   schedule(milestones) -> [...startDay,endDay] cascade (pure)
    layout.js     packSubRows() + computeLayers()            (pure)
    timeline.js   renderTimeline(container, scheduled, config) (DOM)
    depgraph.js   renderDepGraph(container, milestones)        (DOM)
    app.js        fetch -> parse -> schedule -> render; error surfacing
test/
  dates.test.js
  parse.test.js
  schedule.test.js
  layout.test.js
```

**Shared data shapes (used across tasks — keep names exact):**
- `parsePlan(text)` → `{ config: { viewStart: string|null }, milestones: Milestone[] }`
- `Milestone` = `{ id: string, name: string, owner: string, start: 'YYYY-MM-DD', end: 'YYYY-MM-DD', deps: string[] }`
- `schedule(milestones)` → array of `Milestone` each extended with `startDay: number, endDay: number` (effective, post-cascade, integer epoch-days)

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `docs/`, `docs/src/`, `test/` (directories)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "papaya-progress-tracker",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create the directories**

Run:
```bash
mkdir -p docs/src test
```

- [ ] **Step 3: Verify the test runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with a summary like `tests 0` / `pass 0` (no test files found yet is fine).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "$(printf 'chore: scaffold progress tracker project\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: `dates.js` — epoch-day helpers

**Files:**
- Create: `docs/src/dates.js`
- Test: `test/dates.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/dates.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toEpochDay, fromEpochDay } from '../docs/src/dates.js';

test('toEpochDay is a round integer count of days', () => {
  assert.equal(toEpochDay('1970-01-01'), 0);
  assert.equal(toEpochDay('1970-01-02'), 1);
});

test('toEpochDay difference equals calendar day count', () => {
  assert.equal(toEpochDay('2026-05-22') - toEpochDay('2026-05-01'), 21);
});

test('fromEpochDay is the inverse of toEpochDay', () => {
  assert.equal(fromEpochDay(toEpochDay('2026-06-17')), '2026-06-17');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/dates.test.js`
Expected: FAIL — cannot find module `../docs/src/dates.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// docs/src/dates.js
const MS = 86400000;

export function toEpochDay(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS);
}

export function fromEpochDay(day) {
  const dt = new Date(day * MS);
  const p = n => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

export function todayEpochDay() {
  return Math.floor(Date.now() / MS);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/dates.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/src/dates.js test/dates.test.js
git commit -m "$(printf 'feat: add epoch-day date helpers\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: `parse.js` — parse `plan.md` (happy path)

**Files:**
- Create: `docs/src/parse.js`
- Test: `test/parse.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/parse.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlan } from '../docs/src/parse.js';

const SAMPLE = `---
view-start: 2026-05-01
---

## align: Disambiguate high-level requirements
- owner: Sunah
- start: 2026-03-16
- end: 2026-04-10
- depends-on:

## tech-spec: Tech spec
- owner: Sunah
- start: 2026-04-10
- end: 2026-05-22
- depends-on: align

## backfill: Catalogs Backfill
- owner: Meredith
- start: 2026-06-17
- end: 2026-07-05
- depends-on: tech-spec, align
`;

test('reads view-start from front matter', () => {
  const { config } = parsePlan(SAMPLE);
  assert.equal(config.viewStart, '2026-05-01');
});

test('parses every milestone with its fields', () => {
  const { milestones } = parsePlan(SAMPLE);
  assert.equal(milestones.length, 3);
  const tech = milestones.find(m => m.id === 'tech-spec');
  assert.deepEqual(tech, {
    id: 'tech-spec', name: 'Tech spec', owner: 'Sunah',
    start: '2026-04-10', end: '2026-05-22', deps: ['align'],
  });
});

test('empty depends-on yields no deps; multiple are split and trimmed', () => {
  const { milestones } = parsePlan(SAMPLE);
  assert.deepEqual(milestones.find(m => m.id === 'align').deps, []);
  assert.deepEqual(milestones.find(m => m.id === 'backfill').deps, ['tech-spec', 'align']);
});

test('viewStart defaults to null when no front matter', () => {
  const { config } = parsePlan('## a: A\n- owner: Sunah\n- start: 2026-01-01\n- end: 2026-01-02\n- depends-on:\n');
  assert.equal(config.viewStart, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/parse.test.js`
Expected: FAIL — cannot find module `../docs/src/parse.js`.

- [ ] **Step 3: Write minimal implementation (no validation yet)**

```js
// docs/src/parse.js
export function parsePlan(text) {
  const config = { viewStart: null };
  let body = text;

  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
      if (m && m[1] === 'view-start') config.viewStart = m[2].trim() || null;
    }
    body = text.slice(fm[0].length);
  }

  const milestones = [];
  const sections = body.split(/^##\s+/m).slice(1);
  for (const sec of sections) {
    const lines = sec.split('\n');
    const hm = lines[0].match(/^([\w-]+)\s*:\s*(.+)$/);
    if (!hm) throw new Error(`Invalid milestone heading: "## ${lines[0]}". Expected "## <id>: <Title>".`);
    const id = hm[1].trim();
    const name = hm[2].trim();
    const fields = {};
    for (const line of lines.slice(1)) {
      const f = line.match(/^\s*-\s*([\w-]+)\s*:\s*(.*)$/);
      if (f) fields[f[1].trim()] = f[2].trim();
    }
    const deps = (fields['depends-on'] || '').split(',').map(s => s.trim()).filter(Boolean);
    milestones.push({
      id, name,
      owner: fields.owner || '',
      start: fields.start || '',
      end: fields.end || '',
      deps,
    });
  }
  return { config, milestones };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/parse.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/src/parse.js test/parse.test.js
git commit -m "$(printf 'feat: parse plan.md into config and milestones\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: `parse.js` — validation

**Files:**
- Modify: `docs/src/parse.js`
- Test: `test/parse.test.js` (add cases)

- [ ] **Step 1: Add failing validation tests**

Append to `test/parse.test.js`:

```js
const milestone = (id, deps = [], start = '2026-01-01', end = '2026-01-02') =>
  `## ${id}: ${id}\n- owner: Sunah\n- start: ${start}\n- end: ${end}\n- depends-on: ${deps.join(', ')}\n`;

test('rejects unknown depends-on id', () => {
  const text = milestone('a', ['ghost']);
  assert.throws(() => parsePlan(text), /unknown id "ghost"/);
});

test('rejects duplicate ids', () => {
  const text = milestone('a') + '\n' + milestone('a');
  assert.throws(() => parsePlan(text), /Duplicate milestone id: "a"/);
});

test('rejects end before start', () => {
  const text = milestone('a', [], '2026-02-01', '2026-01-01');
  assert.throws(() => parsePlan(text), /ends before it starts/);
});

test('rejects a dependency cycle', () => {
  const text = milestone('a', ['b']) + '\n' + milestone('b', ['a']);
  assert.throws(() => parsePlan(text), /cycle detected/);
});

test('rejects malformed dates', () => {
  const text = milestone('a', [], 'soon', '2026-01-02');
  assert.throws(() => parsePlan(text), /invalid start date/);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test test/parse.test.js`
Expected: the 4 original tests PASS; the 5 new tests FAIL (no error thrown).

- [ ] **Step 3: Add validation to `parse.js`**

In `docs/src/parse.js`, add a `validate(milestones)` call before `return`, and add these functions at the bottom of the file:

```js
// at the end of parsePlan, just before `return { config, milestones };`
  validate(milestones);
```

```js
function validate(milestones) {
  const ids = new Set();
  for (const m of milestones) {
    if (ids.has(m.id)) throw new Error(`Duplicate milestone id: "${m.id}".`);
    ids.add(m.id);
  }
  const isISO = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
  for (const m of milestones) {
    if (!isISO(m.start)) throw new Error(`Milestone "${m.id}" has invalid start date: "${m.start}".`);
    if (!isISO(m.end)) throw new Error(`Milestone "${m.id}" has invalid end date: "${m.end}".`);
    if (m.end < m.start) throw new Error(`Milestone "${m.id}" ends before it starts (${m.start} → ${m.end}).`);
    for (const dep of m.deps) {
      if (!ids.has(dep)) throw new Error(`Milestone "${m.id}" depends on unknown id "${dep}".`);
    }
  }
  detectCycle(milestones);
}

function detectCycle(milestones) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  const state = {}; // undefined = unseen, 0 = visiting, 1 = done
  const dfs = (id, stack) => {
    if (state[id] === 1) return;
    if (state[id] === 0) throw new Error(`Dependency cycle detected: ${[...stack, id].join(' -> ')}.`);
    state[id] = 0;
    for (const dep of byId[id].deps) dfs(dep, [...stack, id]);
    state[id] = 1;
  };
  for (const m of milestones) dfs(m.id, []);
}
```

(ISO `YYYY-MM-DD` strings compare correctly with `<`, so the `end < start` check is valid string comparison.)

- [ ] **Step 4: Run tests to verify all pass**

Run: `node --test test/parse.test.js`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/src/parse.js test/parse.test.js
git commit -m "$(printf 'feat: validate plan.md (ids, dates, deps, cycles)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: `schedule.js` — cascade scheduler

**Files:**
- Create: `docs/src/schedule.js`
- Test: `test/schedule.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/schedule.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from '../docs/src/schedule.js';
import { toEpochDay } from '../docs/src/dates.js';

const m = (id, start, end, deps = []) => ({ id, name: id, owner: 'Sunah', start, end, deps });
const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));

test('a milestone with no deps keeps its declared dates', () => {
  const out = byId(schedule([m('a', '2026-05-01', '2026-05-11')]));
  assert.equal(out.a.startDay, toEpochDay('2026-05-01'));
  assert.equal(out.a.endDay, toEpochDay('2026-05-11'));
});

test('a dependent is pushed to start when its prerequisite ends, preserving its duration', () => {
  // b declared 05-05..05-09 (4d) but depends on a ending 05-20 -> b shifts to 05-20..05-24
  const out = byId(schedule([
    m('a', '2026-05-01', '2026-05-20'),
    m('b', '2026-05-05', '2026-05-09', ['a']),
  ]));
  assert.equal(out.b.startDay, toEpochDay('2026-05-20'));
  assert.equal(out.b.endDay - out.b.startDay, 4); // duration preserved
});

test('extending a prerequisite cascades down the whole chain', () => {
  const out = byId(schedule([
    m('a', '2026-05-01', '2026-05-25'),         // long
    m('b', '2026-05-02', '2026-05-06', ['a']),  // 4d
    m('c', '2026-05-03', '2026-05-08', ['b']),  // 5d
  ]));
  assert.equal(out.b.startDay, toEpochDay('2026-05-25'));
  assert.equal(out.c.startDay, toEpochDay('2026-05-29')); // after b's pushed end
});

test('fan-in waits for the latest prerequisite', () => {
  const out = byId(schedule([
    m('a', '2026-05-01', '2026-05-10'),
    m('b', '2026-05-01', '2026-05-20'),
    m('c', '2026-05-02', '2026-05-04', ['a', 'b']),
  ]));
  assert.equal(out.c.startDay, toEpochDay('2026-05-20')); // max(a.end, b.end)
});

test('a declared start later than its dependency is NOT pulled left', () => {
  const out = byId(schedule([
    m('a', '2026-05-01', '2026-05-05'),
    m('b', '2026-06-01', '2026-06-10', ['a']), // starts well after a ends
  ]));
  assert.equal(out.b.startDay, toEpochDay('2026-06-01')); // unchanged
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/schedule.test.js`
Expected: FAIL — cannot find module `../docs/src/schedule.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// docs/src/schedule.js
import { toEpochDay } from './dates.js';

// Returns each milestone extended with effective startDay/endDay (epoch-day integers).
// Declared dates are the baseline; dependencies push dependents right, never left.
// Assumes a valid DAG (parse.js rejects cycles).
export function schedule(milestones) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  const memo = {};

  const compute = id => {
    if (memo[id]) return memo[id];
    const m = byId[id];
    const declStart = toEpochDay(m.start);
    const duration = toEpochDay(m.end) - declStart;
    let startDay = declStart;
    for (const dep of m.deps) startDay = Math.max(startDay, compute(dep).endDay);
    return (memo[id] = { ...m, startDay, endDay: startDay + duration });
  };

  return milestones.map(m => compute(m.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/schedule.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add docs/src/schedule.js test/schedule.test.js
git commit -m "$(printf 'feat: add dependency-aware cascade scheduler\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: `layout.js` — sub-row packing & dependency layering

**Files:**
- Create: `docs/src/layout.js`
- Test: `test/layout.test.js`

- [ ] **Step 1: Write the failing test**

```js
// test/layout.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packSubRows, computeLayers } from '../docs/src/layout.js';

test('non-overlapping intervals share row 0', () => {
  const { row, rowCount } = packSubRows([
    { id: 'a', startDay: 0, endDay: 5 },
    { id: 'b', startDay: 5, endDay: 9 },
  ]);
  assert.equal(row.a, 0);
  assert.equal(row.b, 0);
  assert.equal(rowCount, 1);
});

test('overlapping intervals go on separate rows', () => {
  const { row, rowCount } = packSubRows([
    { id: 'a', startDay: 0, endDay: 10 },
    { id: 'b', startDay: 3, endDay: 8 },
  ]);
  assert.notEqual(row.a, row.b);
  assert.equal(rowCount, 2);
});

test('computeLayers assigns longest-path depth', () => {
  const layer = computeLayers([
    { id: 'a', deps: [] },
    { id: 'b', deps: ['a'] },
    { id: 'c', deps: ['a'] },
    { id: 'd', deps: ['b', 'c'] },
    { id: 'e', deps: ['a'] },           // depends only on root
  ]);
  assert.equal(layer.a, 0);
  assert.equal(layer.b, 1);
  assert.equal(layer.c, 1);
  assert.equal(layer.d, 2);
  assert.equal(layer.e, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/layout.test.js`
Expected: FAIL — cannot find module `../docs/src/layout.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// docs/src/layout.js

// Greedy interval packing: each milestone gets the first row whose last item already ended.
// Input items must have integer startDay/endDay. Returns { row: {id->index}, rowCount }.
export function packSubRows(items) {
  const sorted = [...items].sort((a, b) => a.startDay - b.startDay);
  const rowEnd = [];
  const row = {};
  for (const m of sorted) {
    let r = rowEnd.findIndex(end => end <= m.startDay);
    if (r === -1) { r = rowEnd.length; rowEnd.push(0); }
    rowEnd[r] = m.endDay;
    row[m.id] = r;
  }
  return { row, rowCount: rowEnd.length };
}

// Longest-path layering over the dependency DAG: layer 0 = no deps, else max(dep layer)+1.
export function computeLayers(milestones) {
  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  const layer = {};
  const visit = id => {
    if (layer[id] != null) return layer[id];
    const m = byId[id];
    if (!m.deps.length) return (layer[id] = 0);
    let L = 0;
    for (const d of m.deps) L = Math.max(L, visit(d) + 1);
    return (layer[id] = L);
  };
  milestones.forEach(m => visit(m.id));
  return layer;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/layout.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS (dates 3, parse 9, schedule 5, layout 3).

- [ ] **Step 6: Commit**

```bash
git add docs/src/layout.js test/layout.test.js
git commit -m "$(printf 'feat: add sub-row packing and dependency layering\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 7: Seed `docs/plan.md`

**Files:**
- Create: `docs/plan.md`

- [ ] **Step 1: Write the seed data file**

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

## ingestion: Build Catalogs Ingestion
- owner: Meredith
- start: 2026-05-22
- end: 2026-06-17
- depends-on: tech-spec

## integration: Build Catalogs Integration
- owner: Meredith
- start: 2026-05-25
- end: 2026-06-12
- depends-on: tech-spec

## search: Support indexing and search
- owner: Sunah
- start: 2026-06-17
- end: 2026-06-29
- depends-on: datastore

## backfill: Build Catalogs Backfill
- owner: Meredith
- start: 2026-06-17
- end: 2026-07-05
- depends-on: ingestion, datastore

## agent-ui: Support agent context input and build UI component
- owner: Sunah
- start: 2026-06-29
- end: 2026-07-11
- depends-on: search

## rollout: Rollout
- owner: Sunah
- start: 2026-07-11
- end: 2026-07-15
- depends-on: agent-ui, backfill
```

- [ ] **Step 2: Verify it parses and schedules without error**

Run:
```bash
node --input-type=module -e "import {readFileSync} from 'fs'; import {parsePlan} from './docs/src/parse.js'; import {schedule} from './docs/src/schedule.js'; const {config,milestones}=parsePlan(readFileSync('docs/plan.md','utf8')); console.log('viewStart',config.viewStart,'milestones',milestones.length); console.log(schedule(milestones).map(m=>m.id+' '+m.startDay+'->'+m.endDay).join('\n'));"
```
Expected: prints `viewStart 2026-05-01 milestones 9` and 9 lines of `id start->end` epoch-day numbers, no error.

- [ ] **Step 3: Commit**

```bash
git add docs/plan.md
git commit -m "$(printf 'feat: seed plan.md with the 9 project milestones\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 8: `index.html` + `styles.css` shell

**Files:**
- Create: `docs/index.html`
- Create: `docs/styles.css`

- [ ] **Step 1: Write `docs/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Improving Product Understanding — progress</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="wrap">
    <h1>Improving Product Understanding — progress</h1>
    <p class="sub">May onward · two views: a timeline, and a milestone-dependency diagram.</p>

    <div id="error" class="error" style="display:none"></div>

    <div class="card">
      <h2>Timeline</h2>
      <div class="scroll"><div id="chart"></div></div>
      <div class="legend">
        <span><span class="sw" style="background:#2f80ed"></span>Milestone</span>
        <span><span class="sw today-sw"></span>Today</span>
        <span>Rows = people · bars = milestones they own · month + week axis</span>
      </div>
    </div>

    <div class="card">
      <h2>Milestone dependencies</h2>
      <div class="scroll"><div id="dag"></div></div>
      <div class="legend">
        <span>Arrows: prerequisite → dependent (flows left to right by dependency depth)</span>
      </div>
    </div>
  </div>
  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `docs/styles.css`**

```css
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; background: #f5f7fb; color: #23272f; }
.wrap { padding: 26px 32px 50px; }
h1 { font-size: 26px; margin: 0 0 6px; }
.sub { color: #6b7280; font-size: 15px; margin: 0 0 22px; }
h2 { font-size: 17px; margin: 0 0 14px; color: #374151; }
.card { background: #fff; border: 1px solid #e3e8f0; border-radius: 14px; padding: 22px; box-shadow: 0 1px 3px rgba(16,24,40,.05); margin-bottom: 26px; }
.scroll { overflow-x: auto; }
.error { background: #fdecea; border: 1px solid #f5c2bd; color: #9b1c14; border-radius: 10px; padding: 12px 16px; margin-bottom: 22px; font-size: 14px; white-space: pre-wrap; }
.legend { display: flex; gap: 26px; align-items: center; font-size: 14px; color: #4b5563; margin: 18px 2px 0; flex-wrap: wrap; }
.legend .sw { display: inline-block; width: 18px; height: 12px; border-radius: 3px; margin-right: 7px; vertical-align: middle; }
.legend .today-sw { width: 3px; height: 16px; border-radius: 1px; background: #e0533d; }

/* timeline */
#chart { position: relative; }
.lane-bg { position: absolute; left: 0; }
.mhead { position: absolute; top: 0; text-align: center; font-size: 14px; font-weight: 700; letter-spacing: .04em; color: #5b6472; background: #eef2f8; border-left: 1px solid #ccd4e0; }
.whead { position: absolute; text-align: center; font-size: 11px; color: #8a93a3; border-left: 1px solid #e7ecf3; }
.grid { position: absolute; width: 1px; background: #eef2f7; }
.mgrid { position: absolute; width: 1px; background: #ccd4e0; }
.lane-sep { position: absolute; height: 1px; background: #dde3ec; left: 0; }
.lane-lbl { position: absolute; left: 16px; font-weight: 700; font-size: 16px; color: #374151; }
.lane-cap { position: absolute; left: 16px; font-size: 12px; color: #9aa3b2; }
.bar { position: absolute; border-radius: 7px; color: #fff; font-size: 14px; font-weight: 500; display: flex; align-items: center; padding: 0 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; box-shadow: 0 1px 2px rgba(0,0,0,.18); z-index: 3; }
.bar.clipped { border-top-left-radius: 0; border-bottom-left-radius: 0; border-left: 3px solid #1c5fb8; }
.today-line { position: absolute; width: 2px; background: #e0533d; z-index: 5; }

/* dependency graph */
#dag { position: relative; }
.node { position: absolute; background: #eaf2fe; border: 1.6px solid #2f80ed; border-radius: 9px; padding: 7px 11px; z-index: 2; box-shadow: 0 1px 2px rgba(16,24,40,.06); }
.node .nm { font-size: 13px; font-weight: 600; color: #173a5e; line-height: 1.2; }
.node .ow { font-size: 11px; color: #6b7280; margin-top: 2px; }
```

- [ ] **Step 3: Commit**

```bash
git add docs/index.html docs/styles.css
git commit -m "$(printf 'feat: add page shell and styles\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 9: `timeline.js` — render the Gantt

**Files:**
- Create: `docs/src/timeline.js`

This module has no unit test (it's DOM rendering verified visually in Task 11). It reuses the tested `packSubRows` and `dates` helpers.

- [ ] **Step 1: Write `docs/src/timeline.js`**

```js
// docs/src/timeline.js
import { toEpochDay, fromEpochDay, todayEpochDay } from './dates.js';
import { packSubRows } from './layout.js';

const MS = 86400000;
const OWNERS = ['Sunah', 'Meredith'];
const ORIGIN_X = 210, MONTH_H = 34, WEEK_H = 30, HEAD_H = MONTH_H + WEEK_H;
const SUBROW_H = 70, BAR_H = 32, GUT = (SUBROW_H - BAR_H) / 2;
const BLUE = '#2f80ed';
const MONTH = ['JAN', 'FEB', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function renderTimeline(container, scheduled, config) {
  container.innerHTML = '';

  const viewStartDay = config.viewStart
    ? toEpochDay(config.viewStart)
    : Math.min(...scheduled.map(m => m.startDay));
  const chartEndDay = Math.max(...scheduled.map(m => m.endDay)) + 4;
  const vis = scheduled.filter(m => m.endDay > viewStartDay);

  const TL_W = Math.max(1150, window.innerWidth - ORIGIN_X - 120);
  const totalDays = chartEndDay - viewStartDay;
  const PPD = TL_W / totalDays;
  const x = day => ORIGIN_X + (day - viewStartDay) * PPD;

  // pack sub-rows per owner lane
  const laneTop = {}, laneRows = {}, rowOf = {};
  let yc = HEAD_H;
  for (const owner of OWNERS) {
    laneTop[owner] = yc;
    const { row, rowCount } = packSubRows(vis.filter(m => m.owner === owner));
    Object.assign(rowOf, row);
    laneRows[owner] = Math.max(rowCount, 1);
    yc += laneRows[owner] * SUBROW_H;
  }
  const BODY_BOTTOM = yc, TOTAL_W = ORIGIN_X + TL_W;
  container.style.width = TOTAL_W + 'px';
  container.style.height = BODY_BOTTOM + 'px';
  const add = html => container.insertAdjacentHTML('beforeend', html);
  const barY = m => laneTop[m.owner] + rowOf[m.id] * SUBROW_H + GUT;

  // zebra lane backgrounds
  OWNERS.forEach((owner, i) => {
    add(`<div class="lane-bg" style="top:${laneTop[owner]}px;height:${laneRows[owner] * SUBROW_H}px;width:${TOTAL_W}px;background:${i % 2 ? '#f4f7fb' : '#ffffff'}"></div>`);
  });

  // month band + month gridlines
  let curMs = viewStartDay * MS;
  const endMs = chartEndDay * MS;
  while (curMs < endMs) {
    const dt = new Date(curMs), y = dt.getUTCFullYear(), mo = dt.getUTCMonth();
    const nextMs = Date.UTC(mo === 11 ? y + 1 : y, (mo + 1) % 12, 1);
    const segEnd = Math.min(nextMs, endMs);
    const left = x(curMs / MS), w = (segEnd - curMs) / MS * PPD;
    add(`<div class="mhead" style="left:${left}px;width:${w}px;height:${MONTH_H}px;line-height:${MONTH_H}px">${MONTH[mo]}</div>`);
    add(`<div class="mgrid" style="left:${left}px;top:0;height:${BODY_BOTTOM}px"></div>`);
    curMs = nextMs;
  }

  // week columns + gridlines (7-day, anchored at viewStart)
  for (let wk = viewStartDay; wk < chartEndDay; wk += 7) {
    const left = x(wk), w = 7 * PPD, dt = new Date(wk * MS);
    add(`<div class="whead" style="left:${left}px;width:${w}px;top:${MONTH_H}px;height:${WEEK_H}px;line-height:${WEEK_H}px">${dt.getUTCMonth() + 1}/${dt.getUTCDate()}</div>`);
    add(`<div class="grid" style="left:${left}px;top:${HEAD_H}px;height:${BODY_BOTTOM - HEAD_H}px"></div>`);
  }

  // lane labels + separators
  for (const owner of OWNERS) {
    const top = laneTop[owner], h = laneRows[owner] * SUBROW_H;
    add(`<div class="lane-sep" style="top:${top}px;width:${TOTAL_W}px"></div>`);
    add(`<div class="lane-lbl" style="top:${top + h / 2 - 16}px">${owner}</div>`);
    add(`<div class="lane-cap" style="top:${top + h / 2 + 4}px">${vis.filter(m => m.owner === owner).length} milestones</div>`);
  }
  add(`<div class="lane-sep" style="top:${BODY_BOTTOM}px;width:${TOTAL_W}px"></div>`);

  // bars
  for (const m of vis) {
    const left = Math.max(x(m.startDay), ORIGIN_X);
    const w = Math.max(x(m.endDay) - left, 8);
    const clipped = x(m.startDay) < ORIGIN_X ? ' clipped' : '';
    const days = m.endDay - m.startDay; // duration estimate in calendar days (preserved by the cascade)
    add(`<div class="bar${clipped}" style="left:${left}px;top:${barY(m)}px;width:${w}px;height:${BAR_H}px;background:${BLUE}" title="${m.name} (${fromEpochDay(m.startDay)} → ${fromEpochDay(m.endDay)})">${m.name} (${days}d)</div>`);
  }

  // today line
  const t = todayEpochDay();
  if (t > viewStartDay && t < chartEndDay) {
    add(`<div class="today-line" style="left:${x(t)}px;top:${MONTH_H}px;height:${BODY_BOTTOM - MONTH_H}px"></div>`);
  }
}
```

- [ ] **Step 2: Commit** (visual verification happens in Task 11)

```bash
git add docs/src/timeline.js
git commit -m "$(printf 'feat: render the gantt timeline\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 10: `depgraph.js` — render the dependency diagram

**Files:**
- Create: `docs/src/depgraph.js`

No unit test (DOM rendering, verified in Task 11). Reuses the tested `computeLayers`.

- [ ] **Step 1: Write `docs/src/depgraph.js`**

```js
// docs/src/depgraph.js
import { computeLayers } from './layout.js';

const NS = 'http://www.w3.org/2000/svg';
const NODE_W = 172, NODE_H = 52, COL_W = 218, ROW_H = 84, PAD_X = 28, PAD_TOP = 24;

export function renderDepGraph(container, milestones) {
  container.innerHTML = '';
  const layer = computeLayers(milestones);

  const cols = {};
  milestones.forEach(m => { (cols[layer[m.id]] ||= []).push(m.id); });
  const numLayers = Math.max(...Object.keys(cols).map(Number)) + 1;
  const maxPer = Math.max(...Object.values(cols).map(a => a.length));

  const DAG_W = PAD_X * 2 + (numLayers - 1) * COL_W + NODE_W;
  const DAG_H = PAD_TOP * 2 + maxPer * ROW_H;
  const midY = DAG_H / 2;

  const pos = {};
  for (let L = 0; L < numLayers; L++) {
    const ids = cols[L] || [];
    ids.forEach((id, k) => {
      const cy = midY + (k - (ids.length - 1) / 2) * ROW_H;
      pos[id] = { left: PAD_X + L * COL_W, top: cy - NODE_H / 2, cy };
    });
  }

  container.style.width = DAG_W + 'px';
  container.style.height = DAG_H + 'px';

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', DAG_W);
  svg.setAttribute('height', DAG_H);
  svg.style.cssText = 'position:absolute;left:0;top:0;z-index:1';
  svg.innerHTML = '<defs><marker id="dah" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L6.5,3 L0,6 Z" fill="#64748b"/></marker></defs>';
  container.appendChild(svg);

  const byId = Object.fromEntries(milestones.map(m => [m.id, m]));
  for (const m of milestones) {
    for (const pid of m.deps) {
      const a = pos[pid], b = pos[m.id];
      const x1 = a.left + NODE_W, y1 = a.cy, x2 = b.left, y2 = b.cy, dx = (x2 - x1) * 0.45;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', '#64748b');
      path.setAttribute('stroke-width', '1.8');
      path.setAttribute('marker-end', 'url(#dah)');
      svg.appendChild(path);
    }
  }

  for (const m of milestones) {
    const p = pos[m.id];
    container.insertAdjacentHTML('beforeend',
      `<div class="node" style="left:${p.left}px;top:${p.top}px;width:${NODE_W}px;min-height:${NODE_H}px">
         <div class="nm">${m.name}</div><div class="ow">${m.owner}</div></div>`);
  }
}
```

- [ ] **Step 2: Commit** (visual verification in Task 11)

```bash
git add docs/src/depgraph.js
git commit -m "$(printf 'feat: render the milestone dependency diagram\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 11: `app.js` — wire everything + error surfacing, then verify in browser

**Files:**
- Create: `docs/src/app.js`

- [ ] **Step 1: Write `docs/src/app.js`**

```js
// docs/src/app.js
import { parsePlan } from './parse.js';
import { schedule } from './schedule.js';
import { renderTimeline } from './timeline.js';
import { renderDepGraph } from './depgraph.js';

async function main() {
  try {
    const res = await fetch('plan.md');
    if (!res.ok) throw new Error(`Could not load plan.md (HTTP ${res.status}).`);
    const text = await res.text();
    const { config, milestones } = parsePlan(text);
    const scheduled = schedule(milestones);
    renderTimeline(document.getElementById('chart'), scheduled, config);
    renderDepGraph(document.getElementById('dag'), milestones);
  } catch (e) {
    const el = document.getElementById('error');
    el.textContent = e.message;
    el.style.display = 'block';
    console.error(e);
  }
}

main();
```

- [ ] **Step 2: Serve `docs/` locally**

Run (leave running in a separate shell):
```bash
cd docs && python3 -m http.server 8000
```
Then open `http://localhost:8000/` in a browser. (Fetch requires HTTP — opening the file directly with `file://` will not work.)

- [ ] **Step 3: Verify the rendered page**

Confirm visually:
1. **Timeline** shows two lanes (Sunah, Meredith) with blue milestone bars on a month + week axis starting at May. Each bar label ends with its duration in parentheses, e.g. `Tech spec (42d)`.
2. *Tech spec* is **clipped** at the left edge (flat corner + accent stripe) because it started before May; *High-level requirements* (ends 4/10) is **absent** from the timeline.
3. Meredith's lane shows **two sub-rows** where *Catalogs Ingestion* and *Catalogs Integration* overlap.
4. A red **today line** appears at today's date (if today is within the May→July window).
5. **Dependency diagram** below shows 9 nodes in columns left→right, with curved prerequisite→dependent arrows, including the *High-level requirements* root.
6. No red error banner.

- [ ] **Step 4: Verify error handling**

Temporarily introduce a bad dependency: in `docs/plan.md`, change `rollout`'s `depends-on` to `depends-on: ghost`. Reload the page.
Expected: a red error banner reads `Milestone "rollout" depends on unknown id "ghost".` and the charts do not render.
Then **revert** the change (restore `depends-on: agent-ui, backfill`) and reload — banner gone, charts render.

- [ ] **Step 5: Commit**

```bash
git add docs/src/app.js
git commit -m "$(printf 'feat: wire fetch, parse, schedule, and rendering with error surfacing\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 12: Deploy to GitHub Pages

**Files:** none (repo settings + merge)

- [ ] **Step 1: Run the full test suite one last time**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 2: Push the branch and open a PR to `main`**

Run:
```bash
git push -u origin sunah-klaviyo/project-progress-tracker
gh pr create --base main --title "Product Understanding progress tracker" --body "$(printf 'Static GitHub Pages progress tracker: person-laned Gantt + milestone dependency diagram, driven by docs/plan.md.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)')"
```

- [ ] **Step 3: Merge the PR** (via the GitHub UI or `gh pr merge --squash`), so `main` contains `docs/`.

- [ ] **Step 4: Enable GitHub Pages from `/docs` on `main`**

Either in the GitHub UI (Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, Folder: `/docs`), or via CLI:
```bash
gh api -X POST repos/sunah-klaviyo/papaya/pages -f "source[branch]=main" -f "source[path]=/docs"
```
Expected: Pages build starts. The site publishes at **https://sunah-klaviyo.github.io/papaya/** within a minute or two.

- [ ] **Step 5: Verify the live site**

Open `https://sunah-klaviyo.github.io/papaya/` and confirm both views render (same checklist as Task 11, Step 3). Share the URL with stakeholders.

---

## Self-Review

**Spec coverage:**
- Two views (timeline + dependency diagram) → Tasks 9, 10. ✓
- Hand-maintained `plan.md`, fetched/parsed in browser, no runtime Linear API → Tasks 3, 7, 11. ✓
- Data model (id, name, owner, start, end, deps; no progress) → Task 3. ✓
- Cascade scheduler (effective dates, push-right, preserve duration, no left-pull) → Task 5. ✓
- Timeline: dual month/week axis, person lanes, sub-row packing, May window + clipping, today line, all-blue bars, no arrows → Tasks 6, 9. ✓
- Dependency diagram: all milestones, depth layering, curved prereq→dependent arrows → Tasks 6, 10. ✓
- Validation surfaced on page (unknown dep, dup id, cycle, end<start) → Tasks 4, 11. ✓
- Zero-build static stack; pure logic tested with `node --test` → Tasks 1–6. ✓
- Deploy to `https://sunah-klaviyo.github.io/papaya/` from `/docs` → Task 12. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step has complete code. ✓

**Type consistency:** `parsePlan` → `{config:{viewStart}, milestones[]}`; `schedule` adds `startDay`/`endDay`; `packSubRows` returns `{row, rowCount}`; `computeLayers` returns `{id: layer}`; renderers consume those exact shapes. Names match across tasks. ✓
