// Central event bus interface and in-memory implementation for VORTEX
import { EventEnvelope } from './eventEnvelope';

type EventHandler<T> = (event: EventEnvelope<T>) => void | Promise<void>;

interface Subscription {
  topic: string;
  handler: EventHandler<any>;
  isObserver: boolean;
}

export class EventBus {
  private subs: Subscription[] = [];
  
  publish<T>(topic: string, envelope: EventEnvelope<T>): void {
    for (const sub of this.subs) {
      if (sub.topic === topic) {
        try {
          sub.handler(envelope);
        } catch (e) {
          // Hooks for error/metrics
          // TODO: Log/report error centrally
        }
      }
    }
  }

  subscribe<T>(topic: string, handler: EventHandler<T>, isObserver=false): () => void {
    const sub: Subscription = { topic, handler, isObserver };
    this.subs.push(sub);
    return () => {
      const idx = this.subs.indexOf(sub);
      if (idx >= 0) this.subs.splice(idx, 1);
    };
  }

  // Optional: subscribeAll for observers
  subscribeAll<T>(handler: EventHandler<T>): () => void {
    const sub: Subscription = { topic: '*', handler, isObserver: true };
    this.subs.push(sub);
    return () => {
      const idx = this.subs.indexOf(sub);
      if (idx >= 0) this.subs.splice(idx, 1);
    };
  }
}
