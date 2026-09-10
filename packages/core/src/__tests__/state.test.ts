import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  consentState,
  hasAnswered,
  consentMeta,
  initState,
  commitConsent,
  getConsentRecord,
  isEmbedded,
} from '../state';

function readCookie(name: string) {
  const raw = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
}

describe('State & Cookies', () => {
  beforeEach(() => {
    consentState.set({});
    hasAnswered.set(false);
    consentMeta.set({});
    document.cookie.split(';').forEach(c => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
  });

  it('should initialize with empty state when no cookie exists', () => {
    const { restored } = initState({});
    expect(consentState.get()).toEqual({});
    expect(hasAnswered.get()).toBe(false);
    expect(restored).toBe(false);
  });

  it('should load state from cookie and report it as restored', () => {
    const mockState = { consent: { ga: true }, answered: true, consentId: 'abc', timestamp: 42 };
    document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

    const { restored } = initState({});
    expect(consentState.get()).toEqual({ ga: true });
    expect(hasAnswered.get()).toBe(true);
    expect(consentMeta.get()).toEqual({ consentId: 'abc', timestamp: 42, version: undefined });
    expect(restored).toBe(true);
  });

  it('should NOT write the cookie on raw store mutation (persistence is explicit)', () => {
    initState({ cookieName: 'custom_cookie' });
    consentState.set({ ga: true });
    hasAnswered.set(true);
    expect(readCookie('custom_cookie')).toBeUndefined();
  });

  it('commitConsent() writes the cookie once with a single consentId', () => {
    initState({ cookieName: 'custom_cookie', consentVersion: 'v3' });

    const record = commitConsent({ ga: true });

    const parsed = readCookie('custom_cookie');
    expect(parsed.consent).toEqual({ ga: true });
    expect(parsed.answered).toBe(true);
    expect(parsed.version).toBe('v3');
    expect(typeof parsed.consentId).toBe('string');
    expect(parsed.consentId.length).toBeGreaterThan(0);

    // cookie, returned record and in-memory metadata all agree
    expect(record.consentId).toBe(parsed.consentId);
    expect(record.timestamp).toBe(parsed.timestamp);
    expect(consentMeta.get().consentId).toBe(parsed.consentId);
    expect(getConsentRecord()).toEqual(record);
    expect(consentState.get()).toEqual({ ga: true });
    expect(hasAnswered.get()).toBe(true);
  });

  it('should handle invalid cookie JSON', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.cookie = `mc_consent_state=invalid-json;path=/`;

    initState({});
    expect(consentState.get()).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should re-prompt (and not restore) when consentVersion changes', () => {
    const mockState = { consent: { ga: true }, answered: true, version: 'v1' };
    document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

    const { restored } = initState({ consentVersion: 'v2' });
    expect(hasAnswered.get()).toBe(false);
    expect(restored).toBe(false);
  });

  it('should NOT re-prompt when consentVersion matches', () => {
    const mockState = { consent: { ga: true }, answered: true, version: 'v1' };
    document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

    const { restored } = initState({ consentVersion: 'v1' });
    expect(hasAnswered.get()).toBe(true);
    expect(restored).toBe(true);
  });

  it('commitConsent() keeps the provided audit metadata instead of generating new ones', () => {
    initState({ cookieName: 'custom_cookie', consentVersion: 'v3' });

    const record = commitConsent({ ga: true }, true, {
      consentId: 'parent-id',
      timestamp: 1234,
      version: 'parent-v1',
    });

    expect(record).toMatchObject({ consentId: 'parent-id', timestamp: 1234, version: 'parent-v1' });
    expect(readCookie('custom_cookie')).toMatchObject({ consentId: 'parent-id', timestamp: 1234 });
    expect(consentMeta.get()).toEqual({
      consentId: 'parent-id',
      timestamp: 1234,
      version: 'parent-v1',
    });
  });

  describe('embedded mode', () => {
    afterEach(() => {
      initState({});
    });

    it('ignores the stored cookie: consent only comes from the host page', () => {
      const mockState = { consent: { ga: true }, answered: true };
      document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

      const { restored } = initState({ embedded: true });

      expect(isEmbedded()).toBe(true);
      expect(restored).toBe(false);
      expect(consentState.get()).toEqual({});
      expect(hasAnswered.get()).toBe(false);
    });

    it('never writes the cookie but still updates the in-memory record', () => {
      initState({ cookieName: 'embedded_cookie', embedded: true });

      const record = commitConsent({ ga: true }, true, { consentId: 'parent-id' });

      expect(readCookie('embedded_cookie')).toBeUndefined();
      expect(consentState.get()).toEqual({ ga: true });
      expect(hasAnswered.get()).toBe(true);
      expect(getConsentRecord()).toEqual(record);
    });
  });
});
