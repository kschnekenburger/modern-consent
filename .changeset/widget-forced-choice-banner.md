---
'@modernconsent/widget': minor
---

Redesigned first-visit banner: large full-width "Accepter et continuer" button and "Personnaliser" button pinned below the scrollable text, and a discreet "Continuer sans accepter" link above the title. On first visit the popup can no longer be dismissed without a choice (no close button, Escape no longer closes it); the close button and Escape remain available when reopening the panel to change an existing choice. The banner text is capped at `40vh` and scrolls beyond it, configurable with the new `--mc-banner-max-height` CSS variable (`none` to disable).
