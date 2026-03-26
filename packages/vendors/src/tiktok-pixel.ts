import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ADS } from './utils/purposes';

type TikTokConfig = {
  pixelId: string;
};

declare global {
  interface Window {
    ttq: any;
    TiktokAnalyticsObject: string;
  }
}

const TikTokPixel: Vendor<TikTokConfig> = {
  name: 'TikTok Pixel',
  category: 'Publicité',
  description: 'Suivi des conversions et optimisation des campagnes publicitaires TikTok.',
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: ['_ttp', 'tt_sessionId', 'tt_pixel_session_index'],
  init: (config: TikTokConfig) => {
    if (!config?.pixelId) return;

    (function (w: any, d: Document, t: string) {
      w.TiktokAnalyticsObject = t;
      const ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (t: any, e: string) {
        t[e] = function (...args: any[]) { t.push([e, ...args]); };
      };
      for (let i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = function (t: string) {
        const e = ttq._i[t] || [];
        for (let n = 0; n < ttq.methods.length; n++) {
          ttq.setAndDefer(e, ttq.methods[n]);
        }
        return e;
      };
      ttq.load = function (e: string, n?: any) {
        const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = i;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        const o = d.createElement('script') as HTMLScriptElement;
        o.async = true;
        o.src = i + '?sdkid=' + e + '&lib=' + t;
        const a = d.getElementsByTagName('script')[0] as HTMLScriptElement;
        a.parentNode!.insertBefore(o, a);
      };
      ttq.load(config.pixelId);
      ttq.page();
    })(window, document, 'ttq');
  },
};

export default TikTokPixel;
