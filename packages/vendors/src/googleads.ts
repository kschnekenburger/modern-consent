import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ADS } from './utils/purposes';

type GoogleAdsOption = {
  tagId: string;
};

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GoogleAds: Vendor<GoogleAdsOption> = {
  name: 'Google Ads',
  category: 'Publicité',
  description: "Analyse l'audience du site web.",
  ...PURPOSE_ADS,
  requireConsent: true,
  artifacts: (option: GoogleAdsOption) => {
    let tagUaCookie = '_gat_gtag_' + option.tagId,
      tagGCookie = '_ga_' + option.tagId;
    tagUaCookie = tagUaCookie.replace(/-/g, '_');
    tagGCookie = tagGCookie.replace(/G-/g, '');
    return [
      '_ga',
      '_gat',
      '_gid',
      '__utma',
      '__utmb',
      '__utmc',
      '__utmt',
      '__utmz',
      tagUaCookie,
      tagGCookie,
      '_gcl_au',
    ];
  },
  setup: (option: GoogleAdsOption) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', option.tagId);

    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      analytics_storage: 'denied',
    });
  },
  init: (option: GoogleAdsOption) => {
    if (option.tagId === undefined) return;
    window.dataLayer = window.dataLayer || [];
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${option.tagId}`).then(() => {
      window.gtag?.('consent', 'update', {
        ad_storage: 'granted',
      });
    });
  },
  event: [
    {
      name: 'onAccept',
      callback: () => {
        window.dataLayer.push({
          event: 'modern_consent_accept',
          service: 'google_ads',
        });
      },
    },
  ],
  link: [
    {
      vendor: 'gcmads',
      condition: ({ consentConfig }: { consentConfig: any }) => consentConfig.consentMode === true,
    },
  ],
};

export default GoogleAds;
