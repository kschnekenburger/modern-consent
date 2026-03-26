import { describe, it, expect, beforeEach, vi } from 'vitest';
import { consentState, hasAnswered, servicesList, isPanelOpen } from '../state';
import { acceptAll, denyAll, setConsent } from '../consent';
import { emitter } from '../emitter';
import * as registry from '../registry';

// Mock registry functions
vi.mock('../registry', async () => {
  const actual = await vi.importActual('../registry');
  return {
    ...actual as any,
    activateService: vi.fn(),
  };
});

describe('Consent Logic', () => {
  beforeEach(() => {
    consentState.set({});
    hasAnswered.set(false);
    isPanelOpen.set(true);
    servicesList.set([
      { id: 'service1', name: 'S1', description: 'D1', category: 'C1', loaded: false, requireConsent: true },
      { id: 'service2', name: 'S2', description: 'D2', category: 'C2', loaded: false, requireConsent: true },
    ]);
    window._modernConsentConfig = {};
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

  it('should reload when denying a service that was already loaded', () => {
    servicesList.set([
      { id: 'service1', name: 'S1', description: 'D1', category: 'C1', loaded: true, requireConsent: true },
      { id: 'service2', name: 'S2', description: 'D2', category: 'C2', loaded: false, requireConsent: true },
    ]);

    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    setConsent('service1', false);
    expect(consentState.get()['service1']).toBe(false);
    expect(window.location.reload).toHaveBeenCalled();

    // @ts-ignore
    window.location = originalLocation;
  });

  it('should NOT reload when denying a service that was never loaded', () => {
    // service1 has loaded: false (default from beforeEach)
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    setConsent('service1', false);
    expect(consentState.get()['service1']).toBe(false);
    expect(window.location.reload).not.toHaveBeenCalled();

    // @ts-ignore
    window.location = originalLocation;
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

  it('should emit consent:saved on acceptAll', () => {
    const spy = vi.fn();
    const off = emitter.on('consent:saved', spy);

    acceptAll();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toMatchObject({
      consent: { service1: true, service2: true },
    });
    expect(spy.mock.calls[0][0].consentId).toBeDefined();

    off();
  });

  it('should always push to window.consentLayer', () => {
    setConsent('service1', true);
    expect(window.consentLayer.length).toBeGreaterThan(0);
    expect(window.consentLayer[0]).toMatchObject({
      event: 'consent_update',
    });
  });

  it('should NOT push to dataLayer by default', () => {
    setConsent('service1', true);
    expect(window.dataLayer.length).toBe(0);
  });

  it('should push to dataLayer when pushDataLayer is enabled', () => {
    window._modernConsentConfig = { pushDataLayer: true };
    setConsent('service1', true);
    expect(window.dataLayer.length).toBeGreaterThan(0);
    expect(window.dataLayer[0]).toMatchObject({
      event: 'consent_update',
    });
  });

  it('should NOT reload in consentOnly mode even when service was loaded', () => {
    window._modernConsentConfig = { consentOnly: true };
    servicesList.set([
      { id: 'service1', name: 'S1', description: 'D1', category: 'C1', loaded: true, requireConsent: true },
    ]);

    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    setConsent('service1', false);
    expect(window.location.reload).not.toHaveBeenCalled();

    // @ts-ignore
    window.location = originalLocation;
  });

  it('should NOT reload on denyAll in consentOnly mode', () => {
    window._modernConsentConfig = { consentOnly: true };
    servicesList.set([
      { id: 'service1', name: 'S1', description: 'D1', category: 'C1', loaded: true, requireConsent: true },
      { id: 'service2', name: 'S2', description: 'D2', category: 'C2', loaded: true, requireConsent: true },
    ]);

    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    denyAll();
    expect(window.location.reload).not.toHaveBeenCalled();

    // @ts-ignore
    window.location = originalLocation;
  });
});
