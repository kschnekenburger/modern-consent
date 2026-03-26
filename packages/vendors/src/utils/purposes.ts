/**
 * Shared purpose labels and descriptions for built-in vendors.
 * Imported by each vendor — inlined at build time by tsup (zero runtime overhead).
 */

export const PURPOSE_ANALYTICS = {
  purposeLabel: {
    fr: "Analyse de session utilisateur et mesure d'audience",
    en: 'User session analysis and audience measurement',
  },
  purposeDescription: {
    fr: "Ces cookies nous permettent d'établir des statistiques et volumes de fréquentation et d'utilisation des éléments du site.",
    en: 'These cookies allow us to compile statistics on site traffic and usage.',
  },
} as const;

export const PURPOSE_ADS = {
  purposeLabel: {
    fr: 'Ciblage publicitaire',
    en: 'Advertising targeting',
  },
  purposeDescription: {
    fr: 'Ces cookies sont utilisés pour vous proposer des publicités personnalisées en fonction de votre navigation.',
    en: 'These cookies are used to deliver personalized ads based on your browsing behavior.',
  },
} as const;

export const PURPOSE_SUPPORT = {
  purposeLabel: {
    fr: 'Support et assistance',
    en: 'Support and assistance',
  },
  purposeDescription: {
    fr: "Ces cookies permettent d'interagir avec notre service client et de bénéficier d'une assistance en direct.",
    en: 'These cookies enable interaction with our customer support and provide live assistance.',
  },
} as const;

export const PURPOSE_SOCIAL = {
  purposeLabel: {
    fr: 'Réseaux sociaux',
    en: 'Social media',
  },
  purposeDescription: {
    fr: 'Ces cookies permettent de partager du contenu sur les réseaux sociaux et d\'interagir avec des plateformes tierces.',
    en: 'These cookies allow sharing content on social media and interacting with third-party platforms.',
  },
} as const;
