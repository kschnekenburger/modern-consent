/**
 * Built-in vendor loaders — opt-in registration via useBuiltinVendors().
 *
 * NPM users call this function to register a resolver for all built-in
 * vendors. Each vendor is lazy-loaded via dynamic import — zero vendor
 * code is included unless the vendor is actually activated.
 *
 * @example
 * import { useBuiltinVendors } from '@modernconsent/vendors';
 * useBuiltinVendors();
 *
 * @example Cherry-pick a single vendor instead:
 * import { addResolver } from '@modernconsent/core';
 * import GA from '@modernconsent/vendors/google-analytics';
 * addResolver((name) => name === 'google-analytics' ? async () => GA : undefined);
 */
import { addResolver } from '@modernconsent/core';

const BUILTIN_LOADERS: Record<string, () => Promise<any>> = {
  // Analytics
  'google-analytics': () => import('./google-analytics'),
  matomo: () => import('./matomo'),
  clarity: () => import('./clarity'),
  hotjar: () => import('./hotjar'),
  hubspot: () => import('./hubspot'),
  amplitude: () => import('./amplitude'),
  'piano-analytics': () => import('./piano-analytics'),
  posthog: () => import('./posthog'),
  sentry: () => import('./sentry'),
  abtasty: () => import('./abtasty'),
  gtm: () => import('./gtm'),
  segment: () => import('./segment'),
  plausible: () => import('./plausible'),

  // Advertising
  googleads: () => import('./googleads'),
  gcmads: () => import('./gcmads'),
  'meta-pixel': () => import('./meta-pixel'),
  'linkedin-insight': () => import('./linkedin-insight'),
  'tiktok-pixel': () => import('./tiktok-pixel'),
  criteo: () => import('./criteo'),
  'pinterest-pixel': () => import('./pinterest-pixel'),
  'snapchat-pixel': () => import('./snapchat-pixel'),
  'reddit-pixel': () => import('./reddit-pixel'),

  // Support
  intercom: () => import('./intercom'),
  smartsupp: () => import('./smartsupp'),
};

/**
 * Registers a resolver for all built-in vendors.
 * Vendors are loaded lazily — only when activated by user consent.
 *
 * @returns A cleanup function that removes the resolver.
 */
export function useBuiltinVendors(): () => void {
  return addResolver(name => {
    const factory = BUILTIN_LOADERS[name];
    if (!factory) return undefined;
    return async () => {
      const mod = await factory();
      return mod.default ?? mod;
    };
  });
}
