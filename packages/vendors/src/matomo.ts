import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type MatomoConfig = {
  siteId: string;
  trackerUrl: string;
};

declare global {
  interface Window {
    _paq: any[];
  }
}

const Matomo: Vendor<MatomoConfig> = {
  name: 'Matomo',
  category: 'Analytics',
  description: 'Matomo est une solution d\'analyse web open-source et respectueuse de la vie privée.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['_pk_id', '_pk_ses', '_pk_ref', '_pk_cvar', 'mtm_consent', 'mtm_consent_removed'],
  init: (config: MatomoConfig) => {
    if (!config?.siteId || !config?.trackerUrl) return;

    const trackerUrl = config.trackerUrl.replace(/\/$/, '');
    window._paq = window._paq || [];
    window._paq.push(['trackPageView']);
    window._paq.push(['enableLinkTracking']);
    window._paq.push(['setTrackerUrl', `${trackerUrl}/matomo.php`]);
    window._paq.push(['setSiteId', config.siteId]);

    const script = document.createElement('script');
    script.async = true;
    script.src = `${trackerUrl}/matomo.js`;
    document.head.appendChild(script);
  },
};

export default Matomo;
