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
