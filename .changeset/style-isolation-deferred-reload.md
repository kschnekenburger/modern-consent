---
'@modernconsent/widget': minor
'@modernconsent/core': minor
---

Widget style isolation and deferred reload on revocation.

**widget**

- Style isolation: `all: initial` on `:host` severs CSS inheritance from the page (letter-spacing, line-height, font-weight, text-transform… no longer leak in; `--mc-*` theming still cascades, custom properties are exempt from `all`). Base typography is also re-declared on `.modal`, which page-level rules cannot reach — a site-wide `* { font-family: X !important }` reset no longer changes the widget's font.
- Re-customization sessions (panel reopened after consent was given) no longer auto-close on each toggle; the user closes explicitly. First-visit behavior is unchanged: the panel closes once every pending service is decided.

**core**

- Revoking a loaded vendor no longer reloads the page mid-customization: while the panel is open the reload is deferred until it closes, and multiple revocations coalesce into a single reload. With the panel closed (including `denyAll`/`acceptAll`, which close it) the reload stays immediate. `consentOnly` mode still never reloads.
