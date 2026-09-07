import { describe, it, expect, beforeEach } from 'vitest';
import {
  ensureGtag,
  initConsentMode,
  registerGcmSignals,
  computeGcmState,
  syncConsentMode,
  __resetConsentMode,
} from '../gcm';
import { consentState } from '../state';

/** gtag commands are pushed as Arguments objects — normalise them to arrays for assertions. */
const commands = () =>
  window.dataLayer
    .filter(x => Object.prototype.toString.call(x) === '[object Arguments]')
    .map(x => Array.from(x as ArrayLike<unknown>));

describe('Google Consent Mode v2 (core)', () => {
  beforeEach(() => {
    __resetConsentMode();
    consentState.set({});
    window.dataLayer = [];
    // @ts-expect-error — reset the stub between tests
    delete window.gtag;
    window._modernConsentConfig = { consentMode: true };
  });

  it('ensureGtag() installs the official stub that pushes the Arguments object', () => {
    ensureGtag();
    window.gtag('event', 'x');
    expect(Object.prototype.toString.call(window.dataLayer[0])).toBe('[object Arguments]');
    expect(commands()).toEqual([['event', 'x']]);
  });

  it('does nothing when consentMode is off', () => {
    window._modernConsentConfig = {};
    initConsentMode();
    expect(window.dataLayer).toHaveLength(0);
    expect(computeGcmState({ ga: true })).toBeUndefined();
    expect(syncConsentMode({ ga: true })).toBeUndefined();
  });

  it('pushes a single consent default with the four v2 signals denied', () => {
    initConsentMode();
    initConsentMode();
    expect(commands()).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          analytics_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
    ]);
  });

  it('honours consentModeDefaults overrides', () => {
    window._modernConsentConfig = {
      consentMode: true,
      consentModeDefaults: { security_storage: 'granted', ad_storage: 'granted' },
    };
    initConsentMode();
    expect(commands()[0][2]).toMatchObject({
      ad_storage: 'granted',
      security_storage: 'granted',
      analytics_storage: 'denied',
    });
  });

  it('derives signals from vendor declarations (granted if ANY declaring vendor has consent)', () => {
    registerGcmSignals('ga', ['analytics_storage']);
    registerGcmSignals('ads', ['ad_storage']);
    registerGcmSignals('gcmads', ['ad_user_data', 'ad_personalization']);
    registerGcmSignals('other-analytics', ['analytics_storage']);

    expect(computeGcmState({ ga: false, 'other-analytics': true, ads: true })).toEqual({
      analytics_storage: 'granted',
      ad_storage: 'granted',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  });

  it('syncConsentMode pushes consent update only when the state changes', () => {
    registerGcmSignals('ga', ['analytics_storage']);
    initConsentMode();

    // same as defaults → nothing pushed
    syncConsentMode({});
    expect(commands()).toHaveLength(1);

    syncConsentMode({ ga: true });
    expect(commands()).toHaveLength(2);
    expect(commands()[1]).toEqual([
      'consent',
      'update',
      {
        ad_storage: 'denied',
        analytics_storage: 'granted',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);

    // unchanged → no duplicate push
    syncConsentMode({ ga: true });
    expect(commands()).toHaveLength(2);

    syncConsentMode({ ga: false });
    expect(commands()).toHaveLength(3);
    expect(commands()[2][2]).toMatchObject({ analytics_storage: 'denied' });
  });

  it('lazily pushes the default if consentMode was enabled after vendors registered', () => {
    registerGcmSignals('ga', ['analytics_storage']);
    syncConsentMode({ ga: true });
    expect(commands().map(c => c[1])).toEqual(['default', 'update']);
  });
});
