export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;

export class Store<T> {
  private value: T;
  private subscribers: Set<Subscriber<T>> = new Set();

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    if (this.value !== newValue) {
      this.value = newValue;
      this.notify();
    }
  }

  update(updater: (value: T) => T): void {
    this.set(updater(this.value));
  }

  subscribe(callback: Subscriber<T>): Unsubscriber {
    this.subscribers.add(callback);
    callback(this.value); // Appel immédiat
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach(cb => cb(this.value));
  }
}