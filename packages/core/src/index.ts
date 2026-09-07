export type { ConsentState, ServiceMetadata, ConsentMeta, ConsentRecord } from './state.ts';

export { Store } from './utils/store';

export {
  consentState,
  hasAnswered,
  consentMeta,
  servicesList,
  isPanelOpen,
  openPanel,
  getConsentRecord,
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

export { setConsent, setConsentBatch, acceptAll, denyAll, restoreConsent } from './consent';

// Google Consent Mode v2
export { ensureGtag, computeGcmState, syncConsentMode, type GcmSignal, type GcmState } from './gcm';

export type { McConfig, McVendor, McCommand, ConfigCommand, VendorCommand } from './layer';

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
