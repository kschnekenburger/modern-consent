import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type PianoConfig = {
  siteId: string;
  /** Collection domain (e.g. 'logs.example.com'). Defaults to Piano's default. */
  collectDomain?: string;
};

const PianoAnalytics: Vendor<PianoConfig> = {
  name: 'Piano Analytics',
  category: 'Analytics',
  description:
    "Solution européenne de mesure d'audience et d'analyse comportementale (ex AT Internet).",
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['_pcid', '_pctx', 'pa_user', 'pa_privacy', 'atuserid'],
  init: (config: PianoConfig) => {
    if (!config?.siteId) return;

    loadScript('https://tag.aticdn.net/piano-analytics.js').then(() => {
      if ((window as any).pa) {
        const paConfig: any = { site: config.siteId };
        if (config.collectDomain) {
          paConfig.collectDomain = config.collectDomain;
        }
        (window as any).pa.setConfigurations(paConfig);
        (window as any).pa.sendEvent('page.display', { page: document.title });
      }
    });
  },
};

export default PianoAnalytics;
