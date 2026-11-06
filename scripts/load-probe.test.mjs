import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProbe, summarize } from './load-probe.mjs';

test('p95 usa nearest rank e erros nao sao descartados', () => {
  const samples = Array.from({ length: 100 }, (_, i) => ({ durationMs: i + 1, status: i ? 200 : 500 }));
  assert.deepEqual(summarize(samples), { requests: 100, errors: 1, p95Ms: 95, maxMs: 100 });
});
test('limita concorrencia e executa cada operacao uma unica vez', async () => {
  let active = 0;
  let max = 0;
  const calls = new Set();
  const result = await loadProbe(async index => {
    active++;
    max = Math.max(max, active);
    calls.add(index);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    return 200;
  }, 15, 3);
  assert.equal(max, 3);
  assert.equal(calls.size, 15);
  assert.equal(result.errors, 0);
  assert.equal(result.requests, 15);
});
test('entrada invalida e falha de transporte falham o ensaio', async () => {
  await assert.rejects(loadProbe(async () => 200, 0, 1));
  await assert.rejects(loadProbe(async () => { throw new Error('timeout'); }, 1, 1), /timeout/);
});
