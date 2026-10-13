import type { GroupWriteInput } from "./study-groups.types";

/** Retry identity belongs to exactly one immutable draft payload and never to storage. */
export class GroupSendAttempt {
  private current: { payload: string; id: string } | null = null;
  constructor(
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}
  input(draft: Omit<GroupWriteInput, "clientMessageId">): GroupWriteInput {
    const payload = JSON.stringify(draft);
    if (!this.current || this.current.payload !== payload)
      this.current = { payload, id: this.createId() };
    return { ...draft, clientMessageId: this.current.id };
  }
  clear() {
    this.current = null;
  }
}
