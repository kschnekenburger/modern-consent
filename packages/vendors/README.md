# @modernconsent/vendors

24 built-in vendor modules for [ModernConsent](https://github.com/kschnekenburger/modern-consent). Each vendor is lazy-loaded on demand — zero vendor code is bundled unless activated.

All vendors include **fr/en translations** for purpose labels (used in `displayMode: 'purpose'`).

## Install

```bash
npm install @modernconsent/vendors
```

## Usage

### With npm (recommended)

```typescript
import { useBuiltinVendors } from '@modernconsent/vendors';

useBuiltinVendors();

window.modernConsent('vendor', {
  name: 'google-analytics',
  config: { measurementId: 'G-XXXXXXXXXX' },
});
```

### With CDN

Host vendor files on your CDN and set `cdnBase`:

```javascript
window.modernConsent('config', {
  cdnBase: 'https://cdn.example.com/mc-vendors',
});

// Fetches https://cdn.example.com/mc-vendors/google-analytics.js
window.modernConsent('vendor', {
  name: 'google-analytics',
  config: { measurementId: 'G-XXXXXXXXXX' },
});
```

## Built-in Vendors

<details open>
<summary><strong>Analytics (13)</strong></summary>

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

<details open>
<summary><strong>Advertising (9)</strong></summary>

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

<details open>
<summary><strong>Support (2)</strong></summary>

| Key         | Name      | Config          | Consent  |
| ----------- | --------- | --------------- | -------- |
| `intercom`  | Intercom  | `appId: string` | Required |
| `smartsupp` | Smartsupp | `key: string`   | Required |

</details>

## Custom Vendors

You don't need this package for custom vendors. Register them inline:

```javascript
window.modernConsent('vendor', {
  name: 'my-tracker',
  label: 'My Tracker',
  description: 'Our internal analytics tool.',
  category: 'Analytics',
  requireConsent: true,
  artifacts: ['_mt_id', '_mt_session'],
  setup(config) {
    // Runs at page load (e.g. set consent defaults)
  },
  init(config) {
    // Runs when consent is granted
    const s = document.createElement('script');
    s.src = 'https://example.com/tracker.js';
    document.head.appendChild(s);
  },
});
```

## Vendor Lifecycle

Each vendor can implement two hooks:

| Hook            | When                        | Use case                                                       |
| --------------- | --------------------------- | -------------------------------------------------------------- |
| `setup(config)` | Immediately at registration | Set consent defaults (e.g. Google Consent Mode `default deny`) |
| `init(config)`  | When consent is granted     | Load scripts, initialize SDKs                                  |

In **Consent-Only mode** (`consentOnly: true`), `init()` is never called — only `setup()` runs.

## Related Packages

| Package                                                                        | Description                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| [`@modernconsent/core`](https://www.npmjs.com/package/@modernconsent/core)     | Consent engine, state, events, cookie     |
| [`@modernconsent/widget`](https://www.npmjs.com/package/@modernconsent/widget) | Web Component UI (banner + details panel) |

## License

MIT
