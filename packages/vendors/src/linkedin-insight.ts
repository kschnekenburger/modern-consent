import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ADS } from './utils/purposes';

type LinkedInConfig = {
  partnerId: string;
};

declare global {
  interface Window {
    _linkedin_data_partner_ids: string[];
    lintrk: ((...args: any[]) => void) & { q?: any[] };
  }
}

const LinkedInInsight: Vendor<LinkedInConfig> = {
  name: 'LinkedIn Insight Tag',
  category: 'Publicité',
  description: 'Suivi des conversions et retargeting pour les campagnes LinkedIn Ads.',
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: [
    'li_sugr',
    'bcookie',
    'lidc',
    'UserMatchHistory',
    'AnalyticsSyncHistory',
    'li_fat_id',
  ],
  init: (config: LinkedInConfig) => {
    if (!config?.partnerId) return;

    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(config.partnerId);

    (function (l: any) {
      if (!l.lintrk) {
        l.lintrk = function (...args: any[]) {
          (l.lintrk.q = l.lintrk.q || []).push(args);
        };
        const s = document.getElementsByTagName('script')[0];
        const b = document.createElement('script') as HTMLScriptElement;
        b.async = true;
        b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
        s.parentNode!.insertBefore(b, s);
      }
    })(window);
  },
};

export default LinkedInInsight;
