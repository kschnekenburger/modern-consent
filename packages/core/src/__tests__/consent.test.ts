import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { consentState, hasAnswered, servicesList, isPanelOpen, initState } from '../state';
import {
  acceptAll,
  denyAll,
  setConsent,
  setConsentBatch,
  setConsentRecord,
  restoreConsent,
  __resetPendingReload,
} from '../consent';
import { emitter } from '../emitter';
import * as registry from '../registry';

// Mock registry functions
vi.mock('../registry', async () => {
  const actual = await vi.importActual('../registry');
  return {
    ...(actual as any),
    activateService: vi.fn(),
    clearVendorArtifacts: vi.fn(),
  };
});

const COOKIE = 'consent_test';

function readCookie(name = COOKIE) {
  const raw = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
}

function withMockedReload(fn: () => void) {
  const originalLocation = window.location;
  // @ts-expect-error — overriding window.location for test
  delete window.location;
  window.location = { ...originalLocation, reload: vi.fn() } as any;
  try {
    fn();
    return window.location.reload as ReturnType<typeof vi.fn>;
  } finally {
    // @ts-expect-error — overriding window.location for test
    window.location = originalLocation;
  }
}

const service = (id: string, loaded = false) => ({
  id,
  name: id.toUpperCase(),
  description: 'D',
  category: 'C',
  loaded,
  requireConsent: true,
});

describe('Consent Logic', () => {
  beforeEach(() => {
    document.cookie = `${COOKIE}=;expires=${new Date(0).toUTCString()};path=/`;
    window._modernConsentConfig = {};
    __resetPendingReload();
    initState({ cookieName: COOKIE, consentVersion: 'v1' });
    isPanelOpen.set(true);
    servicesList.set([service('service1'), service('service2')]);
    window.consentLayer = [];
    window.dataLayer = [];
    vi.clearAllMocks();
  });

  it('should set consent for a single service and activate it', () => {
    setConsent('service1', true);
    expect(consentState.get()['service1']).toBe(true);
    expect(hasAnswered.get()).toBe(true);
    expect(registry.activateService).toHaveBeenCalledWith('service1');
  });

  it('should accept all services', () => {
    acceptAll();
    expect(consentState.get()).toEqual({ service1: true, service2: true });
    expect(hasAnswered.get()).toBe(true);
    expect(isPanelOpen.get()).toBe(false);
    expect(registry.activateService).toHaveBeenCalledTimes(2);
  });

  it('should deny all services', () => {
    denyAll();
    expect(consentState.get()).toEqual({ service1: false, service2: false });
    expect(hasAnswered.get()).toBe(true);
    expect(isPanelOpen.get()).toBe(false);
    expect(registry.activateService).not.toHaveBeenCalled();
  });

  it('should reload immediately when denying a loaded service while the panel is closed', () => {
    isPanelOpen.set(false);
    servicesList.set([service('service1', true), service('service2')]);
    const reload = withMockedReload(() => setConsent('service1', false));
    expect(consentState.get()['service1']).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('defers the reload while the panel is open, fires once when it closes', () => {
    servicesList.set([service('service1', true), service('service2', true)]);
    const reload = withMockedReload(() => {
      // Two revocations during one customization session: no reload yet
      setConsent('service1', false);
      setConsent('service2', false);
      expect(window.location.reload).not.toHaveBeenCalled();
      // User closes the panel → single coalesced reload
      isPanelOpen.set(false);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('should NOT reload when denying a service that was never loaded', () => {
    const reload = withMockedReload(() => setConsent('service1', false));
    expect(reload).not.toHaveBeenCalled();
  });

  it('should clear artifacts on every revocation, even if the vendor was not loaded here', () => {
    // consentOnly: the TMS loaded the tag, `loaded` stays false, cookies must still go
    window._modernConsentConfig = { consentOnly: true };
    setConsent('service1', false);
    expect(registry.clearVendorArtifacts).toHaveBeenCalledWith('service1');
  });

  it('should emit consent:update events on setConsent', () => {
    const spy = vi.fn();
    const off = emitter.on('consent:update', spy);

    setConsent('service1', true);
    expect(spy).toHaveBeenCalledWith({ vendor: 'service1', status: 'granted' });

    spy.mockClear();
    setConsent('service2', false);
    expect(spy).toHaveBeenCalledWith({ vendor: 'service2', status: 'denied' });

    off();
  });

  it('consent:saved carries the SAME consentId as the cookie', () => {
    const spy = vi.fn();
    const off = emitter.on('consent:saved', spy);

    setConsent('service1', true);

    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0];
    const cookie = readCookie();
    expect(event.consentId).toBe(cookie.consentId);
    expect(event.timestamp).toBe(cookie.timestamp);
    expect(event.version).toBe('v1');
    expect(window.consentLayer[0].consent_id).toBe(cookie.consentId);

    off();
  });

  it('acceptAll emits ONE consent:saved and N consent:update', () => {
    const saved = vi.fn();
    const updated = vi.fn();
    const off1 = emitter.on('consent:saved', saved);
    const off2 = emitter.on('consent:update', updated);

    acceptAll();
    expect(saved).toHaveBeenCalledTimes(1);
    expect(updated).toHaveBeenCalledTimes(2);
    expect(saved.mock.calls[0][0]).toMatchObject({ consent: { service1: true, service2: true } });
    expect(window.consentLayer).toHaveLength(1);

    off1();
    off2();
  });

  it('setConsentBatch is one action: one cookie write, one consentId, one reload', () => {
    isPanelOpen.set(false);
    servicesList.set([service('service1', true), service('service2', true)]);
    const saved = vi.fn();
    const off = emitter.on('consent:saved', saved);

    const reload = withMockedReload(() => setConsentBatch({ service1: false, service2: false }));

    expect(saved).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(readCookie().consent).toEqual({ service1: false, service2: false });
    expect(readCookie().consentId).toBe(saved.mock.calls[0][0].consentId);
    expect(registry.clearVendorArtifacts).toHaveBeenCalledTimes(2);

    off();
  });

  it('should always push to window.consentLayer with source "user"', () => {
    setConsent('service1', true);
    expect(window.consentLayer).toHaveLength(1);
    expect(window.consentLayer[0]).toMatchObject({
      event: 'consent_update',
      consent_state: { service1: true },
      consent_source: 'user',
    });
  });

  it('should NOT push to dataLayer by default', () => {
    setConsent('service1', true);
    expect(window.dataLayer.length).toBe(0);
  });

  it('should push to dataLayer when pushDataLayer is enabled', () => {
    window._modernConsentConfig = { pushDataLayer: true };
    setConsent('service1', true);
    expect(window.dataLayer.length).toBe(1);
    expect(window.dataLayer[0]).toMatchObject({ event: 'consent_update' });
  });

  it('should NOT reload in consentOnly mode even when service was loaded', () => {
    window._modernConsentConfig = { consentOnly: true };
    servicesList.set([service('service1', true)]);
    const reload = withMockedReload(() => setConsent('service1', false));
    expect(reload).not.toHaveBeenCalled();
  });

  it('denyAll reloads immediately: it closes the panel as part of the action', () => {
    servicesList.set([service('service1', true)]);
    expect(isPanelOpen.get()).toBe(true);
    const reload = withMockedReload(() => denyAll());
    expect(reload).toHaveBeenCalledTimes(1);
    expect(isPanelOpen.get()).toBe(false);
  });

  it('should NOT reload on denyAll in consentOnly mode', () => {
    window._modernConsentConfig = { consentOnly: true };
    servicesList.set([service('service1', true), service('service2', true)]);
    const reload = withMockedReload(() => denyAll());
    expect(reload).not.toHaveBeenCalled();
  });

  describe('setConsentRecord (snapshot from the host page)', () => {
    const parentRecord = {
      consent: { service1: true, service2: false },
      answered: true,
      consentId: 'parent-id',
      timestamp: 1234,
      version: 'parent-v1',
    };

    it('applies the snapshot as ONE action and keeps the parent audit metadata', () => {
      const saved = vi.fn();
      const off = emitter.on('consent:saved', saved);

      setConsentRecord(parentRecord);

      expect(consentState.get()).toEqual({ service1: true, service2: false });
      expect(hasAnswered.get()).toBe(true);
      expect(saved).toHaveBeenCalledTimes(1);
      expect(saved.mock.calls[0][0]).toMatchObject({
        consentId: 'parent-id',
        timestamp: 1234,
        version: 'parent-v1',
      });
      expect(readCookie()).toMatchObject({ consentId: 'parent-id', timestamp: 1234 });
      expect(registry.activateService).toHaveBeenCalledWith('service1');
      expect(registry.activateService).not.toHaveBeenCalledWith('service2');

      off();
    });

    it('pushes to the data layers with source "external"', () => {
      window._modernConsentConfig = { pushDataLayer: true };
      setConsentRecord(parentRecord);

      expect(window.consentLayer).toHaveLength(1);
      expect(window.dataLayer[0]).toMatchObject({
        event: 'consent_update',
        consent_state: { service1: true, service2: false },
        consent_id: 'parent-id',
        consent_source: 'external',
      });
    });

    it('only touches the vendors whose status changes, and is a no-op when nothing changes', () => {
      setConsent('service1', true);
      const updated = vi.fn();
      const saved = vi.fn();
      const off1 = emitter.on('consent:update', updated);
      const off2 = emitter.on('consent:saved', saved);

      setConsentRecord(parentRecord);
      expect(updated).toHaveBeenCalledTimes(1);
      expect(updated).toHaveBeenCalledWith({ vendor: 'service2', status: 'denied' });
      expect(saved).toHaveBeenCalledTimes(1);

      // Same snapshot again: nothing changes, no event, no new consentId
      updated.mockClear();
      saved.mockClear();
      setConsentRecord(parentRecord);
      expect(updated).not.toHaveBeenCalled();
      expect(saved).not.toHaveBeenCalled();
      expect(readCookie().consentId).toBe('parent-id');

      off1();
      off2();
    });

    it('treats the snapshot as the full state: vendors missing from it are revoked', () => {
      setConsentBatch({ service1: true, service2: true });

      setConsentRecord({ consent: { service2: true } });

      expect(consentState.get()).toEqual({ service1: false, service2: true });
      expect(registry.clearVendorArtifacts).toHaveBeenCalledWith('service1');
    });

    it('generates audit metadata when the snapshot carries none', () => {
      setConsentRecord({ consent: { service1: true } });
      const cookie = readCookie();
      expect(typeof cookie.consentId).toBe('string');
      expect(cookie.version).toBe('v1');
    });
  });

  describe('embedded mode', () => {
    beforeEach(() => {
      window._modernConsentConfig = { embedded: true };
      initState({ cookieName: COOKIE, embedded: true });
      isPanelOpen.set(false);
    });

    afterEach(() => {
      initState({ cookieName: COOKIE, consentVersion: 'v1' });
    });

    it('applies the host snapshot without persisting anything', () => {
      setConsentRecord({ consent: { service1: true }, consentId: 'parent-id' });

      expect(consentState.get()).toEqual({ service1: true });
      expect(readCookie()).toBeUndefined();
      expect(window.consentLayer[0]).toMatchObject({
        consent_id: 'parent-id',
        consent_source: 'external',
      });
    });

    it('never reloads on revocation, even for a loaded vendor', () => {
      servicesList.set([service('service1', true)]);
      setConsentRecord({ consent: { service1: true } });

      const reload = withMockedReload(() => setConsentRecord({ consent: { service1: false } }));

      expect(reload).not.toHaveBeenCalled();
      expect(registry.clearVendorArtifacts).toHaveBeenCalledWith('service1');
    });
  });

  describe('restoreConsent (page reload)', () => {
    it('replays the stored consent to consentLayer/dataLayer without re-persisting', () => {
      window._modernConsentConfig = { pushDataLayer: true };
      setConsent('service1', true);
      const stored = readCookie();
      window.consentLayer = [];
      window.dataLayer = [];

      const restoredSpy = vi.fn();
      const savedSpy = vi.fn();
      const off1 = emitter.on('consent:restored', restoredSpy);
      const off2 = emitter.on('consent:saved', savedSpy);

      // Simulate a new page: reload state from the cookie, then replay.
      consentState.set({});
      hasAnswered.set(false);
      const { restored } = initState({ cookieName: COOKIE, consentVersion: 'v1' });
      expect(restored).toBe(true);
      restoreConsent();

      expect(window.consentLayer).toHaveLength(1);
      expect(window.dataLayer).toHaveLength(1);
      expect(window.dataLayer[0]).toMatchObject({
        event: 'consent_update',
        consent_state: { service1: true },
        consent_id: stored.consentId,
        consent_source: 'restore',
      });
      expect(restoredSpy).toHaveBeenCalledWith(
        expect.objectContaining({ consentId: stored.consentId, consent: { service1: true } }),
      );
      expect(savedSpy).not.toHaveBeenCalled();
      // the cookie is untouched: same consentId as before
      expect(readCookie().consentId).toBe(stored.consentId);

      off1();
      off2();
    });
  });
});
