import { expect, test } from 'bun:test';

import { RateLimiter } from './rate-limiter.ts';

test('a full limiter forgets its oldest key rather than refusing new ones', () => {
  const limiter = new RateLimiter({ now: () => 0 }, 1, 60_000);
  limiter.hit('oldest');
  for (let index = 1; index < 10_000; index++) limiter.hit(`key-${index}`);

  expect(limiter.hit('newcomer')).toBe(true);
  expect(limiter.blocked('newcomer')).toBe(true);
  expect(limiter.blocked('oldest')).toBe(false);
  expect(limiter.blocked('key-1')).toBe(true);
});

test('a flood of other keys never evicts a pinned key, so its limit holds', () => {
  const limiter = new RateLimiter({ now: () => 0 }, 1, 60_000, (key) => key === 'admin@example.com');
  limiter.hit('admin@example.com');

  for (let index = 0; index < 20_000; index++) limiter.hit(`flood-${index}@example.com`);

  expect(limiter.hit('admin@example.com')).toBe(false);
});
