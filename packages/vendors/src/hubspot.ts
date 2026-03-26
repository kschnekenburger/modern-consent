import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type HubSpotConfig = {
  portalId: string;
};

const HubSpot: Vendor<HubSpotConfig> = {
  name: 'HubSpot',
  category: 'Analytics',
  description: 'Suivi marketing, formulaires et analytics HubSpot.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: [
    '__hssc',
    '__hssrc',
    '__hstc',
    'hubspotutk',
    '__hs_opt_out',
    '__hs_do_not_track',
    '__hs_initial_opt_in',
  ],
  init: (config: HubSpotConfig) => {
    if (!config?.portalId) return;
    loadScript(`https://js.hs-scripts.com/${config.portalId}.js`, undefined, {
      id: 'hs-script-loader',
    });
  },
};

export default HubSpot;
