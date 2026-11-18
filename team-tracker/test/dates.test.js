import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, isIsoDate, isoWeekday, nextWorkday, todayIn } from '../src/dates.js';

test('isIsoDate accepts real dates only', () => {
  assert.equal(isIsoDate('2026-11-18'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('18-11-2026'), false);
  assert.equal(isIsoDate(20261118), false);
});

test('todayIn uses the configured time zone', () => {
  // 20:00 UTC on 18 Nov is already 19 Nov in India
  assert.equal(todayIn('Asia/Kolkata', new Date('2026-11-18T20:00:00Z')), '2026-11-19');
  assert.equal(todayIn('UTC', new Date('2026-11-18T20:00:00Z')), '2026-11-18');
});

test('nextWorkday skips days off', () => {
  assert.equal(isoWeekday('2026-11-21'), 6); // Saturday
  assert.equal(nextWorkday('2026-11-20', [1, 2, 3, 4, 5]), '2026-11-23');
  assert.equal(nextWorkday('2026-11-21', [1, 2, 3, 4, 5, 6]), '2026-11-23');
  assert.equal(nextWorkday('2026-11-18', [1, 2, 3, 4, 5]), '2026-11-19');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});
