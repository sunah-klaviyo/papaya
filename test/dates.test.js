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
