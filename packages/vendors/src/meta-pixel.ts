import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ADS } from './utils/purposes';

type MetaPixelConfig = {
  pixelId: string;
};

declare global {
  interface Window {
    fbq: ((...args: any[]) => void) & {
      callMethod?: (...args: any[]) => void;
      queue?: any[];
      loaded?: boolean;
      version?: string;
    };
    _fbq: Window['fbq'];
  }
}

const MetaPixel: Vendor<MetaPixelConfig> = {
  name: 'Meta Pixel',
  category: 'Publicité',
  description: 'Mesure les conversions et personnalise les publicités Facebook/Instagram.',
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: ['_fbp', '_fbc'],
  init: (config: MetaPixelConfig) => {
    if (!config?.pixelId) return;

    const fbq: Window['fbq'] = function (...args: any[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue!.push(args);
      }
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    window.fbq = fbq;
    window._fbq = fbq;

    fbq('init', config.pixelId);
    fbq('track', 'PageView');

    loadScript('https://connect.facebook.net/en_US/fbevents.js');
  },
};

export default MetaPixel;
