---
'@modernconsent/core': minor
---

Expose `setConsent(id, allowed)` on `window.modernConsent`. Consent for a single vendor can now be granted or revoked programmatically from the global API (e.g. from a custom UI or a Tag Manager tag), without importing the npm package. Same guarantees as the exported function: one action, one `consentId`, one cookie write, one `consent:saved`.
