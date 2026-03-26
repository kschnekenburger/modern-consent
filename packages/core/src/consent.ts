import { servicesList, consentState, hasAnswered, isPanelOpen } from './state';
import type { ConsentState } from './state';
import { activateService, clearVendorArtifacts } from './registry';
import { emitter } from './emitter';
import { generateUUID } from './utils/uuid';

declare global {
  interface Window {
    consentLayer: any[];
    dataLayer: any[];
  }
}

/**
 * Always pushes consent state to `window.consentLayer` (TMS-agnostic).
 * Optionally pushes to `window.dataLayer` when `pushDataLayer` is enabled (GTM convenience).
 */
function pushConsentEvent(consent: ConsentState) {
  if (typeof window === 'undefined') return;

  const event = {
    event: 'consent_update',
    consent_state: consent,
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

function emitConsentSaved(consent: ConsentState) {
  emitter.emit('consent:saved', {
    consentId: generateUUID(),
    timestamp: Date.now(),
    version:
      typeof window !== 'undefined' ? window._modernConsentConfig?.consentVersion : undefined,
    consent,
  });
}

export function setConsent(id: string, allowed: boolean) {
  // Check before updating state whether this service was actively running
  const wasPreviouslyLoaded = servicesList.get().find(s => s.id === id)?.loaded ?? false;

  consentState.update(s => ({ ...s, [id]: allowed }));
  hasAnswered.set(true);

  emitter.emit('consent:update', {
    vendor: id,
    status: allowed ? 'granted' : 'denied',
  });

  const updatedConsent = consentState.get();
  pushConsentEvent(updatedConsent);
  emitConsentSaved(updatedConsent);

  if (allowed) {
    activateService(id);
    return;
  }

  // Only clean up and reload if the service was actively running
  if (wasPreviouslyLoaded) {
    clearVendorArtifacts(id);
    const isConsentOnly =
      typeof window !== 'undefined' && window._modernConsentConfig?.consentOnly === true;
    if (!isConsentOnly && typeof window !== 'undefined') window.location.reload();
  }
}

export function acceptAll() {
  const list = servicesList.get();
  const updates: Record<string, boolean> = {};

  list.forEach(s => {
    updates[s.id] = true;
    activateService(s.id);
  });

  consentState.set(updates);
  hasAnswered.set(true);
  isPanelOpen.set(false);

  list.forEach(s => {
    emitter.emit('consent:update', { vendor: s.id, status: 'granted' });
  });

  pushConsentEvent(updates);
  emitConsentSaved(updates);
}

export function denyAll() {
  const list = servicesList.get();
  const updates: Record<string, boolean> = {};
  let needsReload = false;

  list.forEach(s => {
    updates[s.id] = false;
    clearVendorArtifacts(s.id);
    if (s.loaded) needsReload = true;
  });

  consentState.set(updates);
  hasAnswered.set(true);
  isPanelOpen.set(false);

  list.forEach(s => {
    emitter.emit('consent:update', { vendor: s.id, status: 'denied' });
  });

  pushConsentEvent(updates);
  emitConsentSaved(updates);

  // Reload only if at least one vendor was actively running —
  // clears vendor scripts from memory after cookie cleanup.
  const isConsentOnly =
    typeof window !== 'undefined' && window._modernConsentConfig?.consentOnly === true;
  if (needsReload && !isConsentOnly && typeof window !== 'undefined') {
    window.location.reload();
  }
}
