---
'@modernconsent/core': minor
'@modernconsent/widget': minor
---

Embedded (headless) mode for iframes, `ready` and `consent` commands.

**core**

- New `embedded: true` config: the core never reads nor writes the consent cookie, revoking a vendor never reloads the page. Consent comes from the host page; events, `consentLayer` / `dataLayer` pushes and Consent Mode keep working.
- New `setConsentRecord(record)` (npm export, `window.modernConsent.setConsentRecord()` and the queue-safe `consent` command): applies a full consent snapshot decided elsewhere. Vendors missing from the snapshot are revoked, only the vendors whose status changes are touched (re-sending the same snapshot is a no-op), and the provided `consentId` / `timestamp` / `version` are kept so host and embedded pages share one audit id. Data layer events carry `consent_source: 'external'`.
- New `ready` command: `window.modernConsent('ready', api => …)` runs the callback with the live API once the core is initialised — immediately if it already is. Queue-safe, for scripts that cannot know whether `consent.js` has loaded yet.
- `commitConsent()` accepts optional audit metadata. New exports `isEmbedded`, `ConsentInput`, `ConsentEventSource`, `McAPI`, `ReadyCommand`, `ConsentCommand`.

**widget**

- Never prompts nor renders when the core runs in `embedded` mode.
