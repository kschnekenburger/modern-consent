import { describe, it, expect, vi } from 'vitest';
import { Store } from '../utils/store';

describe('Store', () => {
  it('should initialize with value', () => {
    const store = new Store(10);
    expect(store.get()).toBe(10);
  });

  it('should update value', () => {
    const store = new Store(10);
    store.set(20);
    expect(store.get()).toBe(20);
  });

  it('should notify subscribers', () => {
    const store = new Store(10);
    const callback = vi.fn();
    store.subscribe(callback);

    // Initial call
    expect(callback).toHaveBeenCalledWith(10);

    store.set(20);
    expect(callback).toHaveBeenCalledWith(20);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe', () => {
    const store = new Store(10);
    const callback = vi.fn();
    const unsubscribe = store.subscribe(callback);

    unsubscribe();
    store.set(20);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalledWith(20);
  });

  it('should update via function', () => {
    const store = new Store(10);
    store.update(n => n + 5);
    expect(store.get()).toBe(15);
  });
});
