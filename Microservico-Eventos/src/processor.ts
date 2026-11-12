import { parseClientEvent } from './contract.js';
import type { ActivityStore } from './store.js';

export type Log = (record: Record<string, string | number | boolean>) => void;
export const logJson: Log = record => console.log(JSON.stringify({ service: 'event-activity', ...record }));
const outcomes = ['processed', 'duplicate', 'conflict', 'invalid', 'failed'] as const;
export class EventProcessor {
  private readonly counters = new Map<typeof outcomes[number], number>();
  storageReady = true;
  constructor(private readonly store: ActivityStore, private readonly log: Log = logJson) {}

  consume(message: string): void {
    const event = parseClientEvent(message);
    if (!event) { this.count('invalid'); this.log({ type: 'event_invalid' }); return; }
    try {
      const outcome = this.store.record(event);
      this.storageReady = true;
      this.count(outcome);
      this.log({ type: outcome === 'processed' ? 'event_consumed' : 'event_' + outcome,
        eventId: event.eventId, eventType: event.type, requestId: event.requestId });
    } catch {
      this.storageReady = false;
      this.count('failed');
      this.log({ type: 'event_processing_failed', eventId: event.eventId });
    }
  }

  private count(outcome: typeof outcomes[number]): void {
    this.counters.set(outcome, (this.counters.get(outcome) || 0) + 1);
  }
  metrics(): string {
    return '# HELP schedra_event_messages_total Received event outcomes in this process.\n'
      + '# TYPE schedra_event_messages_total counter\n'
      + outcomes.map(outcome => `schedra_event_messages_total{outcome="${outcome}"} ${this.counters.get(outcome) || 0}`).join('\n') + '\n';
  }
}
