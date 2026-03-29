# @modernconsent/widget

Standalone Web Component consent banner and preferences panel. Includes the full [ModernConsent](https://github.com/kschnekenburger/modern-consent) core — just drop a `<script>` tag and you're done.

- **~30 KB** standalone bundle (~8 KB gzip)
- **Shadow DOM** — styles never leak, never broken by your CSS
- **i18n** built-in (fr/en) with slot overrides
- **Themeable** via CSS custom properties
- **ES2017** target — works in Chrome 63+, Firefox 58+, Safari 11.1+
- **adoptedStyleSheets** with automatic `<style>` fallback for older browsers

## Install (CDN)

```html
<!-- 1. Config + vendors (before the script) -->
<script>
  window.mcLayer = window.mcLayer || [];
  window.modernConsent = function () {
    window.mcLayer.push(arguments);
  };

  window.modernConsent('config', {
    cookieName: 'my_consent',
    consentMode: true,
  });

  window.modernConsent('vendor', {
    name: 'google-analytics',
    config: { measurementId: 'G-XXXXXXXXXX' },
  });
</script>

<!-- 2. Load the standalone bundle -->
<script src="https://unpkg.com/@modernconsent/widget/dist/consent.js" defer></script>

<!-- 3. Place the widget -->
<mc-consent-widget lang="fr" style="--mc-primary: #2563eb;"> </mc-consent-widget>

<!-- 4. Re-open preferences -->
<a href="javascript:void(0)" onclick="window.modernConsent.openPanel()"> Cookie settings </a>
```

> Also available on jsDelivr: `https://cdn.jsdelivr.net/npm/@modernconsent/widget/dist/consent.js`

## Slots

Customize the banner text via named slots. If omitted, built-in i18n defaults are used.

```html
<!-- With custom text -->
<mc-consent-widget lang="fr">
  <span slot="title">We respect your privacy</span>
  <span slot="body">This site uses cookies to improve your experience.</span>
</mc-consent-widget>

<!-- With defaults (uses built-in fr/en text) -->
<mc-consent-widget lang="fr"></mc-consent-widget>
```

| Slot    | Default (fr)                     | Default (en)              |
| ------- | -------------------------------- | ------------------------- |
| `title` | Nous respectons votre vie privée | We respect your privacy   |
| `body`  | Ce site utilise des cookies...   | This site uses cookies... |

## Theming

Set CSS custom properties on `<mc-consent-widget>` or any ancestor — they pierce the Shadow DOM:

```html
<mc-consent-widget lang="fr" style="--mc-primary: #2563eb; --mc-radius: 16px;"></mc-consent-widget>
```

| Variable             | Default          | Description                  |
| -------------------- | ---------------- | ---------------------------- |
| `--mc-primary`       | `#111827`        | Primary button background    |
| `--mc-primary-hover` | auto             | Primary hover (auto-derived) |
| `--mc-primary-text`  | `#fff`           | Primary button text          |
| `--mc-radius`        | `12px`           | Modal border radius          |
| `--mc-font`          | `system-ui, ...` | Font family                  |

## Display Modes

### Vendor mode (default)

Individual toggle per vendor, grouped by category:

```javascript
window.modernConsent('config', { displayMode: 'vendor' });
```

### Purpose mode

Toggle per category/purpose (Didomi-style):

```javascript
window.modernConsent('config', {
  displayMode: 'purpose',
  functionalPurpose: true, // mandatory "Site operation" block
});
```

## Languages

Set via the `lang` attribute. Ships with `fr` and `en`:

```html
<mc-consent-widget lang="en"></mc-consent-widget>
```

## Browser Support

| Browser | Minimum version |
| ------- | --------------- |
| Chrome  | 63+             |
| Firefox | 58+             |
| Safari  | 11.1+           |
| Edge    | 79+             |

> Safari < 16.4 uses a `<style>` fallback instead of `adoptedStyleSheets`. No visual difference.

## Related Packages

| Package                                                                          | Description                              |
| -------------------------------------------------------------------------------- | ---------------------------------------- |
| [`@modernconsent/core`](https://www.npmjs.com/package/@modernconsent/core)       | Consent engine (included in this bundle) |
| [`@modernconsent/vendors`](https://www.npmjs.com/package/@modernconsent/vendors) | 24 built-in vendor modules               |

## License

MIT
