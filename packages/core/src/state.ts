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

interface StoredState {
  consent: ConsentState;
  answered: boolean;
  /** Unix timestamp (ms) of when consent was last given — for GDPR audit trail. */
  timestamp?: number;
  /** Version of the consent banner at the time of consent. */
  version?: string;
  /** Unique identifier per consent action — for GDPR audit trail. */
  consentId?: string;
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
export const servicesList = new Store<ServiceMetadata[]>([]);
export const isPanelOpen = new Store<boolean>(false);
export const openPanel = () => isPanelOpen.set(true);

// Tracked so that calling initState multiple times never stacks duplicate subscribers
let _cookieUnsubs: (() => void)[] = [];

export const initState = (
  config: Pick<import('./layer').McConfig, 'cookieName' | 'cookieDomain' | 'consentVersion'>,
) => {
  const cookieName: string = config?.cookieName || DEFAULT_STORAGE_KEY;
  const cookieDomain: string | undefined = config?.cookieDomain;
  const consentVersion: string | undefined = config?.consentVersion;

  let initialData: StoredState = { consent: {}, answered: false };

  if (typeof window !== 'undefined') {
    const stored = getCookie(cookieName);
    if (stored) {
      try {
        initialData = JSON.parse(stored) as StoredState;
      } catch (e) {
        console.error('[modern-consent] Error parsing consent cookie', e);
      }
    }
  }

  consentState.set(initialData.consent || {});
  hasAnswered.set(initialData.answered || false);

  // Re-prompt when consentVersion changes (GDPR: policy update invalidates prior consent)
  if (initialData.answered && consentVersion && initialData.version !== consentVersion) {
    hasAnswered.set(false);
    isPanelOpen.set(true);
  }

  if (typeof window !== 'undefined') {
    // Clean up previous subscriptions before creating new ones
    _cookieUnsubs.forEach(fn => fn());
    _cookieUnsubs = [];

    const saveToCookie = () => {
      const state: StoredState = {
        consent: consentState.get(),
        answered: hasAnswered.get(),
        timestamp: Date.now(),
        version: consentVersion,
        consentId: generateUUID(),
      };
      setCookie(cookieName, JSON.stringify(state), {
        domain: cookieDomain,
        secure: window.location.protocol === 'https:',
      });
    };

    _cookieUnsubs.push(consentState.subscribe(saveToCookie));
    _cookieUnsubs.push(hasAnswered.subscribe(saveToCookie));
  }
};
