import type { Clock } from './ports.ts';

/** In memory, fixed window: a restart resets it, which is fine for a single small server. */
export class RateLimiter {
  readonly #windows = new Map<string, { count: number; resetAt: number }>();
  readonly #clock: Clock;
  readonly #max: number;
  readonly #windowMs: number;

  constructor(clock: Clock, max: number, windowMs: number) {
    this.#clock = clock;
    this.#max = max;
    this.#windowMs = windowMs;
  }

  allow(key: string): boolean {
    const now = this.#clock.now();
    for (const [k, window] of this.#windows) if (window.resetAt <= now) this.#windows.delete(k);

    const window = this.#windows.get(key);
    if (!window) {
      this.#windows.set(key, { count: 1, resetAt: now + this.#windowMs });
      return true;
    }
    window.count++;
    return window.count <= this.#max;
  }
}
