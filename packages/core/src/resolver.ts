// core/src/resolver.ts
import type { VendorLoader } from './registry';

/**
 * A resolver maps a vendor name to a loader function.
 * Return `undefined` to pass resolution to the next resolver in the chain.
 */
export type VendorResolver = (name: string) => VendorLoader | undefined;

const _resolvers: VendorResolver[] = [];

/**
 * Register a vendor resolver. Resolvers are tried in LIFO order
 * (last registered = highest priority), following the convention
 * from Vite/Rollup where later plugins override earlier ones.
 *
 * @returns A cleanup function that removes this resolver from the chain.
 */
export function addResolver(resolver: VendorResolver): () => void {
  _resolvers.push(resolver);
  return () => {
    const idx = _resolvers.indexOf(resolver);
    if (idx !== -1) _resolvers.splice(idx, 1);
  };
}

/**
 * Resolve a vendor name to a loader by walking the resolver chain (LIFO).
 * Returns `undefined` if no resolver can handle the name.
 */
export function resolveVendor(name: string): VendorLoader | undefined {
  for (let i = _resolvers.length - 1; i >= 0; i--) {
    const result = _resolvers[i](name);
    if (result) return result;
  }
  return undefined;
}

/** @internal — test helper only */
export function __resetResolvers(): void {
  _resolvers.length = 0;
}
