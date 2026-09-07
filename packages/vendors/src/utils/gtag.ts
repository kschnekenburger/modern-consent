declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

/**
 * Ensures `window.dataLayer` and the official `gtag` stub exist, shared by every
 * gtag-based vendor (GA4, Google Ads, …) and by the core's Consent Mode handling.
 *
 * The stub MUST push the `arguments` object, not an array: gtag.js recognises
 * commands by the Arguments type and silently ignores plain arrays.
 */
export function ensureGtag(): (...args: any[]) => void {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
  }
  return window.gtag;
}
