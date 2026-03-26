import { consentState, hasAnswered, isPanelOpen, servicesList } from './state';
import { resolveVendor } from './resolver';
import type { McConfig } from './layer';

declare global {
  interface Window {
    _modernConsentConfig: McConfig;
  }
}

export type VendorConfig = unknown;

export interface Vendor<TConfig = void> {
  name: string;
  description: string;
  category: string;
  /**
   * Human-readable label for the purpose/category in 'purpose' displayMode.
   * Can be a string or a Record<lang, string> for i18n support.
   * @example purposeLabel: { fr: "Mesure d'audience", en: "Audience measurement" }
   */
  purposeLabel?: string | Record<string, string>;
  /**
   * Description for the purpose/category in 'purpose' displayMode.
   * Can be a string or a Record<lang, string> for i18n support.
   */
  purposeDescription?: string | Record<string, string>;
  setup?: (config: TConfig) => void;
  domSelector?: string;
  init?: (config: TConfig) => void;
  /** Cookie names set by this vendor — cleared when consent is revoked. */
  artifacts?: string[] | ((config: TConfig) => string[]);
  render?: (dataset: DOMStringMap) => string;
  requireConsent: boolean;
  event?: {
    name: string;
    callback: () => void;
  }[];
  link?: {
    vendor: string;
    /** Config passed to the linked vendor. Defaults to {} if omitted. */
    config?: VendorConfig;
    condition: (params: { vendorConfig: any; consentConfig: any }) => boolean;
  }[];
}

export type VendorLoader = () => Promise<Vendor<any>>;

const loaders = new Map<string, VendorLoader>();
const loadedVendors = new Map<string, Vendor<VendorConfig>>();
const vendorsConfig = new Map<string, VendorConfig>();

// Re-export resolveVendor from resolver.ts for backward compatibility
export { resolveVendor } from './resolver';

/** @internal — test helper only */
export function __resetRegistry() {
  loaders.clear();
  loadedVendors.clear();
  vendorsConfig.clear();
}

/**
 * Clears all cookies declared in vendor.artifacts.
 * Called before reload or on denyAll to clean up vendor-set cookies.
 */
export function clearVendorArtifacts(id: string): void {
  const vendor = loadedVendors.get(id);
  if (!vendor?.artifacts) return;

  const config = vendorsConfig.get(id);
  const cookieNames =
    typeof vendor.artifacts === 'function' ? vendor.artifacts(config) : vendor.artifacts;

  const domain = window._modernConsentConfig?.cookieDomain;

  cookieNames.forEach(name => {
    document.cookie = `${name}=; max-age=0; path=/`;
    if (domain) {
      document.cookie = `${name}=; max-age=0; path=/; domain=${domain}`;
    }
  });
}

export function registerService(args: {
  id: string;
  category: string;
  loader: VendorLoader;
  config: VendorConfig;
}) {
  const { id, category, loader, config = {} } = args;

  // Prevent double-registration for the same service id
  if (loaders.has(id)) return;
  loaders.set(id, loader);

  loader()
    .then((module: any) => {
      const vendor: Vendor<any> = module.default || module;
      loadedVendors.set(id, vendor);
      if (config !== undefined) {
        vendorsConfig.set(id, config);
      }

      if (vendor?.setup) {
        vendor.setup(config);
      }

      if (vendor?.link && vendor.link.length > 0) {
        vendor.link.forEach(link => {
          if (
            link.condition &&
            !link.condition({ vendorConfig: config, consentConfig: window._modernConsentConfig })
          ) {
            return;
          }
          const linkedLoader = resolveVendor(link.vendor);
          if (linkedLoader) {
            registerService({
              id: link.vendor,
              category,
              config: link.config ?? {},
              loader: linkedLoader,
            });
          } else {
            console.warn(`[modern-consent] Dependency "${link.vendor}" not found for "${id}"`);
          }
        });
      }

      servicesList.update(list => {
        if (list.some(s => s.id === id)) return list;
        return [
          ...list,
          {
            id,
            name: vendor.name,
            description: vendor.description,
            category: vendor.category,
            purposeLabel: vendor.purposeLabel,
            purposeDescription: vendor.purposeDescription,
            loaded: false,
            requireConsent: vendor.requireConsent,
          },
        ];
      });

      checkAutoActivation(id);
    })
    .catch(err => {
      console.error(`[modern-consent] Failed to load vendor "${id}":`, err);
    });
}

/**
 * Vérifie si on doit activer le service ou ouvrir le panel (nouveau service détecté)
 */
function checkAutoActivation(id: string) {
  const vendor = loadedVendors.get(id);

  // Services that don't require consent activate immediately
  if (vendor && !vendor.requireConsent) {
    activateService(id);
    return;
  }

  const currentConsent = consentState.get();
  const answered = hasAnswered.get();

  if (answered && currentConsent[id] === undefined) {
    isPanelOpen.set(true);
  }

  if (currentConsent[id]) {
    activateService(id);
  }
}

/**
 * Active le service (Script + DOM)
 */
export async function activateService(id: string) {
  if (typeof window === 'undefined') return;

  let vendor = loadedVendors.get(id);

  if (!vendor) {
    const loader = loaders.get(id);
    if (loader) {
      const module: any = await loader();
      vendor = module.default || module;
      if (vendor) loadedVendors.set(id, vendor);
    }
  }

  if (!vendor) return;

  const isSoft = window._modernConsentConfig?.consentOnly === true;
  const list = servicesList.get();
  const meta = list.find(s => s.id === id);

  if (!isSoft && vendor.init && meta && !meta.loaded) {
    vendor.init(vendorsConfig.get(id));
    servicesList.update(l => l.map(s => (s.id === id ? { ...s, loaded: true } : s)));

    // Trigger onAccept events after successful activation
    vendor.event?.forEach(ev => {
      if (ev.name === 'onAccept') {
        try {
          ev.callback();
        } catch {
          /* don't let event errors break activation */
        }
      }
    });
  }

  if (!isSoft && vendor.domSelector && vendor.render) {
    setTimeout(() => {
      document.querySelectorAll(vendor!.domSelector!).forEach(el => {
        const htmlElement = el as HTMLElement;
        if (htmlElement.dataset.loaded !== 'true' && vendor?.render) {
          htmlElement.innerHTML = vendor.render(htmlElement.dataset);
          htmlElement.dataset.loaded = 'true';
          htmlElement.classList.remove('mc-placeholder-pending');
        }
      });
    }, 50);
  }
}
