import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerService, activateService, __resetRegistry } from '../registry';
import { addResolver, resolveVendor, __resetResolvers } from '../resolver';
import { servicesList, consentState } from '../state';

describe('Registry', () => {
  beforeEach(() => {
    __resetRegistry();
    __resetResolvers();
    servicesList.set([]);
    consentState.set({});
    vi.clearAllMocks();
  });

  it('should resolve vendors via addResolver()', () => {
    const mockLoader = vi.fn();
    addResolver(name => (name === 'google-analytics' ? mockLoader : undefined));

    expect(resolveVendor('google-analytics')).toBeDefined();
    expect(resolveVendor('unknown')).toBeUndefined();
  });

  it('should register a service and add it to servicesList', async () => {
    const mockVendor = {
      name: 'Mock Vendor',
      description: 'Desc',
      category: 'Cat',
      requireConsent: true,
    };
    const loader = vi.fn().mockResolvedValue({ default: mockVendor });

    registerService({
      id: 'mock-id',
      category: 'Cat',
      loader,
      config: {},
    });

    // Wait for the promise in registerService to resolve
    await vi.waitFor(() => {
      const list = servicesList.get();
      return list.length > 0;
    });

    const list = servicesList.get();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: 'mock-id',
      name: 'Mock Vendor',
      category: 'Cat',
    });
  });

  it('should activate service (call init)', async () => {
    const initSpy = vi.fn();
    const mockVendor = {
      name: 'Mock Vendor',
      description: 'Desc',
      category: 'Cat',
      requireConsent: true,
      init: initSpy,
    };
    const loader = vi.fn().mockResolvedValue({ default: mockVendor });

    registerService({
      id: 'active-service',
      category: 'Cat',
      loader,
      config: { api: '123' },
    });

    await vi.waitFor(() => servicesList.get().length > 0);

    await activateService('active-service');
    expect(initSpy).toHaveBeenCalledWith({ api: '123' });

    const meta = servicesList.get().find(s => s.id === 'active-service');
    expect(meta?.loaded).toBe(true);
  });

  it('should NOT call init() in consentOnly mode', async () => {
    window._modernConsentConfig = { consentOnly: true };

    const initSpy = vi.fn();
    const mockVendor = {
      name: 'Soft Vendor',
      description: 'Desc',
      category: 'Cat',
      requireConsent: true,
      init: initSpy,
    };
    const loader = vi.fn().mockResolvedValue({ default: mockVendor });

    registerService({
      id: 'soft-service',
      category: 'Cat',
      loader,
      config: { key: 'abc' },
    });

    await vi.waitFor(() => servicesList.get().length > 0);

    await activateService('soft-service');
    expect(initSpy).not.toHaveBeenCalled();

    const meta = servicesList.get().find(s => s.id === 'soft-service');
    expect(meta?.loaded).toBe(false);

    window._modernConsentConfig = {};
  });
});
