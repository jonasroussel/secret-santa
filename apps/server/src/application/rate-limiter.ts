import type { Clock } from './ports.ts';

/** Keys are attacker-chosen (emails, addresses): past this, the oldest entry makes room, so memory stays bounded. */
const MAX_KEYS = 10_000;
const NOTHING_PINNED = () => false;

/**
 * In memory, fixed window: a restart resets it, which is fine for a single small server. Windows all last the same
 * time and a key starting a new window is inserted again, so the map stays ordered by expiry: purging stops at the
 * first live window and eviction takes the oldest.
 */
export class RateLimiter {
  readonly #windows = new Map<string, { count: number; resetAt: number }>();
  readonly #clock: Clock;
  readonly #max: number;
  readonly #windowMs: number;
  readonly #pinned: (key: string) => boolean;

  /** `pinned` keys (the admins) are never evicted, so a flood of other keys cannot reset their limits. */
  constructor(clock: Clock, max: number, windowMs: number, pinned: (key: string) => boolean = NOTHING_PINNED) {
    this.#clock = clock;
    this.#max = max;
    this.#windowMs = windowMs;
    this.#pinned = pinned;
  }

  /** Counts one more hit; `false` when the key is over its limit. */
  hit(key: string): boolean {
    const now = this.#purge();
    const window = this.#windows.get(key);
    if (window) return ++window.count <= this.#max;
    // Evicting rather than refusing: a flood of keys must not lock everyone else out.
    if (this.#windows.size >= MAX_KEYS) this.#evictOldest();
    this.#windows.set(key, { count: 1, resetAt: now + this.#windowMs });
    return true;
  }

  /** Whether the key has used up its limit, without counting a hit. */
  blocked(key: string): boolean {
    this.#purge();
    return (this.#windows.get(key)?.count ?? 0) >= this.#max;
  }

  #evictOldest(): void {
    for (const key of this.#windows.keys()) {
      if (!this.#pinned(key)) {
        this.#windows.delete(key);
        return;
      }
    }
  }

  /** Drops the expired windows, oldest first, and returns the current time. */
  #purge(): number {
    const now = this.#clock.now();
    for (const [key, window] of this.#windows) {
      if (window.resetAt > now) break;
      this.#windows.delete(key);
    }
    return now;
  }
}
