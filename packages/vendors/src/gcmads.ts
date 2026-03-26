import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ADS } from './utils/purposes';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

const GCMAds: Vendor = {
  name: 'Google Ads (Personnalisés)',
  category: 'Publicité',
  description: 'Active la personnalisation des publicités via Google Consent Mode.',
  ...PURPOSE_ADS,
  requireConsent: true,
  init: () => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_personalization: 'granted',
        ad_user_data: 'granted',
      });
    }
  },
};

export default GCMAds;
