import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ADS } from './utils/purposes';

type CriteoConfig = {
  accountId: string;
};

declare global {
  interface Window {
    criteo_q: any[];
  }
}

const Criteo: Vendor<CriteoConfig> = {
  name: 'Criteo',
  category: 'Publicité',
  description: 'Reciblage publicitaire et annonces display dynamiques.',
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: ['cto_bundle', 'cto_bidid', 'cto_optout', 'criteo_write_test'],
  init: (config: CriteoConfig) => {
    if (!config?.accountId) return;

    window.criteo_q = window.criteo_q || [];
    window.criteo_q.push(
      { event: 'setAccount', account: config.accountId },
      { event: 'viewPage' },
    );

    loadScript('https://static.criteo.net/js/ld/ld.js', undefined, { async: 'true' });
  },
};

export default Criteo;
