import { createClient } from 'redis';
import { EventProcessor, type Log, logJson } from './processor.js';

export class EventSubscriber {
  private readonly client;
  private subscribed = false;
  private connected = false;
  constructor(url: string, private readonly channel: string, private readonly processor: EventProcessor,
    private readonly log: Log = logJson) {
    this.client = createClient({
      url, disableOfflineQueue: true, commandsQueueMaxLength: 16,
      socket: { connectTimeout: 1000, reconnectStrategy: retries => Math.min(500 * 2 ** Math.min(retries, 4), 5000) },
    });
    this.client.on('error', () => { this.connected = false; this.log({ type: 'subscriber_unavailable' }); });
    this.client.on('reconnecting', () => { this.connected = false; });
    this.client.on('end', () => { this.connected = false; });
    // node-redis restores active subscriptions before emitting ready on reconnect.
    this.client.on('ready', () => { this.connected = true; });
  }
  get ready(): boolean { return this.connected && this.subscribed && this.client.isReady; }
  async start(): Promise<void> {
    await this.client.connect();
    await this.client.subscribe(this.channel, message => this.processor.consume(message));
    this.subscribed = true;
    this.log({ type: 'subscriber_ready' });
  }
  close(): void {
    this.subscribed = false;
    this.connected = false;
    if (this.client.isOpen) this.client.destroy();
  }
}
