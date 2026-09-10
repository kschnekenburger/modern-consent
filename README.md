# ModernConsent

A modern, lightweight, modular cookie consent manager (CMP) for the web.

Built as an alternative to monolithic solutions like TarteAuCitron. ModernConsent splits vendors into standalone modules: only a tiny vendor definition (1–3 KB, name/description/`setup()`) is fetched at registration, and the third-party script itself is never loaded until the user consents.

- **~32 KB** CDN bundle (core + widget, ~9 KB gzipped)
- **24 built-in vendors** (analytics, ads, support), third-party scripts loaded only on consent
- **GDPR-compliant** with a consistent audit trail (one `consentId` per action, identical in the cookie and in events), consent versioning and cookie cleanup
- **Google Consent Mode v2** handled centrally by the core (`consent default` + derived `consent update`)
- **Consent replay on every page load** — Tag Managers receive `consent_update` again, so tags can re-fire without a new user action
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

| Option                | Type                                                | Default              | Description                                                                 |
| --------------------- | --------------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `cookieName`          | `string`                                            | `'mc_consent_state'` | Name of the consent cookie                                                  |
| `cookieDomain`        | `string`                                            | —                    | Domain for cookie storage (e.g. `.example.com`)                             |
| `consentMode`         | `boolean`                                           | `false`              | Enable Google Consent Mode v2 (see below)                                   |
| `consentModeDefaults` | `Partial<Record<GcmSignal, 'granted' \| 'denied'>>` | —                    | Overrides for the `consent default` command (e.g. grant `security_storage`) |
| `consentVersion`      | `string`                                            | —                    | Version string for GDPR audit trail. Changing it re-prompts the user        |
| `cdnBase`             | `string`                                            | —                    | Base URL for CDN vendor loading                                             |
| `consentOnly`         | `boolean`                                           | `false`              | Consent-only mode (no vendor `init()` calls). For Tag Manager integration   |
| `pushDataLayer`       | `boolean`                                           | `false`              | Also push consent events to `window.dataLayer` (GTM convenience)            |
| `displayMode`         | `'vendor' \| 'purpose'`                             | `'vendor'`           | How the details panel displays controls                                     |
| `functionalPurpose`   | `boolean`                                           | `false`              | Show a mandatory "Site operation" block in the details panel                |
| `purposes`            | `Record<string, { label, description? }>`           | —                    | Custom purpose labels (fallback for vendors without `purposeLabel`)         |
| `embedded`            | `boolean`                                           | `false`              | Headless mode for iframes: consent is pushed by the host page (see below)   |

### Consent Versioning

When `consentVersion` changes, the user is automatically re-prompted:

```javascript
window.modernConsent('config', {
  consentVersion: 'v2', // bump this when your cookie policy changes
});
```

### Google Consent Mode v2

With `consentMode: true`, the core owns the whole gtag consent lifecycle — vendors only declare which signals they depend on:

1. As soon as the flag is read from the queue, the core installs the shared `gtag` stub and pushes **one** `consent default` with the four v2 signals denied (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`). Use `consentModeDefaults` to override (e.g. grant `security_storage`).
2. Each vendor declares `gcm: [...]` (built-ins: `google-analytics` → `analytics_storage`, `googleads` → `ad_storage`, `gcmads` → `ad_user_data` + `ad_personalization`).
3. A signal is **granted** when at least one vendor declaring it has consent, **denied** otherwise. The core pushes `consent update` whenever the derived state changes: on a user decision, when a vendor module loads with a stored consent, and on page reload.

```javascript
window.modernConsent('config', {
  consentMode: true,
  consentModeDefaults: { security_storage: 'granted' }, // optional
});

// Custom vendor participating in Consent Mode
window.modernConsent('vendor', {
  name: 'my-google-tag',
  gcm: ['analytics_storage'],
  init() {
    /* load gtag.js */
  },
});
```

The derived state is also exposed as `gcm` on `consent:saved`, `consent:restored` and on the `consent_update` data layer event.

### Consent-Only Mode (Tag Manager)

For GTM or TagCommander users who manage scripts externally:

```javascript
window.modernConsent('config', {
  consentOnly: true, // CMP handles consent + cookie only
  pushDataLayer: true, // optional: push to window.dataLayer for GTM
});
```

The CMP writes consent decisions to cookies and emits events. Your Tag Manager reads the state and decides which tags to fire.

**Consent is replayed on every page load.** When a valid stored consent exists (answered, and `consentVersion` unchanged), the core pushes the same `consent_update` event to `consentLayer` / `dataLayer` during initialization, with `consent_source: 'restore'`. Tags configured to fire on `consent_update` therefore re-fire on each page without a new user action.

**Integration points:**

```javascript
// Read consent state
window.modernConsent.getConsent();
// → { 'google-analytics': true, 'meta-pixel': false }

// Read consent + audit metadata (as persisted in the cookie)
window.modernConsent.getConsentRecord();
// → { consent: {...}, answered: true, consentId: 'uuid', timestamp: 1711468800000, version: 'v1' }

// Write consent programmatically (one action: one consentId, one cookie write, one `consent:saved`)
window.modernConsent.setConsent('google-analytics', true);

// Listen to changes
window.modernConsent.on('consent:update', e => {
  console.log(e.vendor, e.status); // 'google-analytics', 'granted'
});

// consentLayer (always active, TMS-agnostic)
window.consentLayer;
// → [{ event: 'consent_update', consent_state: { ... }, consent_id, consent_timestamp,
//      consent_version, consent_source: 'user' | 'restore' | 'external', gcm? }]

// dataLayer (opt-in via pushDataLayer: true) — same events
window.dataLayer;
```

> Listeners registered with `.on()` after the library has initialized will not receive the `consent:restored` event of the current page — read `getConsentRecord()` (or the `consentLayer` array) for the initial state instead.

### Reading consent from a third-party script (`ready`)

Before `consent.js` has loaded, `window.modernConsent` is only the queue stub: `.getConsentRecord()` and `.on()` do not exist yet. A script that cannot know whether the CMP is already up (a widget, an iframe bridge, a tag) should use the `ready` command. It is queue-safe and runs the callback with the live API — immediately if the core is already initialised, otherwise right after it initialises:

```javascript
window.modernConsent('ready', mc => {
  const record = mc.getConsentRecord();
  if (record.answered) sync(record); // current state (cookie or decision taken earlier in the page)
  mc.on('consent:saved', sync); // every later decision, with the full state
});
```

This covers every ordering: cookie restored at load, user deciding after the script ran, or user having decided before the script ran.

### Embedded mode (iframes)

When your page is embedded in a partner site, the partner's CMP collects the consent — your page must not prompt again, must not write its own consent cookie (third-party context, and the host is the controller of record) and must not reload under the user's feet. Turn on `embedded` and push the host's decisions:

```javascript
// In the embedded page
window.modernConsent('config', {
  embedded: true,
  consentMode: true, // Consent Mode, data layer pushes and events keep working
  pushDataLayer: true,
});

// Whenever the host sends its consent (postMessage, bridge…). Queue-safe: works before consent.js loads.
window.modernConsent('consent', {
  consent: { 'google-analytics': true, 'meta-pixel': false },
  consentId: '550e8400-…', // optional: kept as-is so both pages share the audit id
  timestamp: 1711468800000,
  version: 'v1',
});
```

`consent` (and `setConsentRecord()` on the live API) takes the **full** state: vendors missing from the snapshot are revoked. Only vendors whose status changes are touched, so re-sending the same snapshot is a no-op — no event, no new `consentId`. Data layer events are pushed with `consent_source: 'external'`.

On the host side, if the host also runs ModernConsent, `ready` + `getConsentRecord()` + `consent:saved` give you everything to forward:

```javascript
// In the host page
window.modernConsent('ready', mc => {
  const send = record => iframeBridge.send(record); // your transport
  const record = mc.getConsentRecord();
  if (record.answered) send(record);
  mc.on('consent:saved', send);
});
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

| Variable             | Default          | Description                                                     |
| -------------------- | ---------------- | --------------------------------------------------------------- |
| `--mc-primary`       | `#111827`        | Primary button background                                       |
| `--mc-primary-hover` | auto             | Primary button hover (auto-derived)                             |
| `--mc-primary-text`  | `#fff`           | Primary button text color                                       |
| `--mc-radius`        | `12px`           | Modal border radius                                             |
| `--mc-font`          | `system-ui, ...` | Font family                                                     |
| `--mc-font-size`     | `15px`           | Type-scale base — every text size in the widget derives from it |

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
  artifacts: ['_mt_id', '_mt_session'], // or (config) => string[]
  gcm: ['analytics_storage'], // optional: Consent Mode v2 signals (see above)
  setup(config) {
    // Runs immediately at page load (before any consent decision)
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

| Method                      | Returns         | Description                                                             |
| --------------------------- | --------------- | ----------------------------------------------------------------------- |
| `('config', options)`       | —               | Merge configuration                                                     |
| `('vendor', vendor)`        | —               | Register a vendor                                                       |
| `('ready', cb)`             | —               | Run `cb(api)` once the core is initialised (immediately if it is)       |
| `('consent', record)`       | —               | Apply a consent snapshot from another page (same as `setConsentRecord`) |
| `.openPanel()`              | —               | Open the consent panel                                                  |
| `.getConsent()`             | `ConsentState`  | Get current consent state                                               |
| `.getConsentRecord()`       | `ConsentRecord` | Consent + `consentId`, `timestamp`, `version`                           |
| `.setConsent(id, ok)`       | —               | Grant or revoke one vendor programmatically                             |
| `.setConsentRecord(record)` | —               | Apply a full snapshot (idempotent, keeps the given `consentId`)         |
| `.on(event, callback)`      | `() => void`    | Subscribe to events (returns unsubscriber)                              |

The four commands (`config`, `vendor`, `ready`, `consent`) can be called through the queue stub before the library loads; the dot methods only exist on the live API.

From the npm package, `setConsent(id, allowed)`, `setConsentBatch({ id: allowed, ... })`, `setConsentRecord(record)`, `acceptAll()` and `denyAll()` are also exported. Every one of them is **one action**: one `consentId`, one cookie write, one `consent:saved`, at most one page reload.

### Events

```javascript
// Emitted for each vendor whose status changed in an action
window.modernConsent.on('consent:update', data => {
  // { vendor: 'google-analytics', status: 'granted' | 'denied', gcm? }
});

// Emitted once per user action (with GDPR audit data — same consentId as the cookie)
window.modernConsent.on('consent:saved', data => {
  // { consentId: 'uuid', timestamp: 1234567890, version: 'v1', consent: { ... }, gcm? }
});

// Emitted at page load when a stored, still-valid consent is replayed
window.modernConsent.on('consent:restored', data => {
  // { consentId?, timestamp?, version?, consent: { ... }, gcm? }
});
```

---

## Built-in Vendors

Vendor definitions are small standalone modules (1–3 KB) fetched at registration; the third-party script is only loaded once the user consents. Each vendor includes **fr/en translations** for purpose labels.

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

- `consentId` — unique UUID per consent action (GDPR audit trail). The same value is emitted in `consent:saved` and in the `consent_update` data layer event.
- `timestamp` — when consent was last given
- `version` — matches `consentVersion` from config

Revoking a vendor expires its declared `artifacts` cookies for the host, the configured `cookieDomain` and every suffix of the current hostname (e.g. `.www.example.com`, `.example.com`), so cookies set on the eTLD+1 by tags such as GA are removed as well.

---

## Packages

| Package                  | Description                                      | Size                                      |
| ------------------------ | ------------------------------------------------ | ----------------------------------------- |
| `@modernconsent/core`    | Consent engine, state, events, cookie, GCM v2    | ~19 KB (~5 KB gzip)                       |
| `@modernconsent/widget`  | Web Component UI (`consent.js` = CDN standalone) | ~32 KB (CDN bundle with core, ~9 KB gzip) |
| `@modernconsent/vendors` | 24 built-in vendor modules                       | ~1-3 KB each                              |

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
