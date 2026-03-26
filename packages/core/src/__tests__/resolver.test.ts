import { describe, it, expect, beforeEach } from 'vitest';
import { addResolver, resolveVendor, __resetResolvers } from '../resolver';

describe('Resolver', () => {
  beforeEach(() => {
    __resetResolvers();
  });

  it('should return undefined when no resolvers are registered', () => {
    expect(resolveVendor('anything')).toBeUndefined();
  });

  it('should resolve a vendor via a registered resolver', () => {
    const loader = async () => ({ name: 'test', description: '', category: '', requireConsent: true });
    addResolver((name) => name === 'test-vendor' ? loader : undefined);

    expect(resolveVendor('test-vendor')).toBe(loader);
    expect(resolveVendor('unknown')).toBeUndefined();
  });

  it('should use LIFO order (last registered wins)', () => {
    const loaderA = async () => ({ name: 'A', description: '', category: '', requireConsent: true });
    const loaderB = async () => ({ name: 'B', description: '', category: '', requireConsent: true });

    addResolver((name) => name === 'vendor' ? loaderA : undefined);
    addResolver((name) => name === 'vendor' ? loaderB : undefined);

    // Last registered (loaderB) should win
    expect(resolveVendor('vendor')).toBe(loaderB);
  });

  it('should fall through to lower-priority resolvers', () => {
    const fallbackLoader = async () => ({ name: 'fallback', description: '', category: '', requireConsent: true });

    // Low priority: resolves 'vendor-a'
    addResolver((name) => name === 'vendor-a' ? fallbackLoader : undefined);
    // High priority: resolves 'vendor-b' only
    addResolver((name) => name === 'vendor-b' ? fallbackLoader : undefined);

    // vendor-a is only resolved by the first (lower priority) resolver
    expect(resolveVendor('vendor-a')).toBe(fallbackLoader);
  });

  it('should support cleanup via returned function', () => {
    const loader = async () => ({ name: 'test', description: '', category: '', requireConsent: true });
    const cleanup = addResolver((name) => name === 'test' ? loader : undefined);

    expect(resolveVendor('test')).toBe(loader);

    cleanup();
    expect(resolveVendor('test')).toBeUndefined();
  });

  it('should reset all resolvers with __resetResolvers()', () => {
    const loader = async () => ({ name: 'test', description: '', category: '', requireConsent: true });
    addResolver(() => loader);

    expect(resolveVendor('anything')).toBe(loader);

    __resetResolvers();
    expect(resolveVendor('anything')).toBeUndefined();
  });
});
