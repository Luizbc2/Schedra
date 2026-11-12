import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { EventSubscriber } from '../dist/subscriber.js';
import { EventProcessor } from '../dist/processor.js';
import { SqliteActivityStore } from '../dist/store.js';
const url = process.env.TEST_REDIS_URL;
if (url && !/\/(1[0-5])$/.test(new URL(url).pathname)) throw new Error('Use isolated Redis DB 10-15');
const waitFor = async condition => {
  const deadline = Date.now() + 3000;
  while (!condition()) {
    if (Date.now() > deadline) throw new Error('Event processing timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};
test('Redis real: consumo idempotente, invalidacao de envelope e consumidor independente', { skip: !url }, async () => {
  const channel = 'schedra-service-test:' + randomUUID();
  const publisher = createClient({ url, socket: { reconnectStrategy: false, connectTimeout: 1000 } });
  publisher.on('error', () => {});
  const store = new SqliteActivityStore(':memory:', 30);
  const log = [];
  const processor = new EventProcessor(store, record => log.push(record));
  let subscriber = new EventSubscriber(url, channel, processor, () => {});
  const event = { eventId: randomUUID(), version: 1, type: 'client.created', scope: 'org:1',
    entityId: 1, occurredAt: new Date().toISOString(), requestId: 'redis-test' };
  try {
    await publisher.connect();
    await subscriber.start();
    assert.equal(subscriber.ready, true);
    await publisher.publish(channel, JSON.stringify(event));
    await publisher.publish(channel, JSON.stringify(event));
    await publisher.publish(channel, JSON.stringify({ ...event, version: 99 }));
    await waitFor(() => log.length === 3);
    assert.deepEqual(store.summary(), [{ type: 'client.created', count: 1 }]);
    assert.equal(log[0].eventId, event.eventId);
    assert.equal(log[1].type, 'event_duplicate');
    assert.equal(log[2].type, 'event_invalid');
    subscriber.close();
    assert.equal(subscriber.ready, false);
    await waitFor(() => publisher.isReady);
    const second = { ...event, eventId: randomUUID(), type: 'client.updated' };
    // Allow Redis to observe the socket close; no replay is expected.
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(await publisher.publish(channel, JSON.stringify(second)), 0);
    subscriber = new EventSubscriber(url, channel, processor, () => {});
    await subscriber.start();
    assert.deepEqual(store.summary(), [{ type: 'client.created', count: 1 }]);
    await publisher.publish(channel, JSON.stringify({ ...second, eventId: randomUUID() }));
    await waitFor(() => store.summary().length === 2);
  } finally {
    subscriber.close();
    if (publisher.isOpen) publisher.destroy();
    store.close();
  }
});
