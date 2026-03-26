import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type PlausibleConfig = {
  /** Your site domain as registered in Plausible (e.g. 'example.com') */
  domain: string;
  /** Custom Plausible instance URL (default: 'https://plausible.io') */
  instanceUrl?: string;
};

const Plausible: Vendor<PlausibleConfig> = {
  name: 'Plausible',
  category: 'Analytics',
  description: 'Analytics léger et respectueux de la vie privée, sans cookies.',
  ...PURPOSE_ANALYTICS,
  /** Plausible is cookieless and privacy-first — no consent required by default. */
  requireConsent: false,
  init: (config: PlausibleConfig) => {
    if (!config?.domain) return;
    const base = (config.instanceUrl ?? 'https://plausible.io').replace(/\/$/, '');
    loadScript(`${base}/js/script.js`, undefined, {
      'data-domain': config.domain,
      defer: 'defer',
    });
  },
};

export default Plausible;
