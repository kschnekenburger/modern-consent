// core/src/gcm.ts — Google Consent Mode v2 handled centrally by the core.
//
// When `consentMode: true`, the core owns the gtag consent lifecycle:
//   1. pushes a single `consent default` (all four v2 signals denied) as early as possible,
//   2. derives the signal state from the per-vendor consent (vendors declare `gcm: [...]`),
//   3. pushes `consent update` whenever the derived state changes (user action, vendor
//      module load, page reload with stored consent).
//
// Vendors must NOT call gtag('consent', ...) themselves — they only declare signals.
import { consentState } from './state';
import type { ConsentState } from './state';

export type GcmSignal =
  | 'ad_storage'
  | 'analytics_storage'
  | 'ad_user_data'
  | 'ad_personalization'
  | 'functionality_storage'
  | 'personalization_storage'
  | 'security_storage';

export type GcmStatus = 'granted' | 'denied';
export type GcmState = Partial<Record<GcmSignal, GcmStatus>>;

/** The four signals required by Consent Mode v2 for EEA traffic. */
const REQUIRED_SIGNALS: GcmSignal[] = [
  'ad_storage',
  'analytics_storage',
  'ad_user_data',
  'ad_personalization',
];

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const _signalsByVendor = new Map<string, GcmSignal[]>();
let _defaults: GcmState | null = null;
let _lastPushed: GcmState | null = null;

function isEnabled(): boolean {
  return typeof window !== 'undefined' && window._modernConsentConfig?.consentMode === true;
}

/**
 * Ensures `window.dataLayer` and the official `gtag` stub exist.
 *
 * The stub MUST push the `arguments` object, not an array: gtag.js recognises
 * commands by the Arguments type and silently ignores plain arrays.
 */
export function ensureGtag(): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
}

/**
 * Pushes `consent default` once. Idempotent. No-op when consentMode is off.
 * Called as soon as `consentMode: true` is seen in the config, before any vendor `setup()`.
 */
export function initConsentMode(): void {
  if (!isEnabled() || _defaults) return;
  ensureGtag();

  const defaults: GcmState = {};
  REQUIRED_SIGNALS.forEach(s => (defaults[s] = 'denied'));
  Object.assign(defaults, window._modernConsentConfig?.consentModeDefaults ?? {});

  window.gtag('consent', 'default', { ...defaults });
  _defaults = defaults;
  _lastPushed = defaults;
}

/** Called by the registry when a vendor module is loaded. */
export function registerGcmSignals(vendorId: string, signals: GcmSignal[] | undefined): void {
  if (signals && signals.length > 0) _signalsByVendor.set(vendorId, signals);
}

/**
 * Derives the GCM state from the per-vendor consent.
 * A signal is granted if at least one vendor declaring it has consent; denied otherwise.
 * Returns `undefined` when consentMode is off.
 */
export function computeGcmState(consent: ConsentState): GcmState | undefined {
  if (!isEnabled()) return undefined;

  const state: GcmState = { ...(_defaults ?? {}) };
  _signalsByVendor.forEach((signals, vendorId) => {
    const granted = consent[vendorId] === true;
    signals.forEach(signal => {
      if (granted) state[signal] = 'granted';
      else if (state[signal] !== 'granted') state[signal] = 'denied';
    });
  });
  return state;
}

function sameState(a: GcmState | null, b: GcmState): boolean {
  if (!a) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<GcmSignal>;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

/**
 * Recomputes the GCM state and pushes `consent update` only if it changed
 * since the last push. Returns the current derived state (or undefined when off).
 */
export function syncConsentMode(consent: ConsentState = consentState.get()): GcmState | undefined {
  if (!isEnabled()) return undefined;
  initConsentMode();

  const next = computeGcmState(consent)!;
  if (sameState(_lastPushed, next)) return next;

  window.gtag('consent', 'update', { ...next });
  _lastPushed = next;
  return next;
}

/** @internal — test helper only */
export function __resetConsentMode(): void {
  _signalsByVendor.clear();
  _defaults = null;
  _lastPushed = null;
}
