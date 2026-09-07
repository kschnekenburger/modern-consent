// core/src/state.ts
import { Store } from './utils/store';
import { generateUUID } from './utils/uuid';

export interface ConsentState {
  [serviceId: string]: boolean;
}

export interface ServiceMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Human-readable label for the purpose/category in 'purpose' displayMode. */
  purposeLabel?: string | Record<string, string>;
  /** Optional description for the purpose/category in 'purpose' displayMode. */
  purposeDescription?: string | Record<string, string>;
  loaded: boolean;
  requireConsent: boolean;
}

/** Audit metadata attached to the last committed consent action. */
export interface ConsentMeta {
  /** Unique identifier of the last consent action — GDPR audit trail. */
  consentId?: string;
  /** Unix timestamp (ms) of the last consent action. */
  timestamp?: number;
  /** Value of `consentVersion` at the time of the action. */
  version?: string;
}

/** Full snapshot of the persisted consent — what the cookie contains. */
export interface ConsentRecord extends ConsentMeta {
  consent: ConsentState;
  answered: boolean;
}

const DEFAULT_STORAGE_KEY = 'mc_consent_state';

interface CookieOptions {
  days?: number;
  path?: string;
  domain?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
}

function escapeCookieName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapeCookieName(name)}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, options: CookieOptions = {}) => {
  if (typeof document === 'undefined') return;

  const { days = 365, path = '/', domain, sameSite = 'Lax', secure = false } = options;

  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  let cookieString =
    `${name}=${encodeURIComponent(value)};` +
    `expires=${expires.toUTCString()};` +
    `path=${path};` +
    `SameSite=${sameSite}`;

  if (domain) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (hostname && !hostname.endsWith(domain.replace(/^\./, ''))) {
      console.warn(
        `[modern-consent] cookieDomain "${domain}" does not match current hostname "${hostname}". ` +
          `The cookie will be silently rejected by the browser. ` +
          `Remove cookieDomain for local development.`,
      );
    }
    cookieString += `;domain=${domain}`;
  }
  if (secure || sameSite === 'None') cookieString += `;Secure`;

  document.cookie = cookieString;
};

export const consentState = new Store<ConsentState>({});
export const hasAnswered = new Store<boolean>(false);
export const consentMeta = new Store<ConsentMeta>({});
export const servicesList = new Store<ServiceMetadata[]>([]);
export const isPanelOpen = new Store<boolean>(false);
export const openPanel = () => isPanelOpen.set(true);

type PersistOptions = Pick<
  import('./layer').McConfig,
  'cookieName' | 'cookieDomain' | 'consentVersion'
>;

let _persist: PersistOptions = {};

/**
 * Loads the stored consent into the stores.
 * Returns `{ restored: true }` when a valid, answered consent (matching `consentVersion`)
 * was found — the caller can then replay it to the data layers.
 */
export const initState = (config: PersistOptions): { restored: boolean } => {
  _persist = { ...config };
  const cookieName = config?.cookieName || DEFAULT_STORAGE_KEY;
  const consentVersion = config?.consentVersion;

  let initialData: ConsentRecord = { consent: {}, answered: false };

  if (typeof window !== 'undefined') {
    const stored = getCookie(cookieName);
    if (stored) {
      try {
        initialData = JSON.parse(stored) as ConsentRecord;
      } catch (e) {
        console.error('[modern-consent] Error parsing consent cookie', e);
      }
    }
  }

  consentState.set(initialData.consent || {});
  hasAnswered.set(initialData.answered || false);
  consentMeta.set({
    consentId: initialData.consentId,
    timestamp: initialData.timestamp,
    version: initialData.version,
  });

  // Re-prompt when consentVersion changes (GDPR: policy update invalidates prior consent)
  const versionMismatch =
    !!initialData.answered && !!consentVersion && initialData.version !== consentVersion;
  if (versionMismatch) {
    hasAnswered.set(false);
    isPanelOpen.set(true);
  }

  return { restored: !!initialData.answered && !versionMismatch };
};

/**
 * Commits a consent action: ONE consentId, ONE timestamp, ONE cookie write.
 * This is the only place that persists consent — stores are updated here too so
 * that the in-memory state, the audit metadata and the cookie always agree.
 */
export function commitConsent(consent: ConsentState, answered = true): ConsentRecord {
  const record: ConsentRecord = {
    consent,
    answered,
    consentId: generateUUID(),
    timestamp: Date.now(),
    version: _persist.consentVersion,
  };

  consentState.set(consent);
  hasAnswered.set(answered);
  consentMeta.set({
    consentId: record.consentId,
    timestamp: record.timestamp,
    version: record.version,
  });

  if (typeof window !== 'undefined') {
    setCookie(_persist.cookieName || DEFAULT_STORAGE_KEY, JSON.stringify(record), {
      domain: _persist.cookieDomain,
      secure: window.location.protocol === 'https:',
    });
  }

  return record;
}

/** Current persisted snapshot (consent + audit metadata). */
export function getConsentRecord(): ConsentRecord {
  return { consent: consentState.get(), answered: hasAnswered.get(), ...consentMeta.get() };
}
