# ModernConsent

A modern, lightweight, modular cookie consent manager (CMP) for the web.

Built as an alternative to monolithic solutions like TarteAuCitron. ModernConsent splits vendors into standalone modules loaded on demand — zero vendor code is bundled unless activated.

- **~20 KB** CDN bundle (core + widget, gzipped ~7 KB)
- **24 built-in vendors** (analytics, ads, support), each lazy-loaded
- **GDPR-compliant** with audit trails, consent versioning and cookie cleanup
- **Google Consent Mode v2** support
- **Web Component UI** (`<mc-consent-widget>`) with Shadow DOM
- **Framework-agnostic** — works with any stack
- **Consent-Only mode** for Tag Manager integration (GTM, TagCommander)
- **Display by vendor or by purpose** (Didomi-style)
- **Themeable** via CSS custom properties

---

## Quick Start

### CDN (simplest)

```html
<!-- 1. Config + vendors (before the library loads) -->
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

  window.modernConsent('vendor', {
    name: 'meta-pixel',
    config: { pixelId: '1234567890' },
  });
</script>

<!-- 2. Load the standalone bundle (core + widget + styles) -->
<script src="https://unpkg.com/@modernconsent/widget/dist/consent.js" defer></script>

<!-- 3. Place the widget in your page -->
<mc-consent-widget lang="fr" style="--mc-primary: #2563eb;">
  <span slot="title">We respect your privacy</span>
  <span slot="body">This site uses cookies to improve your experience.</span>
</mc-consent-widget>

<!-- 4. Re-open preferences link -->
<a href="javascript:void(0)" onclick="window.modernConsent.openPanel()"> Cookie settings </a>
```

> **Note:** The `<mc-consent-widget>` element must be added to your HTML by you.
> The `title` and `body` slots are optional — built-in i18n defaults (fr/en) are used when omitted.

### NPM

```bash
npm install @modernconsent/core @modernconsent/widget @modernconsent/vendors
```

```typescript
import '@modernconsent/widget';
import { useBuiltinVendors } from '@modernconsent/vendors';

useBuiltinVendors();

window.modernConsent('config', {
  cookieName: 'my_consent',
  consentMode: true,
});

window.modernConsent('vendor', {
  name: 'google-analytics',
  config: { measurementId: 'G-XXXXXXXXXX' },
});
```

---

## Configuration

All options are passed via `window.modernConsent('config', { ... })`.

| Option              | Type                                      | Default              | Description                                                               |
| ------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------------------------- |
| `cookieName`        | `string`                                  | `'mc_consent_state'` | Name of the consent cookie                                                |
| `cookieDomain`      | `string`                                  | —                    | Domain for cookie storage (e.g. `.example.com`)                           |
| `consentMode`       | `boolean`                                 | `false`              | Enable Google Consent Mode v2                                             |
| `consentVersion`    | `string`                                  | —                    | Version string for GDPR audit trail. Changing it re-prompts the user      |
| `cdnBase`           | `string`                                  | —                    | Base URL for CDN vendor loading                                           |
| `consentOnly`       | `boolean`                                 | `false`              | Consent-only mode (no vendor `init()` calls). For Tag Manager integration |
| `pushDataLayer`     | `boolean`                                 | `false`              | Also push consent events to `window.dataLayer` (GTM convenience)          |
| `displayMode`       | `'vendor' \| 'purpose'`                   | `'vendor'`           | How the details panel displays controls                                   |
| `functionalPurpose` | `boolean`                                 | `false`              | Show a mandatory "Site operation" block in the details panel              |
| `purposes`          | `Record<string, { label, description? }>` | —                    | Custom purpose labels (fallback for vendors without `purposeLabel`)       |

### Consent Versioning

When `consentVersion` changes, the user is automatically re-prompted:

```javascript
window.modernConsent('config', {
  consentVersion: 'v2', // bump this when your cookie policy changes
});
```

### Consent-Only Mode (Tag Manager)

For GTM or TagCommander users who manage scripts externally:

```javascript
window.modernConsent('config', {
  consentOnly: true, // CMP handles consent + cookie only
  pushDataLayer: true, // optional: push to window.dataLayer for GTM
});
```

The CMP writes consent decisions to cookies and emits events. Your Tag Manager reads the state and decides which tags to fire.

**Integration points:**

```javascript
// Read consent state
window.modernConsent.getConsent();
// → { 'google-analytics': true, 'meta-pixel': false }

// Listen to changes
window.modernConsent.on('consent:update', e => {
  console.log(e.vendor, e.status); // 'google-analytics', 'granted'
});

// consentLayer (always active, TMS-agnostic)
window.consentLayer;
// → [{ event: 'consent_update', consent_state: { ... } }]

// dataLayer (opt-in via pushDataLayer: true)
window.dataLayer;
// → [{ event: 'consent_update', consent_state: { ... } }]
```

---

## Display Modes

### Vendor mode (default)

Individual toggle per vendor, grouped by category:

```javascript
window.modernConsent('config', { displayMode: 'vendor' });
```

### Purpose mode

Toggle per category/purpose. Vendors are listed below each category without individual toggles:

```javascript
window.modernConsent('config', {
  displayMode: 'purpose',
  functionalPurpose: true, // shows mandatory "Site operation" block
});
```

Purpose labels and descriptions come from the built-in vendors automatically (with fr/en translations). You can also define custom purpose labels via the `purposes` config as a fallback.

---

## Widget

The `<mc-consent-widget>` element must be placed in your HTML — there is no auto-mount.

### HTML

```html
<!-- Minimal (uses built-in i18n defaults) -->
<mc-consent-widget lang="fr"></mc-consent-widget>

<!-- Custom title, body and primary color -->
<mc-consent-widget lang="fr" style="--mc-primary: #2563eb;">
  <span slot="title">Your title here</span>
  <span slot="body">Your description here.<br />Supports HTML.</span>
</mc-consent-widget>
```

### Slots

| Slot    | Description                                                                      |
| ------- | -------------------------------------------------------------------------------- |
| `title` | Banner title. Defaults to built-in i18n (fr: "Nous respectons votre vie privée") |
| `body`  | Banner body/description. Defaults to built-in i18n text                          |

### Theming (CSS Custom Properties)

Set on `<mc-consent-widget>` or any ancestor — they pierce the Shadow DOM:

| Variable             | Default          | Description                         |
| -------------------- | ---------------- | ----------------------------------- |
| `--mc-primary`       | `#111827`        | Primary button background           |
| `--mc-primary-hover` | auto             | Primary button hover (auto-derived) |
| `--mc-primary-text`  | `#fff`           | Primary button text color           |
| `--mc-radius`        | `12px`           | Modal border radius                 |
| `--mc-font`          | `system-ui, ...` | Font family                         |

### Languages

The widget ships with `fr` and `en` labels. Set via the `lang` attribute:

```html
<mc-consent-widget lang="en"></mc-consent-widget>
```

---

## Registering Vendors

### Built-in vendors

```javascript
window.modernConsent('vendor', {
  name: 'google-analytics',
  config: { measurementId: 'G-XXXXXXXXXX' },
});
```

### Custom inline vendors

```javascript
window.modernConsent('vendor', {
  name: 'my-tracker',
  label: 'My Tracker',
  description: 'Our internal analytics tool.',
  category: 'Analytics',
  requireConsent: true,
  artifacts: ['_mt_id', '_mt_session'],
  setup(config) {
    // Runs immediately at page load (e.g. set consent defaults)
  },
  init(config) {
    // Runs when consent is granted (inject scripts here)
    const script = document.createElement('script');
    script.src = 'https://example.com/tracker.js';
    document.head.appendChild(script);
  },
});
```

### Vendor with no consent required

```javascript
window.modernConsent('vendor', {
  name: 'essential-tool',
  label: 'Essential Tool',
  description: 'Required for site operation.',
  category: 'Functional',
  requireConsent: false,
  init() {
    /* activates immediately */
  },
});
```

---

## Public API

After initialization, `window.modernConsent` exposes:

| Method                 | Returns        | Description                                |
| ---------------------- | -------------- | ------------------------------------------ |
| `('config', options)`  | —              | Merge configuration                        |
| `('vendor', vendor)`   | —              | Register a vendor                          |
| `.openPanel()`         | —              | Open the consent panel                     |
| `.getConsent()`        | `ConsentState` | Get current consent state                  |
| `.on(event, callback)` | `() => void`   | Subscribe to events (returns unsubscriber) |

### Events

```javascript
// Emitted for each vendor consent change
window.modernConsent.on('consent:update', data => {
  // { vendor: 'google-analytics', status: 'granted' | 'denied' }
});

// Emitted when consent is saved (with GDPR audit data)
window.modernConsent.on('consent:saved', data => {
  // { consentId: 'uuid', timestamp: 1234567890, version: 'v1', consent: { ... } }
});
```

---

## Built-in Vendors

All vendors are lazy-loaded — zero code is bundled unless activated. Each vendor includes **fr/en translations** for purpose labels.

<details>
<summary><strong>Analytics (13 vendors)</strong></summary>

| Key                | Name               | Config                                     | Consent          |
| ------------------ | ------------------ | ------------------------------------------ | ---------------- |
| `google-analytics` | Google Analytics   | `measurementId: string`                    | Required         |
| `gtm`              | Google Tag Manager | `containerId: string`                      | Required         |
| `matomo`           | Matomo             | `siteId: string`, `trackerUrl: string`     | Required         |
| `clarity`          | Microsoft Clarity  | `projectId: string`                        | Required         |
| `hotjar`           | Hotjar             | `siteId: string`                           | Required         |
| `hubspot`          | HubSpot            | `portalId: string`                         | Required         |
| `amplitude`        | Amplitude          | `apiKey: string`                           | Required         |
| `piano-analytics`  | Piano Analytics    | `siteId: string`, `collectDomain?: string` | Required         |
| `posthog`          | PostHog            | `apiKey: string`, `instance?: string`      | Required         |
| `sentry`           | Sentry             | `dsn: string`, `version?: string`          | Required         |
| `abtasty`          | AB Tasty           | `accountId: string`                        | Required         |
| `segment`          | Segment            | `writeKey: string`                         | Required         |
| `plausible`        | Plausible          | `domain: string`, `instanceUrl?: string`   | **Not required** |

</details>

<details>
<summary><strong>Advertising (9 vendors)</strong></summary>

| Key                | Name                      | Config                       | Consent  |
| ------------------ | ------------------------- | ---------------------------- | -------- |
| `googleads`        | Google Ads                | `tagId: string`              | Required |
| `gcmads`           | Google Ads (Personalized) | _(auto-linked by googleads)_ | Required |
| `meta-pixel`       | Meta Pixel                | `pixelId: string`            | Required |
| `linkedin-insight` | LinkedIn Insight Tag      | `partnerId: string`          | Required |
| `tiktok-pixel`     | TikTok Pixel              | `pixelId: string`            | Required |
| `criteo`           | Criteo                    | `accountId: string`          | Required |
| `pinterest-pixel`  | Pinterest Tag             | `tagId: string`              | Required |
| `snapchat-pixel`   | Snapchat Pixel            | `pixelId: string`            | Required |
| `reddit-pixel`     | Reddit Pixel              | `pixelId: string`            | Required |

</details>

<details>
<summary><strong>Support (2 vendors)</strong></summary>

| Key         | Name      | Config          | Consent  |
| ----------- | --------- | --------------- | -------- |
| `intercom`  | Intercom  | `appId: string` | Required |
| `smartsupp` | Smartsupp | `key: string`   | Required |

</details>

---

## Cookie Format

The consent cookie stores a JSON object:

```json
{
  "consent": {
    "google-analytics": true,
    "meta-pixel": false
  },
  "answered": true,
  "timestamp": 1711468800000,
  "version": "v1",
  "consentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- `consentId` — unique UUID per consent action (GDPR audit trail)
- `timestamp` — when consent was last given
- `version` — matches `consentVersion` from config

---

## Packages

| Package                  | Description                                      | Size                                      |
| ------------------------ | ------------------------------------------------ | ----------------------------------------- |
| `@modernconsent/core`    | Consent engine, state, events, cookie            | ~14 KB                                    |
| `@modernconsent/widget`  | Web Component UI (`consent.js` = CDN standalone) | ~28 KB (CDN bundle with core, ~8 KB gzip) |
| `@modernconsent/vendors` | 24 built-in vendor modules                       | ~1-2 KB each                              |

---

## Development

```bash
pnpm install
pnpm -r build
pnpm --filter @modernconsent/core test

# Playground
cd packages/playground && pnpm dev
```

---

## License

MIT
