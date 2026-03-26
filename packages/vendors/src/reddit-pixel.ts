import type {Vendor} from '@modernconsent/core';
import {loadScript} from './utils/loader';
import {PURPOSE_ADS} from './utils/purposes';

type RedditConfig = {
    pixelId: string;
};

declare global {
    interface Window {
        rdt: ((...args: any[]) => void) & { sendEvent?: any; callQueue?: any[] };
    }
}

const RedditPixel: Vendor<RedditConfig> = {
    name: 'Reddit Pixel',
    category: 'Publicité',
    description: 'Suivi des conversions et optimisation des campagnes Reddit Ads.',
    ...PURPOSE_ADS,
    requireConsent: true,
    artifacts: ['_rdt_uuid'],
    init: (config: RedditConfig) => {
        if (!config?.pixelId) return;

        if (!window.rdt) {
            const rdt: any = window.rdt = function (...args: any[]) {
                if (rdt.sendEvent) {
                    rdt.sendEvent(...args);
                } else {
                    rdt.callQueue.push(args);
                }
            };
            rdt.callQueue = [];

            loadScript('https://www.redditstatic.com/ads/pixel.js').then(() => {
                window.rdt('init', config.pixelId);
                window.rdt('track', 'PageVisit');
            });
        }
    },
};

export default RedditPixel;
