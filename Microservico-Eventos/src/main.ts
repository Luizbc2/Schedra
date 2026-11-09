import { readConfig } from './config.js';
import { SqliteActivityStore } from './store.js';
import { EventProcessor, logJson } from './processor.js';
import { EventSubscriber } from './subscriber.js';
import { operationalServer } from './server.js';

function main(): void {
  const config = readConfig(process.env);
  const store = new SqliteActivityStore(config.databasePath, config.retentionDays);
  const processor = new EventProcessor(store);
  const subscriber = new EventSubscriber(config.redisUrl, config.channel, processor);
  const server = operationalServer(store, processor, () => subscriber.ready, config.metricsToken);
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    subscriber.close();
    const timeout = setTimeout(() => server.closeAllConnections(), 2000);
    timeout.unref();
    server.close(() => { clearTimeout(timeout); store.close(); });
  };
  server.on('error', () => { logJson({ type: 'http_server_failed' }); shutdown(); process.exitCode = 1; });
  server.listen(config.port, '0.0.0.0', () => logJson({ type: 'service_started' }));
  void subscriber.start().catch(() => {
    if (!closing) { logJson({ type: 'subscriber_start_failed' }); shutdown(); process.exitCode = 1; }
  });
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
try { main(); } catch { logJson({ type: 'service_start_failed' }); process.exitCode = 1; }
