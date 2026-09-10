import { registerService } from './registry';
import { addResolver, resolveVendor } from './resolver';
import { consentState, initState, isPanelOpen, getConsentRecord } from './state';
import type { ConsentState, ConsentRecord, ConsentInput } from './state';
import type { Vendor, VendorLoader } from './registry';
import { emitter } from './emitter';
import { initConsentMode } from './gcm';
import type { GcmSignal, GcmState } from './gcm';
import { restoreConsent, setConsent, setConsentRecord } from './consent';

/**
 * Command can add in config
 */
const validCommands = ['config', 'vendor', 'ready', 'consent'] as const;

export interface McConfig {
  cookieDomain?: string;
  cookieName?: string;
  /**
   * Enable Google Consent Mode v2. The core pushes `consent default` (the four v2 signals
   * denied) as soon as this flag is seen, then `consent update` derived from the vendors'
   * `gcm` declarations. Requires a gtag-based vendor (google-analytics, googleads, gtm…).
   */
  consentMode?: boolean;
  /**
   * Overrides for the `consent default` command pushed when `consentMode` is on.
   * @example consentModeDefaults: { functionality_storage: 'granted', security_storage: 'granted' }
   */
  consentModeDefaults?: GcmState;
  /** Version string embedded in the stored consent — used for GDPR audit trails. */
  consentVersion?: string;
  /**
   * Base URL where vendor JS files are hosted.
   * Used by the CDN bundle to lazy-load vendors on demand.
   *
   * @example 'https://cdn.monsite.com/mc-vendors'
   * → window.modernConsent('vendor', { name: 'google-analytics' })
   * → fetches https://cdn.monsite.com/mc-vendors/google-analytics.js
   */
  cdnBase?: string;
  /**
   * In Consent-Only mode, the CMP only manages consent decisions + cookie storage.
   * Vendors are never initialized (no call to init()).
   * Use this to manage vendor scripts externally via a Tag Manager (GTM, TagCommander, etc.).
   *
   * Consent changes are always pushed to `window.consentLayer`.
   * Enable `pushDataLayer` to also push to `window.dataLayer` for native GTM triggers.
   */
  consentOnly?: boolean;
  /**
   * When true, consent changes are also pushed to `window.dataLayer` for native
   * GTM trigger support. Disabled by default — GTM users should enable this.
   */
  pushDataLayer?: boolean;
  /**
   * How the details panel displays consent controls:
   * - 'vendor' (default): individual toggle per vendor, grouped by category
   * - 'purpose': toggle per category/purpose, vendors listed as info below
   */
  displayMode?: 'vendor' | 'purpose';
  /**
   * Custom labels for each purpose/category in 'purpose' displayMode.
   * Keys must match the vendor `category` values.
   *
   * @example
   * purposes: {
   *   analytics: { label: "Analyse de session et mesure d'audience" },
   *   Publicité: { label: "Ciblage Marketing" },
   * }
   */
  purposes?: Record<
    string,
    {
      /** Human-readable label displayed as the purpose title. */
      label: string;
      /** Optional description shown below the purpose title. */
      description?: string;
    }
  >;
  /**
   * When true, displays a "Functional / Site operation" mandatory purpose block
   * at the top of the details panel. This is a visual-only block with no toggle —
   * it informs the user that essential cookies are always active.
   */
  functionalPurpose?: boolean;
  /**
   * Headless mode for a page embedded in an iframe whose consent is collected by the host page.
   * The core never reads nor writes the consent cookie, the widget never shows, revoking a
   * vendor never reloads the page. Consent comes exclusively from the host through
   * `setConsentRecord()` / the `consent` command; events, `consentLayer` / `dataLayer`
   * pushes (`consent_source: 'external'`) and Consent Mode keep working as usual.
   */
  embedded?: boolean;
}

export interface McVendor {
  /**
   * Built-in vendor name (e.g. 'google-analytics') when using npm with
   * built-in loaders, OR a unique ID when providing an inline init().
   */
  name: string;
  /**
   * Category for this vendor (e.g. 'analytics', 'marketing').
   * Optional for built-in vendors — they define their own category.
   * Required for inline vendors (defaults to 'other' if omitted).
   */
  category?: string;
  config?: Record<string, any>;

  // --- Inline vendor definition (CDN users / custom vendors) ---
  /** Human-readable label shown in the consent UI. Defaults to `name`. */
  label?: string;
  /** Short description shown in the consent UI. */
  description?: string;
  /** Whether the user must explicitly consent before this vendor activates. @default true */
  requireConsent?: boolean;
  /** Called immediately at page load (e.g. set consent defaults). */
  setup?: (config?: Record<string, any>) => void;
  /** Called when consent is granted. Inject scripts, pixels, etc. here. */
  init?: (config?: Record<string, any>) => void;
  /** Cookie names written by this vendor — cleared when consent is revoked. */
  artifacts?: string[] | ((config?: Record<string, any>) => string[]);
  /** Google Consent Mode v2 signals granted while this vendor has consent. */
  gcm?: GcmSignal[];
}

export type ConfigCommand = ['config', McConfig];
export type VendorCommand = ['vendor', McVendor];
/**
 * Runs the callback with the live API once the core is initialised — immediately if it
 * already is. Queue-safe: the only reliable way to read state or subscribe to events from a
 * script that may run before `consent.js` has loaded.
 */
export type ReadyCommand = ['ready', (api: McAPI) => void];
/** Applies a consent snapshot decided elsewhere (see `setConsentRecord`). Queue-safe. */
export type ConsentCommand = ['consent', ConsentInput];
export type McCommand = ConfigCommand | VendorCommand | ReadyCommand | ConsentCommand;

export type McAPI = {
  (...args: McCommand): void;
  openPanel: () => void;
  getConsent: () => ConsentState;
  /** Consent + audit metadata (consentId, timestamp, version) as persisted in the cookie. */
  getConsentRecord: () => ConsentRecord;
  /** Grant or revoke one vendor programmatically — one action: one consentId, one cookie write, one `consent:saved`. */
  setConsent: (id: string, allowed: boolean) => void;
  /** Apply a full consent snapshot from another page (iframe host). Idempotent; keeps the given `consentId`. */
  setConsentRecord: (record: ConsentInput) => void;
  on: typeof emitter.on;
  /** @internal marks the live API so a second copy of the core does not re-init. */
  __mc?: true;
};

declare global {
  interface Window {
    _modernConsentConfig: McConfig;
    mcLayer: McCommand[];
    modernConsent: McAPI;
  }
}

function applyConfig(payload: McConfig) {
  window._modernConsentConfig = { ...window._modernConsentConfig, ...payload };
  // Push `consent default` as early as possible — before any vendor setup() runs.
  if (payload.consentMode === true) initConsentMode();
}

function handleVendor(event: McVendor) {
  const {
    name,
    label,
    description = '',
    category = 'other',
    config = {},
    requireConsent = true,
    setup,
    init,
    artifacts,
    gcm,
  } = event;

  let loader: VendorLoader;

  if (init ?? setup) {
    // Inline vendor — CDN users provide their own implementation.
    loader = async () => ({
      name: label ?? name,
      description,
      category,
      requireConsent,
      setup,
      init,
      artifacts,
      gcm,
    });
  } else {
    // Look up via the resolver chain (builtin, CDN, or user-registered resolvers).
    const resolved = resolveVendor(name);
    if (!resolved) {
      console.warn(
        `[modern-consent] Unknown vendor "${name}". ` +
          `Provide an init() function to define a custom vendor.`,
      );
      return;
    }
    loader = resolved;
  }

  registerService({ id: name, category, config, loader });
}

/**
 * Initialise window.mcLayer et traite la queue éventuelle.
 * Idempotent: a second copy of the core (e.g. CDN bundle + npm import) is a no-op.
 */
export function initMcLayer() {
  if (typeof window === 'undefined') return;

  const w = window;
  if (w.modernConsent?.__mc) return;

  const existingQueue = Array.isArray(w.mcLayer) ? [...w.mcLayer] : [];

  w._modernConsentConfig = {};

  // CDN resolver — lowest priority (registered first = LIFO lowest).
  // Returns a loader for any name; cdnBase is checked lazily at activation time.
  addResolver(_name => {
    return async () => {
      const cdnBase = w._modernConsentConfig?.cdnBase;
      if (!cdnBase) {
        throw new Error(
          `[modern-consent] Vendor "${_name}" not found. ` +
            `Configure cdnBase to enable CDN loading, or provide an inline init().`,
        );
      }
      const url = `${cdnBase.replace(/\/$/, '')}/${_name}.js`;
      const mod = await import(/* @vite-ignore */ url);
      return (mod.default ?? mod) as Vendor<any>;
    };
  });

  // `ready` callbacks and `consent` snapshots need the initialized state: they are deferred
  // until config + vendors from the queue have been processed. Only kept the last snapshot.
  const readyCallbacks: Array<(api: McAPI) => void> = [];
  let queuedConsent: ConsentInput | undefined;

  // Process the existing queue — config commands accumulate before vendors are registered
  existingQueue.forEach((args: McCommand) => {
    const [command, payload] = args;

    if (!validCommands.includes(command as any)) {
      console.warn(`[modern-consent] "${command}" is not a valid command`);
      return;
    }

    if (command === 'config') {
      applyConfig(payload as McConfig);
    } else if (command === 'vendor') {
      handleVendor(payload as McVendor);
    } else if (command === 'ready') {
      readyCallbacks.push(payload as (api: McAPI) => void);
    } else if (command === 'consent') {
      queuedConsent = payload as ConsentInput;
    }
  });

  // State is initialised once after config is fully resolved from the queue.
  // If a valid consent is stored, replay it so TMS triggers and GCM fire on every page.
  const { restored } = initState(w._modernConsentConfig);
  if (restored) restoreConsent();
  if (queuedConsent) setConsentRecord(queuedConsent);

  const runReady = (cb: (api: McAPI) => void) => {
    try {
      cb(w.modernConsent);
    } catch (err) {
      console.error('[modern-consent] ready callback failed:', err);
    }
  };

  // Live API
  const apiFn = (...args: McCommand) => {
    const [command, payload] = args;

    if (!validCommands.includes(command as any)) {
      console.warn(`[modern-consent] "${command}" is not a valid command`);
      return;
    }

    if (command === 'vendor') {
      handleVendor(payload as McVendor);
    } else if (command === 'config') {
      applyConfig(payload as McConfig);
    } else if (command === 'ready') {
      runReady(payload as (api: McAPI) => void);
    } else if (command === 'consent') {
      setConsentRecord(payload as ConsentInput);
    }

    if (!Array.isArray(w.mcLayer)) w.mcLayer = [];
    w.mcLayer.push(args);
  };

  w.modernConsent = Object.assign(apiFn, {
    openPanel: () => isPanelOpen.set(true),
    getConsent: () => consentState.get(),
    getConsentRecord: () => getConsentRecord(),
    setConsent: (id: string, allowed: boolean) => setConsent(id, allowed),
    setConsentRecord: (record: ConsentInput) => setConsentRecord(record),
    on: emitter.on.bind(emitter),
    __mc: true as const,
  });

  readyCallbacks.forEach(runReady);
}
