import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ADS } from './utils/purposes';

type PinterestConfig = {
  tagId: string;
};

declare global {
  interface Window {
    pintrk: ((...args: any[]) => void) & { queue?: any[]; version?: string };
  }
}

const PinterestPixel: Vendor<PinterestConfig> = {
  name: 'Pinterest Tag',
  category: 'Publicité',
  description: 'Suivi des conversions et optimisation des campagnes Pinterest.',
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: ['_pinterest_ct_ua', '_pin_unauth', '_derived_epik', '_epik'],
  init: (config: PinterestConfig) => {
    if (!config?.tagId) return;

    if (!window.pintrk) {
      const pintrk: any = (window.pintrk = function (...args: any[]) {
        pintrk.queue.push(args);
      });
      pintrk.queue = [];
      pintrk.version = '3.0';

      loadScript('https://s.pinimg.com/ct/core.js').then(() => {
        window.pintrk('load', config.tagId);
        window.pintrk('page');
      });
    }
  },
};

export default PinterestPixel;
