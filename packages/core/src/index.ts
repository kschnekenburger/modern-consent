export type {ConsentState, ServiceMetadata} from './state.ts';

export {Store} from './utils/store';

export {
    consentState,
    hasAnswered,
    servicesList,
    isPanelOpen,
    openPanel,
} from './state';

// Vendor Resolution
export {addResolver, resolveVendor} from './resolver';

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
    acceptAll,
    denyAll,
} from './consent';

export type {
    McConfig,
    McVendor,
    McCommand,
    ConfigCommand,
    VendorCommand,
} from './layer';

export {emitter, type ConsentEventMap} from './emitter';
export {generateUUID} from './utils/uuid';
export {initMcLayer} from './layer';

import {initMcLayer} from './layer';

if (typeof window !== 'undefined') {
    initMcLayer();
}
