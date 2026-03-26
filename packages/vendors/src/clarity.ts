import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type ClarityConfig = {
  projectId: string;
};

declare global {
  interface Window {
    clarity: (...args: any[]) => void;
  }
}

const Clarity: Vendor<ClarityConfig> = {
  name: 'Microsoft Clarity',
  category: 'Analytics',
  description: 'Enregistrement de sessions et cartes de chaleur pour comprendre le comportement des utilisateurs.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['_clck', '_clsk', 'CLID', 'ANONCHK', 'MR', 'MUID', 'SM'],
  init: (config: ClarityConfig) => {
    if (!config?.projectId) return;

    (function (c: any, l: any, a: any, r: string, i: string) {
      c[a] = c[a] || function (...args: any[]) { (c[a].q = c[a].q || []).push(args); };
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = 'https://www.clarity.ms/tag/' + i;
      const y = l.getElementsByTagName(r)[0] as HTMLScriptElement;
      y.parentNode!.insertBefore(t, y);
    })(window, document, 'clarity', 'script', config.projectId);
  },
};

export default Clarity;
