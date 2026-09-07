import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { ensureGtag } from './utils/gtag';
import { PURPOSE_ADS } from './utils/purposes';

type GoogleAdsOption = {
  tagId: string;
};

const GoogleAds: Vendor<GoogleAdsOption> = {
  name: 'Google Ads',
  category: 'Publicité',
  description: 'Mesure des conversions publicitaires Google Ads.',
  ...PURPOSE_ADS,
  requireConsent: true,
  // Consent Mode v2: ad_storage follows this vendor; ad_user_data / ad_personalization
  // follow the linked `gcmads` vendor (registered when consentMode is on).
  gcm: ['ad_storage'],
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
      '_gcl_aw',
      '_gcl_gb',
    ];
  },
  setup: () => {
    const gtag = ensureGtag();
    gtag('js', new Date());
  },
  init: (option: GoogleAdsOption) => {
    if (option.tagId === undefined) return;
    const gtag = ensureGtag();
    // Deferred to init() so the conversion tag never fires without ad consent.
    gtag('config', option.tagId);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${option.tagId}`);
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
