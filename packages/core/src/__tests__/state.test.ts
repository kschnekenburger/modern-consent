import { describe, it, expect, beforeEach, vi } from 'vitest';
import { consentState, hasAnswered, initState } from '../state';

describe('State & Cookies', () => {
  beforeEach(() => {
    // Reset stores
    consentState.set({});
    hasAnswered.set(false);
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  });

  it('should initialize with empty state when no cookie exists', () => {
    initState({});
    expect(consentState.get()).toEqual({});
    expect(hasAnswered.get()).toBe(false);
  });

  it('should load state from cookie', () => {
    const mockState = {
      consent: { ga: true },
      answered: true
    };
    document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

    initState({});
    expect(consentState.get()).toEqual({ ga: true });
    expect(hasAnswered.get()).toBe(true);
  });

  it('should save to cookie when state changes', () => {
    initState({ cookieName: 'custom_cookie' });
    
    consentState.set({ ga: true });
    hasAnswered.set(true);

    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('custom_cookie='))
      ?.split('=')[1];

    expect(cookieValue).toBeDefined();
    const parsed = JSON.parse(decodeURIComponent(cookieValue!));
    expect(parsed.consent).toEqual({ ga: true });
    expect(parsed.answered).toBe(true);
  });

  it('should handle invalid cookie JSON', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    document.cookie = `mc_consent_state=invalid-json;path=/`;

    initState({});
    expect(consentState.get()).toEqual({});
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should include consentId in saved cookie', () => {
    initState({ cookieName: 'id_test' });

    consentState.set({ ga: true });
    hasAnswered.set(true);

    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('id_test='))
      ?.split('=')[1];

    expect(cookieValue).toBeDefined();
    const parsed = JSON.parse(decodeURIComponent(cookieValue!));
    expect(parsed.consentId).toBeDefined();
    expect(typeof parsed.consentId).toBe('string');
    expect(parsed.consentId.length).toBeGreaterThan(0);
  });

  it('should re-prompt when consentVersion changes', () => {
    const mockState = {
      consent: { ga: true },
      answered: true,
      version: 'v1',
    };
    document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

    initState({ consentVersion: 'v2' });
    expect(hasAnswered.get()).toBe(false);
  });

  it('should NOT re-prompt when consentVersion matches', () => {
    const mockState = {
      consent: { ga: true },
      answered: true,
      version: 'v1',
    };
    document.cookie = `mc_consent_state=${encodeURIComponent(JSON.stringify(mockState))};path=/`;

    initState({ consentVersion: 'v1' });
    expect(hasAnswered.get()).toBe(true);
  });
});
