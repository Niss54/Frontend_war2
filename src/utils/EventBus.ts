export type EventCallback = (payload: any) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: string, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => cb(payload));
    }
  }
}

export const eventBus = new EventBus();

// Core Events
export const FLIGHT_STATUS_CHANGED = 'FLIGHT_STATUS_CHANGED';
