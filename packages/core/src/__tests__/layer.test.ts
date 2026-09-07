import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initMcLayer } from '../layer';
import { consentState, hasAnswered, servicesList } from '../state';
import { __resetRegistry } from '../registry';
import { __resetResolvers } from '../resolver';
import { __resetConsentMode } from '../gcm';

const COOKIE = 'layer_test';

function storeCookie(record: object) {
  document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(record))};path=/`;
}

describe('initMcLayer', () => {
  beforeEach(() => {
    __resetRegistry();
    __resetResolvers();
    __resetConsentMode();
    servicesList.set([]);
    consentState.set({});
    hasAnswered.set(false);
    document.cookie = `${COOKIE}=;expires=${new Date(0).toUTCString()};path=/`;
    window.consentLayer = [];
    window.dataLayer = [];
    // @ts-expect-error — reset globals between tests
    delete window.modernConsent;
    // @ts-expect-error — reset globals between tests
    delete window.mcLayer;
    // @ts-expect-error — reset globals between tests
    delete window.gtag;
    window._modernConsentConfig = {};
  });

  it('processes the queued config before initialising state', () => {
    storeCookie({ consent: { ga: true }, answered: true });
    window.mcLayer = [['config', { cookieName: COOKIE }]];

    initMcLayer();

    expect(window._modernConsentConfig.cookieName).toBe(COOKIE);
    expect(consentState.get()).toEqual({ ga: true });
    expect(typeof window.modernConsent.getConsentRecord).toBe('function');
  });

  it('replays a stored consent to the data layers on page load', () => {
    storeCookie({ consent: { ga: true, ads: false }, answered: true, consentId: 'id-1' });
    window.mcLayer = [['config', { cookieName: COOKIE, pushDataLayer: true }]];

    initMcLayer();

    expect(window.consentLayer).toHaveLength(1);
    expect(window.dataLayer).toHaveLength(1);
    expect(window.dataLayer[0]).toMatchObject({
      event: 'consent_update',
      consent_state: { ga: true, ads: false },
      consent_id: 'id-1',
      consent_source: 'restore',
    });
  });

  it('does NOT replay when nothing was answered or when consentVersion changed', () => {
    storeCookie({ consent: { ga: true }, answered: true, version: 'v1' });
    window.mcLayer = [['config', { cookieName: COOKIE, consentVersion: 'v2' }]];

    initMcLayer();

    expect(window.consentLayer).toHaveLength(0);
    expect(hasAnswered.get()).toBe(false);
  });

  it('pushes the GCM consent default from the queue, before any vendor loads', () => {
    window.mcLayer = [['config', { cookieName: COOKIE, consentMode: true }]];

    initMcLayer();

    const cmds = window.dataLayer.map(x => Array.from(x as ArrayLike<unknown>));
    expect(cmds).toHaveLength(1);
    expect(cmds[0].slice(0, 2)).toEqual(['consent', 'default']);
  });

  it('is idempotent: a second core copy does not reset the config', () => {
    window.mcLayer = [['config', { cookieName: COOKIE, consentVersion: 'v9' }]];
    initMcLayer();
    const api = window.modernConsent;

    window.modernConsent('config', { pushDataLayer: true });
    initMcLayer();

    expect(window.modernConsent).toBe(api);
    expect(window._modernConsentConfig).toMatchObject({
      cookieName: COOKIE,
      consentVersion: 'v9',
      pushDataLayer: true,
    });
  });

  it('warns on unknown commands and unknown vendors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.mcLayer = [['bogus', {}] as any, ['config', { cookieName: COOKIE, cdnBase: undefined }]];
    initMcLayer();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"bogus" is not a valid command'));
    warn.mockRestore();
  });
});
