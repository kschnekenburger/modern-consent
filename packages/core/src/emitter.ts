import type { ConsentState } from './state';
import type { GcmState } from './gcm';

export type ConsentSavedEvent = {
  consentId: string;
  timestamp: number;
  version?: string;
  consent: ConsentState;
  /** Derived Google Consent Mode state — present only when `consentMode: true`. */
  gcm?: GcmState;
};

export type ConsentRestoredEvent = {
  /** May be missing for cookies written by older versions. */
  consentId?: string;
  timestamp?: number;
  version?: string;
  consent: ConsentState;
  gcm?: GcmState;
};

export type ConsentEventMap = {
  /** One per vendor whose status changed in the action. */
  'consent:update': { vendor: string; status: 'granted' | 'denied'; gcm?: GcmState };
  /** One per user action (setConsent, setConsentBatch, acceptAll, denyAll). */
  'consent:saved': ConsentSavedEvent;
  /** Emitted at page load when a stored, still-valid consent is replayed. */
  'consent:restored': ConsentRestoredEvent;
};

type Listener<T> = (data: T) => void;

class ConsentEmitter {
  private listeners = new Map<string, Set<Listener<any>>>();

  on<K extends keyof ConsentEventMap>(event: K, cb: Listener<ConsentEventMap[K]>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  off<K extends keyof ConsentEventMap>(event: K, cb: Listener<ConsentEventMap[K]>): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit<K extends keyof ConsentEventMap>(event: K, data: ConsentEventMap[K]): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch {
        /* don't let listener errors break the core */
      }
    });
  }
}

export const emitter = new ConsentEmitter();
