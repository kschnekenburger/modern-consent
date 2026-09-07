import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerService,
  activateService,
  clearVendorArtifacts,
  cookieDomainCandidates,
  __resetRegistry,
} from '../registry';
import { addResolver, resolveVendor, __resetResolvers } from '../resolver';
import { servicesList, consentState, hasAnswered } from '../state';
import { __resetConsentMode } from '../gcm';

describe('Registry', () => {
  beforeEach(() => {
    __resetRegistry();
    __resetResolvers();
    __resetConsentMode();
    servicesList.set([]);
    consentState.set({});
    hasAnswered.set(false);
    window._modernConsentConfig = {};
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
  });

  it('pushes a GCM consent update when a vendor with stored consent declares signals', async () => {
    window._modernConsentConfig = { consentMode: true };
    window.dataLayer = [];
    // @ts-expect-error — reset the stub
    delete window.gtag;
    consentState.set({ ga: true });
    hasAnswered.set(true);

    const loader = vi.fn().mockResolvedValue({
      default: {
        name: 'GA',
        description: '',
        category: 'Analytics',
        requireConsent: true,
        gcm: ['analytics_storage'],
      },
    });
    registerService({ id: 'ga', category: 'Analytics', loader, config: {} });
    await vi.waitFor(() => servicesList.get().length > 0);

    const cmds = window.dataLayer.map(x => Array.from(x as ArrayLike<unknown>));
    expect(cmds.map(c => c[1])).toEqual(['default', 'update']);
    expect(cmds[1][2]).toMatchObject({ analytics_storage: 'granted' });
  });

  describe('clearVendorArtifacts', () => {
    it('cookieDomainCandidates() lists host-only, configured domain and every hostname suffix', () => {
      window._modernConsentConfig = { cookieDomain: '.example.com' };
      // jsdom default hostname is "localhost" → only host-only + configured
      expect(cookieDomainCandidates()).toEqual([undefined, '.example.com']);
    });

    it('expires declared cookies for every domain candidate', async () => {
      const loader = vi.fn().mockResolvedValue({
        default: {
          name: 'V',
          description: '',
          category: 'C',
          requireConsent: true,
          artifacts: (cfg: { id: string }) => ['_ga', `_ga_${cfg.id}`],
        },
      });
      registerService({ id: 'v', category: 'C', loader, config: { id: 'X1' } });
      await vi.waitFor(() => servicesList.get().length > 0);

      window._modernConsentConfig = { cookieDomain: '.example.com' };
      const writes: string[] = [];
      const spy = vi.spyOn(document, 'cookie', 'set').mockImplementation(v => {
        writes.push(v);
      });

      clearVendorArtifacts('v');

      expect(writes).toEqual([
        '_ga=; max-age=0; path=/',
        '_ga=; max-age=0; path=/; domain=.example.com',
        '_ga_X1=; max-age=0; path=/',
        '_ga_X1=; max-age=0; path=/; domain=.example.com',
      ]);
      spy.mockRestore();
    });
  });
});
