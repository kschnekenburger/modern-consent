import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type AmplitudeConfig = {
  apiKey: string;
};

const Amplitude: Vendor<AmplitudeConfig> = {
  name: 'Amplitude',
  category: 'Analytics',
  description: 'Analyse produit : événements, funnels, cohortes et rétention utilisateur.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['amp_', 'AMP_unsent'],
  init: (config: AmplitudeConfig) => {
    if (!config?.apiKey) return;

    loadScript('https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz').then(() => {
      if ((window as any).amplitude) {
        (window as any).amplitude.init(config.apiKey);
      }
    });
  },
};

export default Amplitude;
