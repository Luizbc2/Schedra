import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import type { ActivityStore } from './store.js';
import type { EventProcessor } from './processor.js';
import { openapi } from './openapi.js';

export function operationalServer(store: ActivityStore, processor: EventProcessor,
  subscriberReady: () => boolean, token: string) {
  const expected = Buffer.from('Bearer ' + token);
  return createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (status: number, data: unknown) => {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(data));
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      json(405, { message: 'Method not allowed' }); return;
    }
    try {
      const path = new URL(request.url || '/', 'http://events').pathname;
      if (path === '/openapi.json') { json(200, openapi); return; }
      if (path === '/health') {
        json(200, { service: 'event-activity', status: 'alive', release: process.env.SCHEDRA_RELEASE || 'development' });
        return;
      }
      if (path === '/ready') {
        const ready = subscriberReady() && processor.storageReady && store.ping();
        json(ready ? 200 : 503, { status: ready ? 'ready' : 'unavailable' }); return;
      }
      if (!['/metrics', '/activity'].includes(path)) { json(404, { message: 'Not found' }); return; }
      const provided = Buffer.from(request.headers.authorization || '');
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
        json(401, { message: 'Invalid operational token' }); return;
      }
      if (path === '/activity') { json(200, { items: store.summary() }); return; }
      response.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
      response.end(processor.metrics()
        + '# TYPE schedra_event_subscriber_ready gauge\n'
        + `schedra_event_subscriber_ready ${subscriberReady() ? 1 : 0}\n`);
    } catch { json(503, { message: 'Activity storage unavailable' }); }
  });
}
