// Observer and read-only hook typings for the VORTEX event bus

// All observer (audit, logging, metrics) handlers must be pure and side-effect free.
export type ObserverHandler<T> = (event: import('./eventEnvelope').EventEnvelope<T>) => void | Promise<void>;

export interface ObserverSubscription {
  unsubscribe: () => void;
  topic: string;
}
