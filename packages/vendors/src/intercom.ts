import type { Vendor } from '@modernconsent/core';
import { PURPOSE_SUPPORT } from './utils/purposes';

type IntercomConfig = {
  appId: string;
};

declare global {
  interface Window {
    Intercom: any;
    intercomSettings: any;
  }
}

const Intercom: Vendor<IntercomConfig> = {
  name: 'Intercom',
  category: 'Support',
  description: 'Messagerie client, chat en direct et base de connaissances.',
  ...PURPOSE_SUPPORT,
  requireConsent: true,
  artifacts: ['intercom-id', 'intercom-session', 'intercom-device-id'],
  init: (config: IntercomConfig) => {
    if (!config?.appId) return;

    window.intercomSettings = { app_id: config.appId };

    (function () {
      const w: any = window;
      const ic = w.Intercom;
      if (typeof ic === 'function') {
        ic('reattach_activator');
        ic('update', w.intercomSettings);
      } else {
        const d = document;
        const i: any = function (...args: any[]) { i.c(args); };
        i.q = [];
        i.c = function (args: any) { i.q.push(args); };
        w.Intercom = i;
        const s = d.createElement('script') as HTMLScriptElement;
        s.async = true;
        s.src = `https://widget.intercom.io/widget/${config.appId}`;
        d.head.appendChild(s);
      }
    })();
  },
};

export default Intercom;
