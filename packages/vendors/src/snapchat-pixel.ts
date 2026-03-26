import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ADS } from './utils/purposes';

type SnapchatConfig = {
  pixelId: string;
};

declare global {
  interface Window {
    snaptr: ((...args: any[]) => void) & { _: any[] };
  }
}

const SnapchatPixel: Vendor<SnapchatConfig> = {
  name: 'Snapchat Pixel',
  category: 'Publicité',
  description: 'Suivi des conversions et optimisation des campagnes Snapchat Ads.',
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: ['_scid', '_scid_r', 'sc_at', '_sctr'],
  init: (config: SnapchatConfig) => {
    if (!config?.pixelId) return;

    (function (e: any, t: Document) {
      if (e.snaptr) return;
      const a: any = (e.snaptr = function (...args: any[]) {
        if (a.handleRequest) {
          a.handleRequest(...args);
        } else {
          a.queue.push(args);
        }
      });
      a.queue = [];
      const s = t.createElement('script') as HTMLScriptElement;
      s.async = true;
      s.src = 'https://sc-static.net/scevent.min.js';
      const r = t.getElementsByTagName('script')[0] as HTMLScriptElement;
      r.parentNode!.insertBefore(s, r);
    })(window, document);

    window.snaptr('init', config.pixelId);
    window.snaptr('track', 'PAGE_VIEW');
  },
};

export default SnapchatPixel;
