import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type GTMConfig = {
  containerId: string; // GTM-XXXXXXX
};

declare global {
  interface Window {
    dataLayer: any[];
  }
}

const GTM: Vendor<GTMConfig> = {
  name: 'Google Tag Manager',
  category: 'Analytics',
  description: 'Gestionnaire de balises permettant de déployer et gérer des scripts tiers.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  init: (config: GTMConfig) => {
    if (!config?.containerId) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js',
    });

    loadScript(`https://www.googletagmanager.com/gtm.js?id=${config.containerId}`);
  },
};

export default GTM;
