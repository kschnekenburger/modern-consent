import type { Vendor } from '@modernconsent/core';
import { PURPOSE_ADS } from './utils/purposes';

/**
 * Personalised advertising toggle for Google Consent Mode v2.
 * Auto-linked by `googleads` when `consentMode: true`. Declarative only: the core
 * grants/denies the signals below according to the user's choice.
 */
const GCMAds: Vendor = {
  name: 'Google Ads (Personnalisés)',
  category: 'Publicité',
  description: 'Active la personnalisation des publicités via Google Consent Mode.',
  ...PURPOSE_ADS,
  requireConsent: true,
  gcm: ['ad_user_data', 'ad_personalization'],
};

export default GCMAds;
