# @modernconsent/core

Lightweight consent engine for the web. Manages consent state, cookie persistence, GDPR audit trails and event emission — without any UI.

Part of the [ModernConsent](https://github.com/kschnekenburger/modern-consent) project.

## Install

```bash
npm install @modernconsent/core
```

## Quick Start

```typescript
import {
  consentState,
  hasAnswered,
  servicesList,
  setConsent,
  setConsentBatch,
  acceptAll,
  denyAll,
  getConsentRecord,
  emitter,
} from '@modernconsent/core';

// Read reactive state
consentState.get(); // { 'google-analytics': true, 'meta-pixel': false }
hasAnswered.get(); // true
servicesList.get(); // [{ id, name, description, category, loaded, requireConsent }]

// Mutate consent — each call is ONE action: one consentId, one cookie write, one consent:saved
setConsent('google-analytics', true);
setConsentBatch({ 'google-analytics': true, 'meta-pixel': false });
acceptAll();
denyAll();

// Audit metadata of the last action, as persisted in the cookie
getConsentRecord(); // { consent, answered, consentId, timestamp, version }

// Subscribe to changes
const unsub = consentState.subscribe(state => {
  console.log('Consent changed:', state);
});

// Listen to events
emitter.on('consent:update', data => {
  console.log(data.vendor, data.status); // 'google-analytics', 'granted'
});

emitter.on('consent:saved', data => {
  console.log(data.consentId, data.timestamp, data.consent); // same consentId as the cookie
});

emitter.on('consent:restored', data => {
  // stored consent replayed at page load (nothing persisted)
});
```

## Configuration

All options are passed via `window.modernConsent('config', { ... })`:

| Option                | Type                    | Default              | Description                                                                |
| --------------------- | ----------------------- | -------------------- | -------------------------------------------------------------------------- |
| `cookieName`          | `string`                | `'mc_consent_state'` | Name of the consent cookie                                                 |
| `cookieDomain`        | `string`                | —                    | Domain scope (e.g. `.example.com`)                                         |
| `consentMode`         | `boolean`               | `false`              | Google Consent Mode v2: core pushes `consent default` + derived `update`   |
| `consentModeDefaults` | `GcmState`              | —                    | Overrides for the `consent default` command                                |
| `consentVersion`      | `string`                | —                    | Version for GDPR audit. Changing it re-prompts the user                    |
| `consentOnly`         | `boolean`               | `false`              | Consent-only mode — no vendor `init()` calls. For Tag Manager integration  |
| `pushDataLayer`       | `boolean`               | `false`              | Push events to `window.dataLayer` (GTM)                                    |
| `displayMode`         | `'vendor' \| 'purpose'` | `'vendor'`           | How the widget displays controls                                           |
| `functionalPurpose`   | `boolean`               | `false`              | Show mandatory "Site operation" block                                      |
| `embedded`            | `boolean`               | `false`              | Headless iframe mode: no cookie, no UI, no reload — consent pushed by host |

## Consent-Only Mode

For GTM / TagCommander users who manage scripts externally:

```javascript
window.modernConsent('config', {
  consentOnly: true,
  pushDataLayer: true, // optional, for GTM native triggers
});
```

On every page load with a valid stored consent, the core replays a `consent_update` event (`consent_source: 'restore'`) to `consentLayer` / `dataLayer`, so Tag Manager triggers fire again without a new user action.

Integration points:

```javascript
// Read state
window.modernConsent.getConsent();
window.modernConsent.getConsentRecord(); // + consentId, timestamp, version

// Write state (one action: one consentId, one cookie write, one `consent:saved`)
window.modernConsent.setConsent('google-analytics', true);

// Listen to changes
window.modernConsent.on('consent:update', e => {
  console.log(e.vendor, e.status);
});

// consentLayer (always active)
window.consentLayer;
// [{ event: 'consent_update', consent_state, consent_id, consent_timestamp,
//    consent_version, consent_source: 'user' | 'restore' | 'external', gcm? }]

// dataLayer (opt-in)
window.dataLayer;
```

## Embedded Mode (iframes)

For a page embedded in a host site whose CMP collects the consent. The core never reads nor writes the cookie, the widget never prompts, revocations never reload. Consent is pushed by the host as a full snapshot — queue-safe, idempotent, and the host's `consentId` is kept for the audit trail:

```javascript
window.modernConsent('config', { embedded: true, consentMode: true });

window.modernConsent('consent', {
  consent: { 'google-analytics': true, 'meta-pixel': false },
  consentId: 'host-consent-id', // optional
});
```

Data layer events are pushed with `consent_source: 'external'`.

Third-party scripts that may run before the library has loaded should use `ready` instead of touching the dot methods directly:

```javascript
window.modernConsent('ready', mc => {
  mc.getConsentRecord();
  mc.on('consent:saved', record => {});
});
```

## Cookie Format

```json
{
  "consent": { "google-analytics": true, "meta-pixel": false },
  "answered": true,
  "timestamp": 1711468800000,
  "version": "v1",
  "consentId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Public API

| Method                      | Returns         | Description                                                     |
| --------------------------- | --------------- | --------------------------------------------------------------- |
| `('config', options)`       | —               | Merge configuration                                             |
| `('vendor', vendor)`        | —               | Register a vendor                                               |
| `('ready', cb)`             | —               | Run `cb(api)` once initialised (immediately if already)         |
| `('consent', record)`       | —               | Apply a consent snapshot from another page                      |
| `.openPanel()`              | —               | Open the consent panel                                          |
| `.getConsent()`             | `ConsentState`  | Current consent state                                           |
| `.getConsentRecord()`       | `ConsentRecord` | Consent + `consentId`, `timestamp`, `version`                   |
| `.setConsent(id, ok)`       | —               | Grant/revoke one vendor programmatically                        |
| `.setConsentRecord(record)` | —               | Apply a full snapshot (idempotent, keeps the given `consentId`) |
| `.on(event, cb)`            | `() => void`    | Subscribe to events                                             |

## Stores

Reactive stores with pub/sub pattern:

```typescript
import { consentState, hasAnswered, servicesList, isPanelOpen } from '@modernconsent/core';

// Read
consentState.get();

// Subscribe (fires immediately with current value)
const unsub = consentState.subscribe(value => { ... });
unsub(); // cleanup
```

> Writing to `consentState` / `hasAnswered` directly does **not** persist anything and emits no event.
> Use `setConsent`, `setConsentBatch`, `acceptAll` or `denyAll` — they are the only entry points
> that write the cookie and generate the audit `consentId`.

## Related Packages

| Package                                                                          | Description                               |
| -------------------------------------------------------------------------------- | ----------------------------------------- |
| [`@modernconsent/widget`](https://www.npmjs.com/package/@modernconsent/widget)   | Web Component UI (banner + details panel) |
| [`@modernconsent/vendors`](https://www.npmjs.com/package/@modernconsent/vendors) | 24 built-in vendor modules                |

## License

MIT
