import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type GoogleAnalyticsConfig = {
  measurementId: string; // G-XXXXXXXX
};

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GoogleAnalytics: Vendor<GoogleAnalyticsConfig> = {
  name: 'Google Analytics',
  category: 'Analytics',
  description: "Mesure l'audience et le comportement des visiteurs.",
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  setup: (config: GoogleAnalyticsConfig) => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
    });
    if (config?.measurementId) {
      window.gtag('config', config.measurementId);
    }
  },
  init: (config: GoogleAnalyticsConfig) => {
    if (!config?.measurementId) return;
    loadScript(`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`).then(() => {
      window.gtag?.('consent', 'update', {
        analytics_storage: 'granted',
      });
    });
  },
};

export default GoogleAnalytics;
