// Lightweight cross-view event bus. Lets views invalidate each other when
// the same underlying data is mutated from a different surface (content
// drawer ↔ contents list ↔ cluster table). No dependencies, no React
// context — module-level singleton works from any client component.

export type SyncEvent =
  | { type: 'content:changed'; slug: string; fields?: string[] }
  | { type: 'cluster:changed'; slug: string }
  | { type: 'clusters:changed' };

export type SyncHandler = (event: SyncEvent) => void;

const handlers = new Set<SyncHandler>();

function emit(event: SyncEvent): void {
  // Snapshot to tolerate handlers unsubscribing during dispatch.
  const snapshot = Array.from(handlers);
  for (const handler of snapshot) {
    try {
      handler(event);
    } catch {
      // Listener errors must not break sibling listeners.
    }
  }
}

function on(handler: SyncHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export const syncBus = {
  emit,
  on,
};
