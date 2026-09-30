import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zonedDayBounds, zonedRangeBounds } from './timezone';

test('Sydney civil day starts at 14:00 UTC the previous evening during AEST', () => {
  const { start, end } = zonedDayBounds('2026-09-30', 'Australia/Sydney');

  assert.equal(start.toISOString(), '2026-09-29T14:00:00.000Z');
  assert.equal(end.toISOString(), '2026-09-30T13:59:59.999Z');

  const juanJose = new Date('2026-09-29T15:12:00.000Z');
  const emerson = new Date('2026-09-29T21:46:00.000Z');
  assert.ok(juanJose >= start && juanJose <= end);
  assert.ok(emerson >= start && emerson <= end);

  const utcMidnight = new Date('2026-09-30T00:00:00.000Z');
  assert.ok(juanJose < utcMidnight);
  assert.ok(emerson < utcMidnight);
});

test('a Sydney date range covers early-morning punches on the first day', () => {
  const { start, end } = zonedRangeBounds('2026-09-28', '2026-10-04', 'Australia/Sydney');
  const early = new Date('2026-09-27T15:12:00.000Z');
  assert.equal(start.toISOString(), '2026-09-27T14:00:00.000Z');
  assert.ok(early >= start && early <= end);
  assert.equal(end.toISOString(), '2026-10-04T12:59:59.999Z');
});

test('Sydney civil day shortens by one hour on the spring-forward date', () => {
  const { start, end } = zonedDayBounds('2026-10-04', 'Australia/Sydney');

  assert.equal(start.toISOString(), '2026-10-03T14:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-04T12:59:59.999Z');
});
