import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type SegmentConfig = {
  writeKey: string;
};

declare global {
  interface Window {
    analytics: any;
  }
}

const Segment: Vendor<SegmentConfig> = {
  name: 'Segment',
  category: 'Analytics',
  description:
    'Plateforme de données client (CDP) qui centralise et route les événements vers vos outils.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['ajs_user_id', 'ajs_anonymous_id', 'ajs_group_id'],
  init: (config: SegmentConfig) => {
    if (!config?.writeKey) return;

    const analytics: any = (window.analytics = window.analytics || []);
    if (analytics.initialize) return;
    if (analytics.invoked) return;
    analytics.invoked = true;
    analytics.methods = [
      'trackSubmit',
      'trackClick',
      'trackLink',
      'trackForm',
      'pageview',
      'identify',
      'reset',
      'group',
      'track',
      'ready',
      'alias',
      'debug',
      'page',
      'screen',
      'once',
      'off',
      'on',
      'addSourceMiddleware',
      'addIntegrationMiddleware',
      'setAnonymousId',
      'addDestinationMiddleware',
    ];
    analytics.factory = function (e: string) {
      return function (...args: any[]) {
        args.unshift(e);
        analytics.push(args);
        return analytics;
      };
    };
    for (let i = 0; i < analytics.methods.length; i++) {
      const key = analytics.methods[i];
      analytics[key] = analytics.factory(key);
    }
    analytics.load = function (key: string) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://cdn.segment.com/analytics.js/v1/${key}/analytics.min.js`;
      document.head.appendChild(script);
    };
    analytics.SNIPPET_VERSION = '5.2.1';
    analytics.load(config.writeKey);
    analytics.page();
  },
};

export default Segment;
