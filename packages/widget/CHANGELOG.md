# @modernconsent/widget

## 3.0.0

### Minor Changes

- 4193b10: Widget style isolation and deferred reload on revocation.

  **widget**
  - Style isolation: `all: initial` on `:host` severs CSS inheritance from the page (letter-spacing, line-height, font-weight, text-transform… no longer leak in; `--mc-*` theming still cascades, custom properties are exempt from `all`). Base typography is also re-declared on `.modal`, which page-level rules cannot reach — a site-wide `* { font-family: X !important }` reset no longer changes the widget's font.
  - Re-customization sessions (panel reopened after consent was given) no longer auto-close on each toggle; the user closes explicitly. First-visit behavior is unchanged: the panel closes once every pending service is decided.

  **core**
  - Revoking a loaded vendor no longer reloads the page mid-customization: while the panel is open the reload is deferred until it closes, and multiple revocations coalesce into a single reload. With the panel closed (including `denyAll`/`acceptAll`, which close it) the reload stays immediate. `consentOnly` mode still never reloads.

### Patch Changes

- Updated dependencies [4193b10]
  - @modernconsent/core@3.0.0

## 2.0.0

### Minor Changes

- 8e5fbbc: Consistent audit trail, centralised Google Consent Mode v2, consent replay on page load.

  **core**
  - Every consent action (`setConsent`, new `setConsentBatch`, `acceptAll`, `denyAll`) is now committed once: one `consentId`, one cookie write, one `consent:saved`, at most one reload. The `consentId` emitted in events is the one stored in the cookie.
  - Writing to `consentState` / `hasAnswered` directly no longer persists the cookie — use the consent functions.
  - New `consent:restored` event and `consent_update` replay (`consent_source: 'restore'`) on `consentLayer` / `dataLayer` at page load when a valid consent is stored, so Tag Manager triggers fire on every page.
  - Google Consent Mode v2 handled by the core when `consentMode: true`: single `consent default` (four v2 signals denied, overridable via `consentModeDefaults`), `consent update` derived from vendors' new `gcm` declarations. New exports `ensureGtag`, `computeGcmState`, `syncConsentMode`, `getConsentRecord`, `consentMeta`, `restoreConsent`.
  - `modernConsent.getConsentRecord()` added to the public API.
  - Artifact cookies are expired for the host, the configured `cookieDomain` and every hostname suffix; revocation clears artifacts even in `consentOnly` mode.
  - `initMcLayer()` is idempotent (a second copy of the core no longer resets the config). `sideEffects` now lists only the entry file.
  - Data layer event enriched with `consent_id`, `consent_timestamp`, `consent_version`, `consent_source`, `gcm`.

  **vendors**
  - `google-analytics`, `googleads`, `gcmads` declare `gcm` signals and no longer call `gtag('consent', ...)` themselves. Shared `gtag` stub (`ensureGtag`) pushing the `arguments` object as required by gtag.js. `gtag('config', ID)` moved from `setup()` to `init()` so tags cannot fire before consent.
  - `google-analytics` declares its cookies (`_ga`, `_gid`, `_gat`, `_ga_<stream>`); `meta-pixel` declares `_fbp`, `_fbc`.

  **widget**
  - Vendor-mode details: undecided services now display as "pending" instead of "denied".
  - Purpose toggles use `setConsentBatch` (one action per purpose).

### Patch Changes

- Updated dependencies [8e5fbbc]
  - @modernconsent/core@2.0.0
