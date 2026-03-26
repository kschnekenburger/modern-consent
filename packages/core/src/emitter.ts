import type { ConsentState } from './state';

export type ConsentEventMap = {
  'consent:update': { vendor: string; status: 'granted' | 'denied'; gcm?: Record<string, boolean> };
  'consent:saved': {
    consentId: string;
    timestamp: number;
    version?: string;
    consent: ConsentState;
  };
};

type Listener<T> = (data: T) => void;

class ConsentEmitter {
  private listeners = new Map<string, Set<Listener<any>>>();

  on<K extends keyof ConsentEventMap>(
    event: K,
    cb: Listener<ConsentEventMap[K]>,
  ): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  off<K extends keyof ConsentEventMap>(
    event: K,
    cb: Listener<ConsentEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit<K extends keyof ConsentEventMap>(event: K, data: ConsentEventMap[K]): void {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(data); } catch { /* don't let listener errors break the core */ }
    });
  }
}

export const emitter = new ConsentEmitter();
