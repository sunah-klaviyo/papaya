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
