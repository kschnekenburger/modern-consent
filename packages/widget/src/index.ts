import {
  consentState,
  servicesList,
  hasAnswered,
  isPanelOpen,
  openPanel,
  type ConsentState,
  type ServiceMetadata,
} from '@modernconsent/core';

import { acceptAll, denyAll, setConsent, setConsentBatch } from '@modernconsent/core';

type WidgetMode = 'banner' | 'details';

/**
 * Labels for UI chrome only — NOT for banner title/body content.
 * The integrator provides title and body via <slot name="title"> and <slot name="body">.
 */
type WidgetLabels = {
  bannerTitle: string;
  bannerBody: string;
  bannerAcceptAll: string;
  bannerDenyAll: string;
  bannerCustomize: string;
  detailsTitle: string;
  detailsSubtitle: string;
  detailsBack: string;
  detailsAcceptAll: string;
  detailsDenyAll: string;
  serviceAccept: string;
  serviceDeny: string;
  statusAllowed: string;
  statusDenied: string;
  statusPending: string;
  statusAlwaysActive: string;
  categoryPending: string;
  close: string;
  purposeAccept: string;
  purposeDeny: string;
  purposeStatusAllowed: string;
  purposeStatusDenied: string;
  purposeStatusPending: string;
  functionalTitle: string;
  functionalDescription: string;
};

const LABELS: Record<string, WidgetLabels> = {
  fr: {
    bannerTitle: 'Nous respectons votre vie privée',
    bannerBody:
      'Ce site utilise des cookies pour améliorer votre expérience, mesurer l\u2019audience et personnaliser les contenus. Votre choix sera conservé et modifiable à tout moment.',
    bannerAcceptAll: 'Tout accepter',
    bannerDenyAll: 'Continuer sans accepter',
    bannerCustomize: 'Personnaliser',
    detailsTitle: 'Personnaliser vos préférences',
    detailsSubtitle: 'Vous pouvez activer ou désactiver chaque service individuellement.',
    detailsBack: 'Retour',
    detailsAcceptAll: 'Tout accepter',
    detailsDenyAll: 'Tout refuser',
    serviceAccept: 'Accepter',
    serviceDeny: 'Refuser',
    statusAllowed: 'Autorisé',
    statusDenied: 'Refusé',
    statusPending: 'En attente',
    statusAlwaysActive: 'Obligatoire',
    categoryPending: 'Services en attente',
    close: 'Fermer',
    purposeAccept: 'Accepter',
    purposeDeny: 'Refuser',
    purposeStatusAllowed: 'Acceptée',
    purposeStatusDenied: 'Refusée',
    purposeStatusPending: 'En attente',
    functionalTitle: 'Fonctionnement du site',
    functionalDescription:
      "Ces cookies et traceurs sont indispensables au fonctionnement du site, pour fournir nos services et nous assurer de leur bon fonctionnement, pour des raisons de sécurité et pour s'assurer du suivi de vos préférences.",
  },
  en: {
    bannerTitle: 'We respect your privacy',
    bannerBody:
      'This site uses cookies to improve your experience, measure audience and personalize content. Your choice will be saved and can be changed at any time.',
    bannerAcceptAll: 'Accept all',
    bannerDenyAll: 'Continue without accepting',
    bannerCustomize: 'Customize',
    detailsTitle: 'Customize your preferences',
    detailsSubtitle: 'You can enable or disable each service individually.',
    detailsBack: 'Back',
    detailsAcceptAll: 'Accept all',
    detailsDenyAll: 'Deny all',
    serviceAccept: 'Accept',
    serviceDeny: 'Deny',
    statusAllowed: 'Allowed',
    statusDenied: 'Denied',
    statusPending: 'Pending',
    statusAlwaysActive: 'Always active',
    categoryPending: 'Pending services',
    close: 'Close',
    purposeAccept: 'Accept',
    purposeDeny: 'Deny',
    purposeStatusAllowed: 'Accepted',
    purposeStatusDenied: 'Denied',
    purposeStatusPending: 'Pending',
    functionalTitle: 'Site operation',
    functionalDescription:
      'These cookies and trackers are essential for the site to function, to provide our services, ensure security, and remember your preferences.',
  },
};

/**
 * Resolve an i18n field: if it's a Record<lang, string>, pick the right language.
 * Falls back to 'fr', then first available value, then the fallback string.
 */
function resolveI18n(
  value: string | Record<string, string> | undefined,
  lang: string,
  fallback: string,
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value[lang] ?? value['fr'] ?? Object.values(value)[0] ?? fallback;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/*
 * ─── Theming ──────────────────────────────────────────────────────────────────
 *
 * you can set these CSS custom properties on <mc-consent-widget>
 * or any ancestor:
 *
 *   --mc-primary          Primary button color (default: #111827)
 *   --mc-primary-hover    Primary button hover (default: derived)
 *   --mc-radius           Border radius scale (default: 12px)
 */
const STYLES = `
  :host {
    /* Style isolation: Shadow DOM blocks the page's selectors but NOT inheritance —
       letter-spacing, line-height, font-weight, text-transform… flow in from <body>.
       'all: initial' severs that inheritance. Custom properties (--mc-*) are exempt
       from 'all' by spec, so theming still cascades in. */
    all: initial;

    --_primary: var(--mc-primary, #111827);
    --_primary-hover: var(--mc-primary-hover, color-mix(in srgb, var(--_primary) 85%, black));
    --_primary-text: var(--mc-primary-text, #fff);
    --_radius: var(--mc-radius, 12px);
    --_font: var(--mc-font, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);

    position: fixed;
    inset: 0;
    z-index: 99999;
    font-family: var(--_font);
    pointer-events: none;
    display: none;
  }

  :host([open]) {
    pointer-events: auto;
    display: block;
  }

  *, *::before, *::after { box-sizing: border-box; }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: mc-fade-in 0.2s ease;
  }

  @keyframes mc-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes mc-slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal {
    /* Base typography is (re)declared here, not only on :host: document rules that
       target the host element directly (e.g. a site-wide '* { font-family: X !important }'
       reset) beat :host rules and would inherit into the whole panel. Rules on .modal
       live inside the shadow tree and cannot be overridden by the page. */
    font-family: var(--_font);
    font-size: 14px;
    font-weight: 400;
    font-style: normal;
    line-height: 1.5;
    letter-spacing: normal;
    text-transform: none;
    text-align: left;
    color: #111827;

    background: #ffffff;
    border-radius: var(--_radius);
    max-width: 640px;
    width: calc(100% - 32px);
    max-height: 90vh;
    box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: mc-slide-up 0.25s ease;
  }

  .header {
    padding: 20px 24px 16px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .title {
    font-size: 17px;
    font-weight: 700;
    margin: 0;
    color: #111827;
    letter-spacing: -0.01em;
  }

  .subtitle {
    font-size: 13px;
    color: #6b7280;
    margin: 6px 0 0;
    line-height: 1.5;
  }

  .close-btn {
    flex-shrink: 0;
    border: none;
    background: #f3f4f6;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 6px 8px;
    color: #6b7280;
    border-radius: 8px;
    transition: background 0.15s;
  }
  .close-btn:hover { background: #e5e7eb; }

  .body {
    padding: 0 24px 16px;
    overflow: auto;
    font-size: 13px;
    color: #4b5563;
    line-height: 1.6;
  }

  .divider {
    height: 1px;
    background: #e5e7eb;
    margin: 0 24px;
  }

  .footer {
    padding: 16px 24px;
    border-top: 1px solid #f3f4f6;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  /* ─── Buttons ─────────────────────────────────────────── */

  .btn {
    appearance: none;
    border-radius: 999px;
    padding: 9px 18px;
    font-size: 13px;
    font-weight: 500;
    border: 1px solid transparent;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  .btn:active { transform: translateY(1px); }

  .btn-primary {
    background: var(--_primary);
    color: var(--_primary-text);
    border-color: var(--_primary);
  }
  .btn-primary:hover {
    background: var(--_primary-hover);
    border-color: var(--_primary-hover);
  }

  .btn-outline {
    background: #ffffff;
    border-color: #e5e7eb;
    color: #374151;
  }
  .btn-outline:hover { background: #f9fafb; border-color: #d1d5db; }

  .btn-allowed-active {
    background: #059669;
    border-color: #059669;
    color: #fff;
  }
  .btn-allowed-active:hover { background: #047857; border-color: #047857; }

  .btn-denied-active {
    background: #dc2626;
    border-color: #dc2626;
    color: #fff;
  }
  .btn-denied-active:hover { background: #b91c1c; border-color: #b91c1c; }

  .btn-ghost {
    background: transparent;
    color: #6b7280;
  }
  .btn-ghost:hover { background: #f9fafb; }

  /* ─── Categories & Services ───────────────────────────── */

  .categories {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .category {
    border-radius: calc(var(--_radius) - 2px);
    border: 1px solid #f3f4f6;
    background: #fafafa;
    padding: 14px;
  }

  .category-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .category-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
  }

  .services-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .service {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0 6px;
    border-top: 1px solid #f3f4f6;
  }

  .service-main { flex: 1; }

  .service-name {
    font-size: 13px;
    font-weight: 500;
    color: #111827;
    margin-bottom: 2px;
  }

  .service-description { font-size: 12px; color: #6b7280; line-height: 1.4; }

  .service-status { font-size: 11px; margin-top: 4px; font-weight: 500; }
  .service-status.allowed { color: #059669; }
  .service-status.denied { color: #dc2626; }
  .service-status.pending { color: #d97706; }

  .service-actions { display: flex; gap: 4px; flex-shrink: 0; }

  .chip {
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 999px;
    border: 1px solid #e5e7eb;
    color: #6b7280;
    white-space: nowrap;
    font-weight: 500;
  }

  .chip-active {
    background: #ecfdf5;
    border-color: #a7f3d0;
    color: #059669;
  }

  /* ─── Purpose mode ────────────────────────────────────── */

  .category-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .category-status {
    font-size: 11px;
    font-weight: 500;
  }
  .category-status.allowed { color: #059669; }
  .category-status.denied { color: #dc2626; }
  .category-status.pending { color: #d97706; }

  .purpose-description {
    font-size: 12px;
    color: #6b7280;
    margin: 0 0 8px;
    line-height: 1.5;
  }

  .purpose-service-info {
    padding: 4px 0;
    border-top: none;
  }
  .purpose-service-info .service-name {
    font-size: 12px;
    color: #4b5563;
    font-weight: 400;
  }
  .purpose-service-info .service-description {
    font-size: 11px;
    color: #9ca3af;
  }
`;

// Shared across all instances — instantiated once, never GC'd
let _sharedStyleSheet: CSSStyleSheet | null = null;
const _supportsAdoptedStyleSheets =
  typeof CSSStyleSheet !== 'undefined' &&
  'adoptedStyleSheets' in Document.prototype &&
  'replaceSync' in CSSStyleSheet.prototype;

function getSharedStyleSheet(): CSSStyleSheet {
  if (!_sharedStyleSheet) {
    _sharedStyleSheet = new CSSStyleSheet();
    _sharedStyleSheet.replaceSync(STYLES);
  }
  return _sharedStyleSheet;
}

/** Fallback for browsers without adoptedStyleSheets (Safari < 16.4) */
function injectStyleFallback(shadow: ShadowRoot) {
  if (shadow.querySelector('style[data-mc]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-mc', '');
  style.textContent = STYLES;
  shadow.prepend(style);
}

export class McConsentWidget extends HTMLElement {
  static observedAttributes = ['lang'];

  private shadow: ShadowRoot;
  private mode: WidgetMode = 'banner';
  private _unsubscribers: (() => void)[] = [];
  private _renderScheduled = false;
  private _previouslyFocused: Element | null = null;
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  private services: ServiceMetadata[] = [];
  private consent: ConsentState = {};
  private answered = false;
  private panelOpen = false;
  /**
   * Whether the user had already answered when the panel was opened.
   * True = re-customization session: never auto-close on individual toggles,
   * the user closes explicitly (close/back/accept-all/deny-all).
   * False = first visit: auto-close once every pending service is decided.
   */
  private _entryAnswered = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  private get labels(): WidgetLabels {
    const lang = this.getAttribute('lang') ?? 'fr';
    return LABELS[lang] ?? LABELS['fr'];
  }

  private scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => {
      this._renderScheduled = false;
      this.render();
    });
  }

  connectedCallback() {
    // Apply styles once — use adoptedStyleSheets when available, fallback to <style> tag
    if (_supportsAdoptedStyleSheets) {
      this.shadow.adoptedStyleSheets = [getSharedStyleSheet()];
    } else {
      injectStyleFallback(this.shadow);
    }

    // subscribe() fires immediately with current value.
    // ORDER MATTERS: consent + answered must sync BEFORE servicesList
    // because servicesList triggers ensurePanelOpenIfNeeded() which
    // reads this.consent and this.answered to decide whether to show.
    this._unsubscribers.push(
      consentState.subscribe(consent => {
        this.consent = consent;
        this.scheduleRender();
      }),
      hasAnswered.subscribe(answered => {
        this.answered = answered;
        this.scheduleRender();
      }),
      servicesList.subscribe(services => {
        this.services = services;
        this.ensurePanelOpenIfNeeded();
        this.scheduleRender();
      }),
      isPanelOpen.subscribe(open => {
        const previous = this.panelOpen;
        this.panelOpen = open;
        if (open && !previous) {
          this._entryAnswered = this.answered;
          if (this.answered) this.mode = 'details';
        }
        this.scheduleRender();
      }),
    );
  }

  disconnectedCallback() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    this.teardownFocusTrap(false);
  }

  attributeChangedCallback() {
    this.scheduleRender();
  }

  private ensurePanelOpenIfNeeded() {
    if (this.getPendingServices().length > 0 && !this.answered && !this.panelOpen) {
      openPanel();
    }
  }

  private getPendingServices(): ServiceMetadata[] {
    return this.services.filter(s => s.requireConsent && this.consent[s.id] === undefined);
  }

  private shouldShowPopup(): boolean {
    return this.panelOpen && this.services.length > 0;
  }

  // ─── Focus trap ──────────────────────────────────────────────────────────────

  private setupFocusTrap() {
    const modal = this.shadow.querySelector<HTMLElement>('.modal');
    if (!modal) return;

    const focusable = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (!focusable.length) return;

    // Capture the previously focused element so we can restore it on close
    if (!this._previouslyFocused) {
      this._previouslyFocused = document.activeElement;
    }

    // Move focus into the modal on the next frame (ensures paint is complete)
    requestAnimationFrame(() => focusable[0]?.focus());

    this._keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        isPanelOpen.set(false);
        return;
      }

      if (e.key !== 'Tab') return;

      // shadow.activeElement gives the focused element within the shadow root
      const active = this.shadow.activeElement;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', this._keydownHandler);
  }

  private teardownFocusTrap(restoreFocus = true) {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }

    if (restoreFocus && this._previouslyFocused && 'focus' in this._previouslyFocused) {
      (this._previouslyFocused as HTMLElement).focus();
      this._previouslyFocused = null;
    }
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────

  private render() {
    const shouldShow = this.shouldShowPopup();

    if (!shouldShow) {
      this.teardownFocusTrap(true);
      this.shadow.innerHTML = '';
      this.removeAttribute('open');
      return;
    }

    this.setAttribute('open', '');

    // Re-rendering while staying open: remove old keydown handler, keep previouslyFocused
    this.teardownFocusTrap(false);

    if (this.mode === 'banner') {
      this.renderBanner();
    } else {
      const displayMode =
        (typeof window !== 'undefined' ? window._modernConsentConfig?.displayMode : undefined) ??
        'vendor';
      if (displayMode === 'purpose') {
        this.renderPurposeDetails();
      } else {
        this.renderDetails();
      }
    }

    this.setupFocusTrap();
  }

  private onAcceptAll = () => acceptAll();
  private onDenyAll = () => denyAll();

  private onCustomize = () => {
    this.mode = 'details';
    this.scheduleRender();
  };

  private onBackToBanner = () => {
    this.mode = 'banner';
    this.scheduleRender();
  };

  private onSetConsentForService(id: string, allowed: boolean) {
    setConsent(id, allowed);
    // First visit only: close once every pending service is decided. In a
    // re-customization session the panel stays open until the user closes it.
    if (!this._entryAnswered && this.getPendingServices().filter(s => s.id !== id).length === 0) {
      isPanelOpen.set(false);
    }
  }

  private onSetConsentForCategory(category: string, allowed: boolean) {
    // One action for the whole purpose: one consentId, one cookie write, one consent:saved.
    const updates: Record<string, boolean> = {};
    this.services
      .filter(s => s.category === category && s.requireConsent)
      .forEach(s => (updates[s.id] = allowed));
    setConsentBatch(updates);
    if (!this._entryAnswered && this.getPendingServices().length === 0) {
      isPanelOpen.set(false);
    }
  }

  private getCategoryStatus(services: ServiceMetadata[]): 'allowed' | 'denied' | 'pending' {
    const consentRequired = services.filter(s => s.requireConsent);
    if (consentRequired.length === 0) return 'allowed';
    const allAllowed = consentRequired.every(s => this.consent[s.id]);
    if (allAllowed) return 'allowed';
    const allDenied = consentRequired.every(s => !this.consent[s.id]);
    if (allDenied) return 'denied';
    return 'pending';
  }

  private groupServicesByCategory(): Record<string, ServiceMetadata[]> {
    const groups: Record<string, ServiceMetadata[]> = {};
    this.services.forEach(service => {
      const cat = service.category || 'Autres';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(service);
    });
    return groups;
  }

  private renderFunctionalBlock(): string {
    const show =
      typeof window !== 'undefined' && window._modernConsentConfig?.functionalPurpose === true;
    if (!show) return '';
    const l = this.labels;
    return `
      <section class="category">
        <div class="category-header">
          <div class="category-info">
            <span class="category-title">${escapeHtml(l.functionalTitle)}</span>
          </div>
          <span class="chip chip-active">${escapeHtml(l.statusAlwaysActive)}</span>
        </div>
        <div class="purpose-description">${escapeHtml(l.functionalDescription)}</div>
      </section>
    `;
  }

  private renderBanner() {
    const l = this.labels;

    this.shadow.innerHTML = `
      <div class="backdrop" role="dialog" aria-modal="true" aria-labelledby="mc-title">
        <div class="modal">
          <div class="header">
            <div>
              <h2 class="title" id="mc-title"><slot name="title">${escapeHtml(l.bannerTitle)}</slot></h2>
            </div>
            <button class="close-btn" type="button" aria-label="${escapeHtml(l.close)}" id="mc-close-btn">✕</button>
          </div>
          <div class="body">
            <slot name="body">${escapeHtml(l.bannerBody)}</slot>
          </div>
          <div class="footer">
            <button class="btn btn-ghost" type="button" id="mc-deny-all-btn">${escapeHtml(l.bannerDenyAll)}</button>
            <button class="btn btn-outline" type="button" id="mc-customize-btn">${escapeHtml(l.bannerCustomize)}</button>
            <button class="btn btn-primary" type="button" id="mc-accept-all-btn">${escapeHtml(l.bannerAcceptAll)}</button>
          </div>
        </div>
      </div>
    `;

    this.shadow.getElementById('mc-accept-all-btn')!.addEventListener('click', this.onAcceptAll);
    this.shadow.getElementById('mc-deny-all-btn')!.addEventListener('click', this.onDenyAll);
    this.shadow.getElementById('mc-customize-btn')!.addEventListener('click', this.onCustomize);
    this.shadow
      .getElementById('mc-close-btn')!
      .addEventListener('click', () => isPanelOpen.set(false));
  }

  private renderDetails() {
    const l = this.labels;
    const functionalHtml = this.renderFunctionalBlock();
    const groups = this.groupServicesByCategory();

    const bodyHtml = Object.keys(groups)
      .sort()
      .map(cat => {
        const services = groups[cat];
        const hasPending = services.some(s => s.requireConsent && this.consent[s.id] === undefined);

        const servicesHtml = services
          .map(s => {
            if (!s.requireConsent) {
              return `
                <div class="service">
                  <div class="service-main">
                    <div class="service-name">${escapeHtml(s.name)}</div>
                    <div class="service-description">${escapeHtml(s.description)}</div>
                  </div>
                  <span class="chip chip-active">${escapeHtml(l.statusAlwaysActive)}</span>
                </div>
              `;
            }

            // `undefined` means the user has not decided yet — it must read as pending,
            // not as denied.
            const consent = this.consent[s.id];
            const statusClass: 'allowed' | 'denied' | 'pending' =
              consent === true ? 'allowed' : consent === false ? 'denied' : 'pending';
            const statusLabel =
              statusClass === 'allowed'
                ? l.statusAllowed
                : statusClass === 'denied'
                  ? l.statusDenied
                  : l.statusPending;

            return `
              <div class="service">
                <div class="service-main">
                  <div class="service-name">${escapeHtml(s.name)}</div>
                  <div class="service-description">${escapeHtml(s.description)}</div>
                  <div class="service-status ${statusClass}">${escapeHtml(statusLabel)}</div>
                </div>
                <div class="service-actions">
                  <button class="btn btn-outline ${statusClass === 'allowed' ? 'btn-allowed-active' : ''}" type="button" data-action="allow" data-id="${escapeHtml(s.id)}">
                    ${escapeHtml(l.serviceAccept)}
                  </button>
                  <button class="btn btn-outline ${statusClass === 'denied' ? 'btn-denied-active' : ''}" type="button" data-action="deny" data-id="${escapeHtml(s.id)}">
                    ${escapeHtml(l.serviceDeny)}
                  </button>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <section class="category">
            <div class="category-header">
              <div class="category-title">${escapeHtml(cat)}</div>
              ${hasPending ? `<span class="chip">${escapeHtml(l.categoryPending)}</span>` : ''}
            </div>
            <div class="services-list">${servicesHtml}</div>
          </section>
        `;
      })
      .join('');

    this.shadow.innerHTML = `
      <div class="backdrop" role="dialog" aria-modal="true" aria-labelledby="mc-details-title">
        <div class="modal">
          <div class="header">
            <div>
              <h2 class="title" id="mc-details-title">${escapeHtml(l.detailsTitle)}</h2>
              <p class="subtitle">${escapeHtml(l.detailsSubtitle)}</p>
            </div>
            <button class="close-btn" type="button" aria-label="${escapeHtml(l.close)}" id="mc-close-btn">✕</button>
          </div>
          <div class="body">
            <div class="categories">${functionalHtml}${bodyHtml}</div>
          </div>
          <div class="footer">
            <button class="btn btn-ghost" type="button" id="mc-back-btn">${escapeHtml(l.detailsBack)}</button>
            <button class="btn btn-outline" type="button" id="mc-deny-all-btn">${escapeHtml(l.detailsDenyAll)}</button>
            <button class="btn btn-primary" type="button" id="mc-accept-all-btn">${escapeHtml(l.detailsAcceptAll)}</button>
          </div>
        </div>
      </div>
    `;

    this.shadow.getElementById('mc-accept-all-btn')!.addEventListener('click', this.onAcceptAll);
    this.shadow.getElementById('mc-deny-all-btn')!.addEventListener('click', this.onDenyAll);
    this.shadow.getElementById('mc-back-btn')!.addEventListener('click', this.onBackToBanner);
    this.shadow
      .getElementById('mc-close-btn')!
      .addEventListener('click', () => isPanelOpen.set(false));

    this.shadow.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onSetConsentForService(btn.dataset.id!, btn.dataset.action === 'allow');
      });
    });
  }

  private renderPurposeDetails() {
    const l = this.labels;
    const lang = this.getAttribute('lang') ?? 'fr';
    const functionalHtml = this.renderFunctionalBlock();
    const groups = this.groupServicesByCategory();
    const configPurposes =
      typeof window !== 'undefined' ? window._modernConsentConfig?.purposes : undefined;

    const bodyHtml = Object.keys(groups)
      .sort()
      .map(cat => {
        const services = groups[cat];
        const allNonConsent = services.every(s => !s.requireConsent);
        const status = this.getCategoryStatus(services);

        // Resolve purpose label: vendor-level (i18n) > config-level > raw category name
        const vendorWithPurpose = services.find(s => s.purposeLabel);
        const purposeLabel = resolveI18n(
          vendorWithPurpose?.purposeLabel,
          lang,
          configPurposes?.[cat]?.label ?? cat,
        );
        const purposeDescription = resolveI18n(
          vendorWithPurpose?.purposeDescription,
          lang,
          configPurposes?.[cat]?.description ?? '',
        );

        const actionsHtml = allNonConsent
          ? `<span class="chip chip-active">${escapeHtml(l.statusAlwaysActive)}</span>`
          : `
            <div class="service-actions">
              <button class="btn btn-outline ${status === 'allowed' ? 'btn-allowed-active' : ''}" type="button" data-category="${escapeHtml(cat)}" data-cat-action="allow">
                ${escapeHtml(l.purposeAccept)}
              </button>
              <button class="btn btn-outline ${status === 'denied' ? 'btn-denied-active' : ''}" type="button" data-category="${escapeHtml(cat)}" data-cat-action="deny">
                ${escapeHtml(l.purposeDeny)}
              </button>
            </div>
          `;

        const vendorsHtml = services
          .map(
            s => `
            <div class="service purpose-service-info">
              <div class="service-main">
                <div class="service-name">${escapeHtml(s.name)}</div>
                <div class="service-description">${escapeHtml(s.description)}</div>
              </div>
            </div>
          `,
          )
          .join('');

        return `
          <section class="category">
            <div class="category-header">
              <div class="category-info">
                <span class="category-title">${escapeHtml(purposeLabel)}</span>
              </div>
              ${actionsHtml}
            </div>
            ${purposeDescription ? `<div class="purpose-description">${escapeHtml(purposeDescription)}</div>` : ''}
            <div class="services-list">${vendorsHtml}</div>
          </section>
        `;
      })
      .join('');

    this.shadow.innerHTML = `
      <div class="backdrop" role="dialog" aria-modal="true" aria-labelledby="mc-details-title">
        <div class="modal">
          <div class="header">
            <div>
              <h2 class="title" id="mc-details-title">${escapeHtml(l.detailsTitle)}</h2>
              <p class="subtitle">${escapeHtml(l.detailsSubtitle)}</p>
            </div>
            <button class="close-btn" type="button" aria-label="${escapeHtml(l.close)}" id="mc-close-btn">✕</button>
          </div>
          <div class="body">
            <div class="categories">${functionalHtml}${bodyHtml}</div>
          </div>
          <div class="footer">
            <button class="btn btn-ghost" type="button" id="mc-back-btn">${escapeHtml(l.detailsBack)}</button>
            <button class="btn btn-outline" type="button" id="mc-deny-all-btn">${escapeHtml(l.detailsDenyAll)}</button>
            <button class="btn btn-primary" type="button" id="mc-accept-all-btn">${escapeHtml(l.detailsAcceptAll)}</button>
          </div>
        </div>
      </div>
    `;

    this.shadow.getElementById('mc-accept-all-btn')!.addEventListener('click', this.onAcceptAll);
    this.shadow.getElementById('mc-deny-all-btn')!.addEventListener('click', this.onDenyAll);
    this.shadow.getElementById('mc-back-btn')!.addEventListener('click', this.onBackToBanner);
    this.shadow
      .getElementById('mc-close-btn')!
      .addEventListener('click', () => isPanelOpen.set(false));

    this.shadow.querySelectorAll<HTMLButtonElement>('[data-cat-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.onSetConsentForCategory(btn.dataset.category!, btn.dataset.catAction === 'allow');
      });
    });
  }
}

if (typeof window !== 'undefined' && !customElements.get('mc-consent-widget')) {
  customElements.define('mc-consent-widget', McConsentWidget);
}
