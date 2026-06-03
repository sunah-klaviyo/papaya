// test/schedule.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedule } from '../docs/src/schedule.js';
import { toEpochDay as ep } from '../docs/src/dates.js';

// a milestone with sensible defaults (owner Sunah); override as needed
const M = over => ({ id: 'x', name: 'x', owner: 'Sunah', start: '2026-05-04', end: '2026-05-08', days: null, deps: [], ...over });
const byId = arr => Object.fromEntries(arr.map(x => [x.id, x]));

test('a no-deps milestone starts on its declared (weekday) start', () => {
  // Mon 5/4 .. Fri 5/8 = 5 working days
  const out = byId(schedule([M({ id: 'a', start: '2026-05-04', end: '2026-05-08' })]));
  assert.equal(out.a.startDay, ep('2026-05-04'));
  assert.equal(out.a.endDay, ep('2026-05-08'));
});

test('uses the explicit days estimate to compute the end in working days', () => {
  // days:3 from Mon 5/4 -> Wed 5/6
  const out = byId(schedule([M({ id: 'a', start: '2026-05-04', days: 3 })]));
  assert.equal(out.a.endDay, ep('2026-05-06'));
});

test('weekends never count as working days', () => {
  // Fri 5/8 + 2 working days -> Fri(1), Mon 5/11(2)
  const out = byId(schedule([M({ id: 'a', start: '2026-05-08', days: 2 })]));
  assert.equal(out.a.endDay, ep('2026-05-11'));
});

test('a dependent starts when its prerequisite ends and keeps its working length', () => {
  const out = byId(schedule([
    M({ id: 'a', start: '2026-05-04', end: '2026-05-15' }),         // ends Fri 5/15
    M({ id: 'b', start: '2026-05-04', days: 3, deps: ['a'] }),
  ]));
  assert.equal(out.b.startDay, ep('2026-05-15'));
  assert.equal(out.b.endDay, ep('2026-05-19'));                     // 5/15, 5/18, 5/19
});

test('a declared start later than its dependency is NOT pulled left', () => {
  const out = byId(schedule([
    M({ id: 'a', start: '2026-05-04', end: '2026-05-06' }),
    M({ id: 'b', start: '2026-06-01', days: 3, deps: ['a'] }),
  ]));
  assert.equal(out.b.startDay, ep('2026-06-01'));
});

test('fan-in waits for the latest prerequisite', () => {
  const out = byId(schedule([
    M({ id: 'a', start: '2026-05-04', end: '2026-05-06' }),
    M({ id: 'b', start: '2026-05-04', end: '2026-05-15' }),
    M({ id: 'c', start: '2026-05-04', days: 2, deps: ['a', 'b'] }),
  ]));
  assert.equal(out.c.startDay, ep('2026-05-15'));                   // latest dep end
  assert.equal(out.c.endDay, ep('2026-05-18'));                     // 5/15, 5/18
});

test('PTO inside a task window pushes its end out one working day per PTO day', () => {
  const base = byId(schedule([M({ id: 'a', start: '2026-05-04', days: 5 })]));
  assert.equal(base.a.endDay, ep('2026-05-08'));                    // Mon..Fri, no PTO
  const withPto = byId(schedule(
    [M({ id: 'a', owner: 'Sunah', start: '2026-05-04', days: 5 })],
    [{ person: 'Sunah', date: '2026-05-06' }],                      // Wed off
  ));
  assert.equal(withPto.a.endDay, ep('2026-05-11'));                 // skips 5/6 -> ends Mon 5/11
});

test('PTO only affects the owner of the task', () => {
  const out = byId(schedule(
    [M({ id: 'a', owner: 'Sunah', start: '2026-05-04', days: 5 })],
    [{ person: 'Meredith', date: '2026-05-06' }],
  ));
  assert.equal(out.a.endDay, ep('2026-05-08'));                     // Meredith's PTO irrelevant
});

test('PTO extension cascades to dependents', () => {
  const out = byId(schedule(
    [
      M({ id: 'a', owner: 'Sunah', start: '2026-05-04', days: 5 }), // -> 5/11 with PTO
      M({ id: 'b', owner: 'Sunah', start: '2026-05-04', days: 2, deps: ['a'] }),
    ],
    [{ person: 'Sunah', date: '2026-05-06' }],
  ));
  assert.equal(out.a.endDay, ep('2026-05-11'));
  assert.equal(out.b.startDay, ep('2026-05-11'));                   // starts at a's pushed end
  assert.equal(out.b.endDay, ep('2026-05-12'));                     // 5/11, 5/12
});
