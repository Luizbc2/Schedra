import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseClientEvent } from '../dist/contract.js';
import { readConfig } from '../dist/config.js';
import { SqliteActivityStore } from '../dist/store.js';
import { EventProcessor } from '../dist/processor.js';
import { operationalServer } from '../dist/server.js';

const fixture = () => ({
  eventId: randomUUID(), version: 1, type: 'client.created', scope: 'org:1',
  entityId: 1, occurredAt: '2026-11-09T12:00:00.000Z', requestId: 'test-request',
});
const token = 'test_operational_token_at_least_32_characters';
const serve = async (store, processor, ready) => {
  const server = operationalServer(store, processor, ready, token);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  return { origin, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
};

test('contrato v1 aceita os exemplos canonicos compartilhados sem importar a API', () => {
  const examples = JSON.parse(readFileSync(new URL('../../contracts/client-event.v1.examples.json', import.meta.url)));
  for (const example of examples) assert.deepEqual(parseClientEvent(JSON.stringify(example)), example);
});
test('recusa envelope incompleto, malformado, grande, PII extra e tipos perigosos', () => {
  const valid = fixture();
  for (const value of [
    null, [], {}, { ...valid, version: 2 }, { ...valid, entityId: '1' },
    { ...valid, entityId: Number.MAX_SAFE_INTEGER + 1 }, { ...valid, eventId: '-'.repeat(36) },
    { ...valid, type: 'unknown' }, { ...valid, scope: 'org:0' },
    { ...valid, occurredAt: '2026-11-09' }, { ...valid, occurredAt: 'invalid' },
    { ...valid, occurredAt: '2026-02-30T12:00:00.000Z' },
    { ...valid, requestId: 'x\nprivate' }, { ...valid, requestId: '' },
    { ...valid, name: 'private-name' }, { ...valid, cpf: 'private-cpf' },
  ]) assert.equal(parseClientEvent(JSON.stringify(value)), null);
  assert.equal(parseClientEvent('broken'), null);
  assert.equal(parseClientEvent(' '.repeat(4097)), null);
});
test('configuracao exige Redis e token proprio sem expor credenciais nos erros', () => {
  const env = { REDIS_URL: 'redis://user:private-password@localhost:6379', EVENTS_METRICS_TOKEN: token };
  assert.equal(readConfig(env).retentionDays, 30);
  for (const bad of [
    { ...env, REDIS_URL: 'https://localhost' }, { ...env, PORT: '0' },
    { ...env, EVENTS_RETENTION_DAYS: '0' }, { ...env, EVENTS_METRICS_TOKEN: 'weak' },
    { ...env, EVENTS_CHANNEL: 'channel\n' }, {},
  ]) assert.throws(() => readConfig(bad), error => !error.message.includes('private-password'));
});
test('SQLite persiste registro e projecao; duplicata e conflito nao incrementam contagem', () => {
  const directory = mkdtempSync(join(tmpdir(), 'schedra-events-'));
  const path = join(directory, 'activity.sqlite');
  const event = fixture();
  let store = new SqliteActivityStore(path, 30);
  try {
    assert.equal(store.record(event), 'processed');
    assert.equal(store.record(event), 'duplicate');
    assert.equal(store.record({ ...event, entityId: 2 }), 'conflict');
    assert.deepEqual(store.summary(), [{ type: 'client.created', count: 1 }]);
    store.close();
    store = new SqliteActivityStore(path, 30);
    assert.equal(store.ping(), true);
    assert.equal(store.record(event), 'duplicate');
    assert.deepEqual(store.summary(), [{ type: 'client.created', count: 1 }]);
  } finally { store.close(); rmSync(directory, { recursive: true, force: true }); }
});
test('retencao limita recibos, mas total agregado persiste e dedupe nao e eterno', () => {
  let now = Date.parse('2026-11-09T12:00:00Z');
  const store = new SqliteActivityStore(':memory:', 1, () => now);
  try {
    const event = fixture();
    store.record(event);
    now += 2 * 86_400_000;
    assert.equal(store.record(event), 'processed');
    assert.deepEqual(store.summary(), [{ type: 'client.created', count: 2 }]);
  } finally { store.close(); }
});
test('processador registra somente metadados validados e erro de persistencia nao conta como consumo', () => {
  const records = [];
  const event = fixture();
  const store = new SqliteActivityStore(':memory:', 30);
  try {
    const processor = new EventProcessor(store, record => records.push(record));
    processor.consume(JSON.stringify(event));
    processor.consume(JSON.stringify(event));
    processor.consume(JSON.stringify({ ...event, email: 'private-email' }));
    assert.equal(records[0].type, 'event_consumed');
    assert.equal(records[1].type, 'event_duplicate');
    assert.ok(!JSON.stringify(records).includes('private-email'));
    assert.match(processor.metrics(), /outcome="processed"} 1/);
    const failing = new EventProcessor({ ...store, record() { throw new Error('secret-path'); } },
      record => records.push(record));
    failing.consume(JSON.stringify(event));
    assert.equal(failing.storageReady, false);
    assert.match(failing.metrics(), /outcome="failed"} 1/);
    assert.ok(!JSON.stringify(records).includes('secret-path'));
    assert.equal(records.at(-1).type, 'event_processing_failed');
  } finally { store.close(); }
});
test('health independente; readiness representa assinante; activity e metricas exigem token', async () => {
  const store = new SqliteActivityStore(':memory:', 30);
  const processor = new EventProcessor(store, () => {});
  let ready = false;
  const app = await serve(store, processor, () => ready);
  try {
    assert.equal((await fetch(app.origin + '/health')).status, 200);
    const spec = await (await fetch(app.origin + '/openapi.json')).json();
    assert.equal(spec.openapi, '3.1.0');
    assert.ok(spec.paths['/activity'].get.security);
    assert.equal((await fetch(app.origin + '/ready')).status, 503);
    ready = true;
    assert.equal((await fetch(app.origin + '/ready')).status, 200);
    for (const path of ['/activity', '/metrics']) {
      assert.equal((await fetch(app.origin + path)).status, 401);
      assert.equal((await fetch(app.origin + path, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
      assert.equal((await fetch(app.origin + path, { headers: { Authorization: 'Bearer ' + token } })).status, 200);
    }
    assert.equal((await fetch(app.origin + '/activity', { method: 'POST' })).status, 405);
    assert.equal((await fetch(app.origin + '/unknown')).status, 404);
    processor.storageReady = false;
    assert.equal((await fetch(app.origin + '/ready')).status, 503);
  } finally { await app.close(); store.close(); }
});
