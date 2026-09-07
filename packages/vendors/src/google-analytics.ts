import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { ensureGtag } from './utils/gtag';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type GoogleAnalyticsConfig = {
  measurementId: string; // G-XXXXXXXX
};

const GoogleAnalytics: Vendor<GoogleAnalyticsConfig> = {
  name: 'Google Analytics',
  category: 'Analytics',
  description: "Mesure l'audience et le comportement des visiteurs.",
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  // Consent Mode v2: the core grants analytics_storage while GA has consent.
  gcm: ['analytics_storage'],
  artifacts: (config: GoogleAnalyticsConfig) => {
    const streamCookie = config?.measurementId
      ? `_ga_${config.measurementId.replace(/^G-/i, '')}`
      : undefined;
    return ['_ga', '_gid', '_gat', ...(streamCookie ? [streamCookie] : [])];
  },
  setup: () => {
    // Shared stub + timestamp only. The `config` command is deferred to init() so the
    // tag never fires before consent, even when gtag.js is already on the page.
    const gtag = ensureGtag();
    gtag('js', new Date());
  },
  init: (config: GoogleAnalyticsConfig) => {
    if (!config?.measurementId) return;
    const gtag = ensureGtag();
    gtag('config', config.measurementId);
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`);
  },
};

export default GoogleAnalytics;
