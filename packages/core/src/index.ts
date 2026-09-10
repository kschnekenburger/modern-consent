export type {
  ConsentState,
  ServiceMetadata,
  ConsentMeta,
  ConsentRecord,
  ConsentInput,
} from './state.ts';

export { Store } from './utils/store';

export {
  consentState,
  hasAnswered,
  consentMeta,
  servicesList,
  isPanelOpen,
  openPanel,
  getConsentRecord,
  isEmbedded,
} from './state';

// Vendor Resolution
export { addResolver, resolveVendor } from './resolver';

export {
  registerService,
  activateService,
  clearVendorArtifacts,
  type Vendor,
  type VendorLoader,
  type VendorConfig,
} from './registry';

export {
  setConsent,
  setConsentBatch,
  setConsentRecord,
  acceptAll,
  denyAll,
  restoreConsent,
  type ConsentEventSource,
} from './consent';

// Google Consent Mode v2
export { ensureGtag, computeGcmState, syncConsentMode, type GcmSignal, type GcmState } from './gcm';

export type {
  McConfig,
  McVendor,
  McAPI,
  McCommand,
  ConfigCommand,
  VendorCommand,
  ReadyCommand,
  ConsentCommand,
} from './layer';

export {
  emitter,
  type ConsentEventMap,
  type ConsentSavedEvent,
  type ConsentRestoredEvent,
} from './emitter';
export { generateUUID } from './utils/uuid';
export { initMcLayer } from './layer';

import { initMcLayer } from './layer';

if (typeof window !== 'undefined') {
  initMcLayer();
}
