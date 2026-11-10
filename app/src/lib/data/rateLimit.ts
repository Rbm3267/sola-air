/**
 * A sliding-window limiter keyed by caller (the visitor's address).
 *
 * It lives in the memory of one running server instance. On Vercel, instances
 * come and go and run side by side, so the count a visitor sees can restart and
 * is not shared. It is a brake on casual and accidental use, not a hard cap. A
 * hard cap needs a store every instance shares.
 */
export interface Limiter {
  /** Records a hit. Returns 0 when allowed, or the seconds until the caller may try again. */
  hit(key: string, now?: number): number;
  /** Drops entries that have aged out. */
  sweep(now?: number): void;
  readonly size: number;
}

export function createLimiter(opts: { windowMs: number; max: number; maxKeys?: number }): Limiter {
  const { windowMs, max } = opts;
  const maxKeys = opts.maxKeys ?? 5000;
  const hits = new Map<string, number[]>();

  function sweep(now = Date.now()) {
    for (const [key, times] of hits) {
      const live = times.filter((t) => now - t < windowMs);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }

  return {
    hit(key, now = Date.now()) {
      const live = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (live.length >= max) {
        hits.set(key, live);
        // The oldest hit in the window leaves it first.
        return Math.max(1, Math.ceil((live[0] + windowMs - now) / 1000));
      }
      live.push(now);
      hits.delete(key); // re-insert so the Map stays in order of most recent use
      hits.set(key, live);
      // Bound memory: a flood of different addresses cannot grow the Map forever.
      if (hits.size > maxKeys) {
        sweep(now);
        while (hits.size > maxKeys) {
          const oldest = hits.keys().next().value;
          if (oldest === undefined) break;
          hits.delete(oldest);
        }
      }
      return 0;
    },
    sweep,
    get size() {
      return hits.size;
    }
  };
}

export const MINUTE_LIMIT = 15;
export const DAY_LIMIT = 40;
