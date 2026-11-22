import { randomInt } from 'node:crypto';

export class Draw {
  /**
   * Giver id → receiver id: nobody draws themself nor someone they are excluded with, both ways. `null` when no such
   * assignment exists. Random permutations are drawn until a valid one comes up, so every valid assignment is equally
   * likely; a bipartite matching first proves one exists, and is the fallback when the rules leave very few.
   */
  static assign(ids: number[], excludedPairs: [number, number][]): Map<number, number> | null {
    const excluded = new Set(excludedPairs.map(([a, b]) => Draw.#pairKey(a, b)));
    const allowed = (giver: number, receiver: number) =>
      giver !== receiver && !excluded.has(Draw.#pairKey(giver, receiver));

    const matching = Draw.#matching(Draw.#shuffle(ids), (giver) =>
      Draw.#shuffle(ids.filter((receiver) => allowed(giver, receiver))),
    );
    if (!matching) return null;

    for (let attempt = 0; attempt < 10_000; attempt++) {
      const receivers = Draw.#shuffle(ids);
      if (ids.every((giver, index) => allowed(giver, receivers[index]!))) {
        return new Map(ids.map((giver, index) => [giver, receivers[index]!]));
      }
    }
    return matching;
  }

  /** Kuhn's augmenting paths: a receiver for every giver, or `null` when that is impossible. */
  static #matching(givers: number[], candidates: (giver: number) => number[]): Map<number, number> | null {
    const giverOf = new Map<number, number>();
    const assign = (giver: number, seen: Set<number>): boolean => {
      for (const receiver of candidates(giver)) {
        if (seen.has(receiver)) continue;
        seen.add(receiver);
        const current = giverOf.get(receiver);
        if (current === undefined || assign(current, seen)) {
          giverOf.set(receiver, giver);
          return true;
        }
      }
      return false;
    };
    if (!givers.every((giver) => assign(giver, new Set()))) return null;
    return new Map([...giverOf].map(([receiver, giver]) => [giver, receiver]));
  }

  static #shuffle(values: number[]): number[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = randomInt(index + 1);
      [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
    }
    return shuffled;
  }

  static #pairKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }
}
