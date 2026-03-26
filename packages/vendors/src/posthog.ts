import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ANALYTICS } from './utils/purposes';

type PostHogOption = {
  apiKey: string;
  instance: string;
};

const posthogVendor: Vendor<PostHogOption> = {
  category: 'Analytics',
  name: 'PostHog',
  description: 'PostHog is a product analytics suite, built for the enterprise.',
  ...PURPOSE_ANALYTICS,
  requireConsent: true,
  artifacts: ['ph_phc_', 'ph_'],
  init: (config: PostHogOption) => {
    const localOption = Object.assign(
      {},
      {
        instance: 'https://app.posthog.com',
      },
      config,
    ) as PostHogOption;

    if (!localOption.apiKey) return;

    const script = document.createElement('script');
    script.innerHTML = `
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var u=t.createElement("script");u.type="text/javascript",u.async=!0,u.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(u,r);var c=e;for(void 0!==a?c=e[a]=[]:a="posthog",c.people=c.people||[],c.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},c.people.toString=function(){return c.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "),n=0;n<o.length;n++)g(c,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('${localOption.apiKey}', {api_host: '${localOption.instance}'});
        `;
    document.head.appendChild(script);
  },
};

export default posthogVendor;
