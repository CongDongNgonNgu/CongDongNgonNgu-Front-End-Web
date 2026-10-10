import type { MessageContextApi, MessageContextCard } from './messaging.types';

type Sink = (card: MessageContextCard | undefined) => void;
interface Waiter { generation: number; resolve: (card: MessageContextCard | null) => void }

// One instance belongs to one actor/conversation lifetime. Immutable messages
// never populate this cache: only a current protected context response can do so.
export class MessageContextRefresh {
  private readonly abort = new AbortController();
  private readonly sinks = new Map<string, Sink>();
  private readonly displayed = new Set<string>();
  private readonly cards = new Map<string, MessageContextCard>();
  private readonly queued = new Set<string>();
  private readonly attempted = new Map<string, number>();
  private readonly waiters = new Map<string, Waiter[]>();
  private generation = 0;
  private working = false;

  constructor(private readonly api: MessageContextApi, private readonly conversationId: string) {}

  watch(id: string, sink: Sink): () => void {
    if (this.abort.signal.aborted) return () => undefined;
    this.sinks.set(id, sink);sink(this.cards.get(id));
    return () => {
      if (this.sinks.get(id) !== sink) return;
      this.sinks.delete(id);this.displayed.delete(id);this.cards.delete(id);this.queued.delete(id);
      this.attempted.delete(id);
      for (const waiter of this.waiters.get(id) ?? []) waiter.resolve(null);
      this.waiters.delete(id);
    };
  }

  visible(id: string, visible: boolean): void {
    if (this.abort.signal.aborted || !this.sinks.has(id)) return;
    if (visible) this.displayed.add(id);
    else {
      this.displayed.delete(id);this.queued.delete(id);
      for (const waiter of this.waiters.get(id) ?? []) waiter.resolve(null);
      this.waiters.delete(id);
    }
    this.fill();void this.pump();
  }

  invalidate(): void {
    if (this.abort.signal.aborted) return;
    this.mask();
    // Preserve queue order. A superseded in-flight card goes behind cards that
    // were already waiting, so repeated invalidation does not favor the first.
    this.fill();void this.pump();
  }

  recheck(id: string): Promise<MessageContextCard | null> {
    if (this.abort.signal.aborted) return Promise.resolve(null);
    this.mask();
    if (this.queued.size >= 50 && !this.queued.has(id)) return Promise.resolve(null);
    const promise = new Promise<MessageContextCard | null>(resolve => {
      const list = this.waiters.get(id) ?? [];
      list.push({ generation: this.generation, resolve });this.waiters.set(id, list);
    });
    this.queued.add(id);this.fill();void this.pump();return promise;
  }

  dispose(): void {
    this.abort.abort();this.cards.clear();this.queued.clear();
    for (const sink of this.sinks.values()) sink(undefined);
    this.sinks.clear();this.displayed.clear();this.attempted.clear();
    for (const list of this.waiters.values()) for (const waiter of list) waiter.resolve(null);
    this.waiters.clear();
  }

  private fill(): void {
    for (const id of this.displayed) {
      if (this.queued.size >= 50) break;
      if (this.attempted.get(id) !== this.generation) this.queued.add(id);
    }
  }

  private mask(): void {
    ++this.generation;this.cards.clear();
    for (const sink of this.sinks.values()) sink(undefined);
  }

  private async pump(): Promise<void> {
    if (this.working || this.abort.signal.aborted) return;
    this.working = true;
    try {
      while (this.queued.size && !this.abort.signal.aborted) {
        const id = this.queued.values().next().value!;
        this.queued.delete(id);const generation = this.generation;
        this.attempted.set(id, generation);
        let card: MessageContextCard | null = null;
        try {
          const result = await this.api.context(this.conversationId, id, this.abort.signal);
          if (result.messageId === id) card = result.context;
        } catch { /* Failure leaves the card masked; never restore old data. */ }
        if (!this.abort.signal.aborted && generation === this.generation) {
          if (card && this.sinks.has(id)) this.cards.set(id, card);
          if (this.displayed.has(id)) this.sinks.get(id)?.(card ?? undefined);
        }
        const pending = this.waiters.get(id) ?? [];
        const newer = pending.filter(waiter => waiter.generation > generation);
        if (newer.length) this.waiters.set(id, newer);else this.waiters.delete(id);
        for (const waiter of pending.filter(waiter => waiter.generation <= generation))
          waiter.resolve(!this.abort.signal.aborted && waiter.generation === generation
            && generation === this.generation ? card : null);
        this.fill();
      }
    } finally { this.working = false; }
  }
}
