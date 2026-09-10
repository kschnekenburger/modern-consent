import {
  servicesList,
  consentState,
  isPanelOpen,
  commitConsent,
  getConsentRecord,
  isEmbedded,
} from './state';
import type { ConsentState, ConsentRecord, ConsentInput, ConsentMeta } from './state';
import { activateService, clearVendorArtifacts } from './registry';
import { emitter } from './emitter';
import { syncConsentMode } from './gcm';
import type { GcmState } from './gcm';

declare global {
  interface Window {
    consentLayer: any[];
    dataLayer: any[];
  }
}

export type ConsentEventSource = 'user' | 'restore' | 'external';

/**
 * Always pushes consent state to `window.consentLayer` (TMS-agnostic).
 * Optionally pushes to `window.dataLayer` when `pushDataLayer` is enabled (GTM convenience).
 *
 * `source` is `'user'` for a fresh decision, `'restore'` when a stored consent is replayed
 * at page load and `'external'` when the decision comes from another page (iframe host) —
 * the event name is the same so TMS triggers fire in every case.
 */
function pushConsentEvent(record: ConsentRecord, source: ConsentEventSource, gcm?: GcmState) {
  if (typeof window === 'undefined') return;

  const event = {
    event: 'consent_update',
    consent_state: record.consent,
    consent_id: record.consentId,
    consent_timestamp: record.timestamp,
    consent_version: record.version,
    consent_source: source,
    ...(gcm ? { gcm } : {}),
  };

  // consentLayer — always active, TMS-agnostic
  window.consentLayer = window.consentLayer || [];
  window.consentLayer.push(event);

  // dataLayer — opt-in for GTM native triggers
  if (window._modernConsentConfig?.pushDataLayer) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
  }
}

function isConsentOnly(): boolean {
  return typeof window !== 'undefined' && window._modernConsentConfig?.consentOnly === true;
}

let _reloadPending = false;
let _reloadUnsub: (() => void) | null = null;

/**
 * Reloads the page to flush a revoked vendor's script from memory — but never
 * under the user's feet: while the consent panel is open (the user may still be
 * customizing), the reload is deferred until the panel closes. Multiple
 * revocations coalesce into a single reload.
 */
function scheduleReload() {
  // Embedded: never reload under the host page — the user is likely mid-flow in the iframe.
  if (isConsentOnly() || isEmbedded() || typeof window === 'undefined') return;

  if (!isPanelOpen.get()) {
    window.location.reload();
    return;
  }

  if (_reloadPending) return;
  _reloadPending = true;
  _reloadUnsub = isPanelOpen.subscribe(open => {
    if (open || !_reloadPending) return;
    _reloadPending = false;
    _reloadUnsub?.();
    _reloadUnsub = null;
    window.location.reload();
  });
}

/** @internal — test helper only */
export function __resetPendingReload() {
  _reloadPending = false;
  _reloadUnsub?.();
  _reloadUnsub = null;
}

type ApplyOptions = {
  closePanel?: boolean;
  /** Audit metadata to keep instead of generating new ones (external decision). */
  meta?: ConsentMeta;
  source?: ConsentEventSource;
};

/**
 * Single entry point for every consent decision.
 * ONE commit (cookie + consentId), ONE `consent:saved`, ONE optional reload,
 * and one `consent:update` per vendor touched.
 */
function applyConsent(updates: Record<string, boolean>, options: ApplyOptions = {}) {
  const ids = Object.keys(updates);
  if (ids.length === 0) return;

  const list = servicesList.get();
  const previous = consentState.get();
  const next: ConsentState = { ...previous, ...updates };

  // Revocations: always clear declared artifacts (also in consentOnly mode, where the TMS
  // loaded the tag), reload only if the vendor was actually running in this page.
  let needsReload = false;
  ids.forEach(id => {
    if (updates[id]) return;
    clearVendorArtifacts(id);
    if (list.find(s => s.id === id)?.loaded) needsReload = true;
  });

  const record = commitConsent(next, true, options.meta);
  if (options.closePanel) isPanelOpen.set(false);

  const gcm = syncConsentMode(next);

  ids.forEach(id => {
    emitter.emit('consent:update', {
      vendor: id,
      status: updates[id] ? 'granted' : 'denied',
      ...(gcm ? { gcm } : {}),
    });
  });

  pushConsentEvent(record, options.source ?? 'user', gcm);
  emitter.emit('consent:saved', {
    consentId: record.consentId!,
    timestamp: record.timestamp!,
    version: record.version,
    consent: record.consent,
    ...(gcm ? { gcm } : {}),
  });

  ids.forEach(id => {
    if (updates[id]) activateService(id);
  });

  if (needsReload) scheduleReload();
}

/** Set consent for a single vendor. */
export function setConsent(id: string, allowed: boolean) {
  applyConsent({ [id]: allowed });
}

/**
 * Set consent for several vendors as ONE action (one consentId, one cookie write,
 * one `consent:saved`). Used by purpose/category toggles.
 */
export function setConsentBatch(updates: Record<string, boolean>) {
  applyConsent(updates);
}

export function acceptAll() {
  const updates: Record<string, boolean> = {};
  servicesList.get().forEach(s => (updates[s.id] = true));
  applyConsent(updates, { closePanel: true });
}

export function denyAll() {
  const updates: Record<string, boolean> = {};
  servicesList.get().forEach(s => (updates[s.id] = false));
  applyConsent(updates, { closePanel: true });
}

/**
 * Applies a consent snapshot decided elsewhere — typically pushed by the host page into an
 * iframe running in `embedded` mode. `record.consent` is the FULL state: vendors missing
 * from it are revoked. Only the vendors whose status actually changes are touched, so
 * re-sending the same snapshot is a no-op (no event, no new consentId).
 *
 * When the record carries audit metadata (`consentId`, `timestamp`, `version`) it is kept
 * as-is, so the host page and the embedded page share one `consentId` for the action.
 */
export function setConsentRecord(record: ConsentInput) {
  const snapshot = record?.consent ?? {};
  const previous = consentState.get();
  const updates: Record<string, boolean> = {};

  Object.keys(previous).forEach(id => {
    if (previous[id] === true && !(id in snapshot)) updates[id] = false;
  });
  Object.keys(snapshot).forEach(id => {
    const allowed = snapshot[id] === true;
    if (previous[id] !== allowed) updates[id] = allowed;
  });

  applyConsent(updates, {
    source: 'external',
    meta: { consentId: record.consentId, timestamp: record.timestamp, version: record.version },
  });
}

/**
 * Replays a stored consent at page load so that Tag Managers and listeners receive the
 * same `consent_update` event they would get after a user decision. Nothing is persisted.
 */
export function restoreConsent() {
  const record = getConsentRecord();
  const gcm = syncConsentMode(record.consent);

  pushConsentEvent(record, 'restore', gcm);
  emitter.emit('consent:restored', {
    consentId: record.consentId,
    timestamp: record.timestamp,
    version: record.version,
    consent: record.consent,
    ...(gcm ? { gcm } : {}),
  });
}
