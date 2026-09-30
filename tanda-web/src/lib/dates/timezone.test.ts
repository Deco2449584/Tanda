import assert from 'node:assert/strict';
import { test } from 'node:test';
import { zonedDayBounds } from './timezone';

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

test('Sydney civil day shortens by one hour on the spring-forward date', () => {
  const { start, end } = zonedDayBounds('2026-10-04', 'Australia/Sydney');

  assert.equal(start.toISOString(), '2026-10-03T14:00:00.000Z');
  assert.equal(end.toISOString(), '2026-10-04T12:59:59.999Z');
});
