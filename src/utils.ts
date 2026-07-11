// src/utils.ts
/**
 * Common utility functions for PredictaBot agents.
 */

/**
 * Round identifier generator – simple incremental counter stored in memory.
 * In production this would be persisted (e.g., on-chain state or DB).
 */
let roundCounter = 0;
export function nextRoundId(): string {
  roundCounter += 1;
  return `round-${Date.now()}-${roundCounter}`;
}

/**
 * Rounds a number to a given number of decimal places.
 */
export function roundTo(value: number, decimals: number = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Computes absolute distance between two numeric predictions.
 */
export function distance(a: number, b: number): number {
  return Math.abs(a - b);
}

/**
 * Simple exponential back‑off retry for async functions.
 */
export async function retryAsync<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries) throw e;
      await new Promise((res) => setTimeout(res, delayMs * 2 ** attempt));
      attempt += 1;
    }
  }
}

/**
 * Simple deterministic placeholder predictor – can be replaced with ML model.
 * For demo purposes it returns a random value within a plausible range.
 */
export function placeholderPredict(metric: string, range: [number, number]): number {
  const [min, max] = range;
  const value = Math.random() * (max - min) + min;
  return roundTo(value, 2);
}
