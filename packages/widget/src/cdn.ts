/**
 * CDN / standalone bundle entry point.
 *
 * Registers <mc-consent-widget> and auto-mounts it into the page.
 * Users only need:
 *
 *   <script src="mc-widget.js" defer></script>
 */
import './index';

function mount() {
  if (document.querySelector('mc-consent-widget')) return;

  const el = document.createElement('mc-consent-widget');

  // Inherit the page language for i18n (e.g. <html lang="en"> → lang="en")
  const pageLang = document.documentElement.lang?.split('-')[0];
  if (pageLang) el.setAttribute('lang', pageLang);

  document.body.appendChild(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
