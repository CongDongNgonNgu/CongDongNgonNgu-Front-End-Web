import { ApiClientError } from "../../../services/api-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseMessageSequence } from "../../communication/sequence";
import { isAccessLost } from "../study-groups.policy";
import type {
  GroupReadState,
  GroupRole,
  GroupSyncInput,
  GroupSyncPage,
  GroupText,
} from "../study-groups.types";
interface CollaborationApi {
  sync(groupId: string, input: GroupSyncInput): Promise<GroupSyncPage>;
  markRead(groupId: string, textId: string): Promise<GroupReadState>;
}
interface Options {
  api: CollaborationApi;
  groupId: string;
  actor: string;
  enabled: boolean;
  onAccessLost: (error: unknown) => void;
  onBeforeReconcile?: () => void;
}
interface Snapshot {
  epoch: number;
  texts: GroupText[];
  cursor?: string;
  version: string;
  unreadCount: string;
  lastReadSequence: string;
  role: GroupRole;
  loading: boolean;
  error: unknown;
  accessLost: boolean;
}
const empty = (): Snapshot => ({
  epoch: 0,
  cursor: undefined,
  texts: [],
  version: "0",
  unreadCount: "0",
  lastReadSequence: "0",
  role: "MEMBER",
  loading: true,
  error: null,
  accessLost: false,
});
function unread(value: number | string): string {
  const normalized =
    typeof value === "number" && Number.isSafeInteger(value)
      ? String(value)
      : value;
  const count = parseMessageSequence(normalized);
  if (count > 20n) throw new Error("Invalid bounded unread count");
  return String(count);
}
export function useGroupCollaboration({
  api,
  groupId,
  actor,
  enabled,
  onAccessLost,
  onBeforeReconcile,
}: Options) {
  const owner = useMemo(
    () => ({
      api,
      groupId,
      actor,
      enabled,
      alive: true,
      readRequest: 0,
      syncRevision: 0,
      snapshot: empty(),
      work: null as Promise<void> | null,
      pending: false,
    }),
    [api, groupId, actor, enabled],
  );
  const current = useRef(owner);
  current.current = owner;
  const lost = useRef(onAccessLost);
  lost.current = onAccessLost;
  const before = useRef(onBeforeReconcile);
  before.current = onBeforeReconcile;
  const [state, setState] = useState({ owner, snapshot: owner.snapshot });
  const active = () =>
    current.current === owner &&
    owner.alive &&
    owner.enabled &&
    Boolean(owner.actor) &&
    !owner.snapshot.accessLost;
  const publish = (patch: Partial<Snapshot>) => {
    if (current.current !== owner) return;
    owner.snapshot = { ...owner.snapshot, ...patch };
    setState({ owner, snapshot: owner.snapshot });
  };
  const fail = (error: unknown) => {
    if (current.current !== owner || !owner.alive) return;
    if (isAccessLost(error)) {
      publish({ ...empty(), loading: false, error, accessLost: true });
      lost.current(error);
    } else if (
      error instanceof ApiClientError &&
      error.code === "GROUP_INVALID_CURSOR"
    ) {
      before.current?.();
      publish({
        ...empty(),
        epoch: owner.snapshot.epoch + 1,
        loading: false,
        error,
      });
    } else publish({ loading: false, error });
  };
  const reconcile = useCallback((): Promise<void> => {
    if (!active()) return Promise.resolve();
    owner.pending = true;
    if (owner.work) return owner.work;
    before.current?.();
    owner.work = (async () => {
      let calls = 0;
      do {
        owner.pending = false;
        let pages = 0,
          hasMore: boolean;
        do {
          if (++calls > 4) throw new Error("Group catch-up requires retry");
          const previous = owner.snapshot;
          const result = await api.sync(groupId, {
            limit: 20,
            ...(previous.cursor ? { cursor: previous.cursor } : {}),
            renderedIds: previous.texts.slice(-20).map((x) => x.id),
          });
          if (!active()) return;
          parseMessageSequence(result.version);
          parseMessageSequence(result.lastReadSequence);
          const unreadCount = unread(result.unreadCount);
          if (
            result.groupStatus !== "ACTIVE" ||
            !["OWNER", "MODERATOR", "MEMBER"].includes(result.groupRole)
          )
            throw new Error("Invalid group sync");
          if (
            !result.cursor ||
            result.items.length > 20 ||
            result.stillVisibleIds.length > 20
          )
            throw new Error("Invalid bounded group sync");
          const visible = new Set(result.stillVisibleIds),
            hidden = new Set(result.hiddenIds ?? []);
          if (hidden.size > 20 || [...hidden].some((id) => !visible.has(id)))
            throw new Error("Invalid hidden group projection");
          if (!previous.loading && result.groupRole !== previous.role) {
            ++owner.syncRevision;
            publish({
              texts: [],
              cursor: undefined,
              role: result.groupRole,
              loading: true,
            });
            owner.pending = true;
            break;
          }
          const items = new Map(
            previous.texts
              .filter((x) => visible.has(x.id))
              .map((x) => [x.id, { ...x, hidden: hidden.has(x.id) }]),
          );
          for (const text of result.items) {
            if (!text.sequence || parseMessageSequence(text.sequence) === 0n)
              throw new Error("Invalid group sequence");
            items.set(text.id, text);
          }
          const texts = [...items.values()]
            .filter((x) => !x.hidden || result.groupRole !== "MEMBER")
            .sort((a, b) =>
              parseMessageSequence(a.sequence!) <
              parseMessageSequence(b.sequence!)
                ? -1
                : 1,
            )
            .slice(-20);
          const staleRead =
            parseMessageSequence(result.lastReadSequence) <
            parseMessageSequence(owner.snapshot.lastReadSequence);
          if (staleRead) owner.pending = true;
          ++owner.syncRevision;
          publish({
            texts,
            cursor: result.cursor,
            version: result.version,
            unreadCount: staleRead ? owner.snapshot.unreadCount : unreadCount,
            lastReadSequence: staleRead
              ? owner.snapshot.lastReadSequence
              : result.lastReadSequence,
            role: result.groupRole,
            loading: false,
            error: null,
          });
          hasMore = result.hasMore;
          if (
            hasMore &&
            (!result.nextCursor ||
              result.nextCursor !== result.cursor ||
              previous.cursor === result.cursor)
          )
            throw new Error("Invalid group continuation");
          if (++pages >= 4 && hasMore)
            throw new Error("Group catch-up requires retry");
        } while (hasMore && active());
      } while (owner.pending && active());
    })()
      .catch(fail)
      .finally(() => {
        owner.work = null;
      });
    return owner.work;
    // The owner object is the complete actor/group/API lifetime; callbacks use current refs.
  }, [owner]);
  useEffect(() => {
    owner.alive = true;
    void reconcile();
    return () => {
      owner.alive = false;
      owner.pending = false;
    };
  }, [owner, reconcile]);
  const markRead = async (textId: string) => {
    if (
      !active() ||
      !owner.snapshot.texts.some((x) => x.id === textId && !x.hidden)
    )
      return;
    const request = ++owner.readRequest,
      revision = owner.syncRevision;
    try {
      const result = await api.markRead(groupId, textId);
      if (!active() || request !== owner.readRequest) return;
      if (revision !== owner.syncRevision) {
        await reconcile();
        return;
      }
      if (
        parseMessageSequence(result.lastReadSequence) >=
        parseMessageSequence(owner.snapshot.lastReadSequence)
      )
        publish({
          unreadCount: unread(result.unreadCount),
          lastReadSequence: result.lastReadSequence,
        });
    } catch (error) {
      fail(error);
    }
  };
  const clear = useCallback(
    (error: unknown) => {
      if (current.current === owner) fail(error);
    },
    [owner],
  );
  const snapshot = state.owner === owner && enabled ? state.snapshot : empty();
  return {
    ...snapshot,
    texts: enabled ? snapshot.texts : [],
    unreadCount: enabled ? snapshot.unreadCount : "0",
    reconcile,
    markRead,
    clear,
  };
}
