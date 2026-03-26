import type { Vendor } from '@modernconsent/core';
import { PURPOSE_SUPPORT } from './utils/purposes';

type SmartsuppConfig = {
  key: string;
};

declare global {
  interface Window {
    smartsupp: any;
    _smartsupp: any;
  }
}

const Smartsupp: Vendor<SmartsuppConfig> = {
  name: 'Smartsupp',
  category: 'Support',
  description: 'Chat en direct avec enregistrement vidéo des visiteurs.',
  ...PURPOSE_SUPPORT,
  requireConsent: true,
  artifacts: ['ssupp.vid', 'ssupp.visits', 'AWSALB'],
  init: (config: SmartsuppConfig) => {
    if (!config?.key) return;

    window._smartsupp = window._smartsupp || {};
    window._smartsupp.key = config.key;

    (function () {
      const s = document.createElement('script') as HTMLScriptElement;
      s.async = true;
      s.src = 'https://www.smartsuppchat.com/loader.js?';
      document.head.appendChild(s);
    })();
  },
};

export default Smartsupp;
