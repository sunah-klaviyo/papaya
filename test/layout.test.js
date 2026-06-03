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
