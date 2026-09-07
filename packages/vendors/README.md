# @modernconsent/vendors

24 built-in vendor modules for [ModernConsent](https://github.com/kschnekenburger/modern-consent). Each vendor is a small standalone module (1–3 KB) fetched at registration; the third-party script itself is only loaded once the user consents.

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
  artifacts: ['_mt_id', '_mt_session'], // or (config) => string[]
  gcm: ['analytics_storage'], // optional: Google Consent Mode v2 signals
  setup(config) {
    // Runs at page load, before any consent decision
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

Each vendor can implement two hooks and two declarations:

| Member          | When                        | Use case                                                              |
| --------------- | --------------------------- | --------------------------------------------------------------------- |
| `setup(config)` | Immediately at registration | Install stubs / queues (e.g. the shared `gtag` stub)                  |
| `init(config)`  | When consent is granted     | Load scripts, initialize SDKs                                         |
| `artifacts`     | On revocation               | Cookie names to expire (string[] or `(config) => string[]`)           |
| `gcm`           | With `consentMode: true`    | Consent Mode v2 signals the core grants while this vendor has consent |

In **Consent-Only mode** (`consentOnly: true`), `init()` is never called — only `setup()` runs.

### Google Consent Mode v2

Vendors **must not** call `gtag('consent', ...)` themselves. They declare their signals and the core pushes `consent default` / `consent update`:

| Vendor             | `gcm`                                    |
| ------------------ | ---------------------------------------- |
| `google-analytics` | `['analytics_storage']`                  |
| `googleads`        | `['ad_storage']`                         |
| `gcmads`           | `['ad_user_data', 'ad_personalization']` |

gtag-based vendors share one stub via `ensureGtag()` (`src/utils/gtag.ts`). The stub pushes the `arguments` object, as gtag.js ignores commands pushed as plain arrays. The `gtag('config', ID)` command is issued in `init()`, never in `setup()`, so a tag cannot fire before consent even when `gtag.js` is already present on the page.

## Related Packages

| Package                                                                        | Description                               |
| ------------------------------------------------------------------------------ | ----------------------------------------- |
| [`@modernconsent/core`](https://www.npmjs.com/package/@modernconsent/core)     | Consent engine, state, events, cookie     |
| [`@modernconsent/widget`](https://www.npmjs.com/package/@modernconsent/widget) | Web Component UI (banner + details panel) |

## License

MIT
