import type { Vendor } from '@modernconsent/core';
import { loadScript } from './utils/loader';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type ABTastyConfig = {
  accountId: string;
};

const ABTasty: Vendor<ABTastyConfig> = {
  name: 'AB Tasty',
  category: 'Analytics',
  description: "A/B testing, feature flagging et personnalisation de l'expérience utilisateur.",
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['ABTasty', 'ABTastySession'],
  init: (config: ABTastyConfig) => {
    if (!config?.accountId) return;
    loadScript(`https://try.abtasty.com/${config.accountId}.js`);
  },
};

export default ABTasty;
