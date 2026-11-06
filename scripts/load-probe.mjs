import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

export function summarize(samples) {
  assert.ok(samples.length > 0);
  const sorted = samples.map(sample => sample.durationMs).sort((a, b) => a - b);
  return {
    requests: samples.length,
    errors: samples.filter(sample => sample.status < 200 || sample.status >= 300).length,
    p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)),
    maxMs: Number(sorted.at(-1).toFixed(2)),
  };
}

export async function loadProbe(operation, requests, concurrency) {
  assert.ok(Number.isInteger(requests) && requests > 0);
  assert.ok(Number.isInteger(concurrency) && concurrency > 0 && concurrency <= requests);
  const samples = [];
  let next = 0;
  const begin = performance.now();
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < requests) {
      const index = next++;
      const started = performance.now();
      const status = await operation(index);
      samples.push({ status, durationMs: performance.now() - started });
    }
  }));
  return { ...summarize(samples), concurrency, elapsedMs: Number((performance.now() - begin).toFixed(2)) };
}
