import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type HotjarConfig = {
  siteId: string;
};

const Hotjar: Vendor<HotjarConfig> = {
  name: 'Hotjar',
  category: 'Analytics',
  description:
    "Cartes de chaleur, enregistrements de sessions et sondages pour optimiser l'expérience utilisateur.",
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: [
    '_hj',
    '_hjSession',
    '_hjSessionUser',
    '_hjid',
    '_hjFirstSeen',
    '_hjAbsoluteSessionInProgress',
    '_hjIncludedInSessionSample',
  ],
  init: (config: HotjarConfig) => {
    if (!config?.siteId) return;

    (function (h: any, o: Document, t: string, j: string) {
      h.hj =
        h.hj ||
        function (...args: any[]) {
          (h.hj.q = h.hj.q || []).push(args);
        };
      h._hjSettings = { hjid: config.siteId, hjsv: 6 };
      const a = o.getElementsByTagName('head')[0];
      const r = o.createElement('script') as HTMLScriptElement;
      r.async = true;
      r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
      a.appendChild(r);
    })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');
  },
};

export default Hotjar;
