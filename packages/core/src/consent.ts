import { servicesList, consentState, isPanelOpen, commitConsent, getConsentRecord } from './state';
import type { ConsentState, ConsentRecord } from './state';
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

export type ConsentEventSource = 'user' | 'restore';

/**
 * Always pushes consent state to `window.consentLayer` (TMS-agnostic).
 * Optionally pushes to `window.dataLayer` when `pushDataLayer` is enabled (GTM convenience).
 *
 * `source` is `'user'` for a fresh decision and `'restore'` when a stored consent is
 * replayed at page load — the event name is the same so TMS triggers fire in both cases.
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

/**
 * Single entry point for every consent decision.
 * ONE commit (cookie + consentId), ONE `consent:saved`, ONE optional reload,
 * and one `consent:update` per vendor touched.
 */
function applyConsent(updates: Record<string, boolean>, options: { closePanel?: boolean } = {}) {
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

  const record = commitConsent(next, true);
  if (options.closePanel) isPanelOpen.set(false);

  const gcm = syncConsentMode(next);

  ids.forEach(id => {
    emitter.emit('consent:update', {
      vendor: id,
      status: updates[id] ? 'granted' : 'denied',
      ...(gcm ? { gcm } : {}),
    });
  });

  pushConsentEvent(record, 'user', gcm);
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

  if (needsReload && !isConsentOnly() && typeof window !== 'undefined') {
    window.location.reload();
  }
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
