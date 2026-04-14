type Listener = () => void;

class EventBus {
  private listeners = new Set<Listener>();

  emit() {
    for (const fn of this.listeners) fn();
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const reminderEvents = new EventBus();
export const adherenceEvents = new EventBus();
