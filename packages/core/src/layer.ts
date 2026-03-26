import { registerService } from './registry';
import { addResolver, resolveVendor } from './resolver';
import { consentState, initState, isPanelOpen } from './state';
import type { ConsentState } from './state';
import type { Vendor } from './registry';
import { emitter } from './emitter';

/**
 * Command can add in config
 */
const validCommands = ['config', 'vendor'] as const;

export interface McConfig {
  cookieDomain?: string;
  cookieName?: string;
  consentMode?: boolean;
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
  artifacts?: string[];
}

export type ConfigCommand = ['config', McConfig];
export type VendorCommand = ['vendor', McVendor];
export type McCommand = ConfigCommand | VendorCommand;

type McAPI = {
  (...args: McCommand): void;
  openPanel: () => void;
  getConsent: () => ConsentState;
  on: typeof emitter.on;
};

declare global {
  interface Window {
    _modernConsentConfig: McConfig;
    mcLayer: McCommand[];
    modernConsent: McAPI;
  }
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
  } = event;

  let loader: import('./registry').VendorLoader;

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
 */
export function initMcLayer() {
  if (typeof window === 'undefined') return;

  const w = window;
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

  // Process the existing queue — config commands accumulate before vendors are registered
  existingQueue.forEach((args: McCommand) => {
    const [command, payload] = args;

    if (!validCommands.includes(command as any)) {
      console.warn(`[modern-consent] "${command}" is not a valid command`);
      return;
    }

    if (command === 'config') {
      w._modernConsentConfig = { ...w._modernConsentConfig, ...(payload as McConfig) };
      return;
    }

    handleVendor(payload as McVendor);
  });

  // State is initialised once after config is fully resolved from the queue
  initState(w._modernConsentConfig);

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
      w._modernConsentConfig = { ...w._modernConsentConfig, ...(payload as McConfig) };
    }

    if (!Array.isArray(w.mcLayer)) w.mcLayer = [];
    w.mcLayer.push(args);
  };

  w.modernConsent = Object.assign(apiFn, {
    openPanel: () => isPanelOpen.set(true),
    getConsent: () => consentState.get(),
    on: emitter.on.bind(emitter),
  });
}
