import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type SentryConfig = {
  dsn: string;
  /** Sentry JS SDK version (default: '8') */
  version?: string;
};

const Sentry: Vendor<SentryConfig> = {
  name: 'Sentry',
  category: 'Analytics',
  description: 'Surveillance des erreurs et suivi des performances applicatives.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  init: (config: SentryConfig) => {
    if (!config?.dsn) return;

    const version = config.version ?? '8';
    loadScript(`https://browser.sentry-cdn.com/${version}/bundle.min.js`, undefined, {
      crossorigin: 'anonymous',
    }).then(() => {
      if ((window as any).Sentry) {
        (window as any).Sentry.init({ dsn: config.dsn });
      }
    });
  },
};

export default Sentry;
