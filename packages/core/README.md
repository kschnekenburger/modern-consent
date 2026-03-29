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
  acceptAll,
  denyAll,
  emitter,
} from '@modernconsent/core';

// Read reactive state
consentState.get(); // { 'google-analytics': true, 'meta-pixel': false }
hasAnswered.get(); // true
servicesList.get(); // [{ id, name, description, category, loaded, requireConsent }]

// Mutate consent
setConsent('google-analytics', true);
acceptAll();
denyAll();

// Subscribe to changes
const unsub = consentState.subscribe(state => {
  console.log('Consent changed:', state);
});

// Listen to events
emitter.on('consent:update', data => {
  console.log(data.vendor, data.status); // 'google-analytics', 'granted'
});

emitter.on('consent:saved', data => {
  console.log(data.consentId, data.timestamp, data.consent);
});
```

## Configuration

All options are passed via `window.modernConsent('config', { ... })`:

| Option              | Type                    | Default              | Description                                                               |
| ------------------- | ----------------------- | -------------------- | ------------------------------------------------------------------------- |
| `cookieName`        | `string`                | `'mc_consent_state'` | Name of the consent cookie                                                |
| `cookieDomain`      | `string`                | —                    | Domain scope (e.g. `.example.com`)                                        |
| `consentMode`       | `boolean`               | `false`              | Enable Google Consent Mode v2                                             |
| `consentVersion`    | `string`                | —                    | Version for GDPR audit. Changing it re-prompts the user                   |
| `consentOnly`       | `boolean`               | `false`              | Consent-only mode — no vendor `init()` calls. For Tag Manager integration |
| `pushDataLayer`     | `boolean`               | `false`              | Push events to `window.dataLayer` (GTM)                                   |
| `displayMode`       | `'vendor' \| 'purpose'` | `'vendor'`           | How the widget displays controls                                          |
| `functionalPurpose` | `boolean`               | `false`              | Show mandatory "Site operation" block                                     |

## Consent-Only Mode

For GTM / TagCommander users who manage scripts externally:

```javascript
window.modernConsent('config', {
  consentOnly: true,
  pushDataLayer: true, // optional, for GTM native triggers
});
```

Integration points:

```javascript
// Read state
window.modernConsent.getConsent();

// Listen to changes
window.modernConsent.on('consent:update', e => {
  console.log(e.vendor, e.status);
});

// consentLayer (always active)
window.consentLayer;

// dataLayer (opt-in)
window.dataLayer;
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

| Method                | Returns        | Description            |
| --------------------- | -------------- | ---------------------- |
| `('config', options)` | —              | Merge configuration    |
| `('vendor', vendor)`  | —              | Register a vendor      |
| `.openPanel()`        | —              | Open the consent panel |
| `.getConsent()`       | `ConsentState` | Current consent state  |
| `.on(event, cb)`      | `() => void`   | Subscribe to events    |

## Stores

Reactive stores with pub/sub pattern:

```typescript
import { consentState, hasAnswered, servicesList, isPanelOpen } from '@modernconsent/core';

// Read
consentState.get();

// Write
consentState.set({ 'my-vendor': true });

// Subscribe (fires immediately with current value)
const unsub = consentState.subscribe(value => { ... });
unsub(); // cleanup
```

## Related Packages

| Package                                                                          | Description                               |
| -------------------------------------------------------------------------------- | ----------------------------------------- |
| [`@modernconsent/widget`](https://www.npmjs.com/package/@modernconsent/widget)   | Web Component UI (banner + details panel) |
| [`@modernconsent/vendors`](https://www.npmjs.com/package/@modernconsent/vendors) | 24 built-in vendor modules                |

## License

MIT
