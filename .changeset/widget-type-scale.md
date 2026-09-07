---
'@modernconsent/widget': minor
---

Larger, themeable type scale. Every font-size now derives from a single base via `calc()`, exposed as `--mc-font-size` (default `15px`). Body/buttons/labels move from 13px to 14px, secondary text from 12px to 13px, statuses/chips from 11px to 12px, title from 17px to 18px. Set `--mc-font-size` on `<mc-consent-widget>` (or any ancestor) to rescale the whole widget proportionally.
