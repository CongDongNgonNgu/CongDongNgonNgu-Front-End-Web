import { cleanup, renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ApiClientError } from "../../../services/api-client";
import { useGroupCollaboration } from "./useGroupCollaboration";
import type { GroupSyncPage, GroupText } from "../study-groups.types";
afterEach(cleanup);
function text(id: string, sequence = "1"): GroupText {
  return {
    id,
    sequence,
    body: id,
    hidden: false,
    author: { userId: "B", displayName: "B" },
    createdAt: "2026-10-13",
  };
}
function page(
  items: GroupText[],
  overrides: Partial<GroupSyncPage> = {},
): GroupSyncPage {
  return {
    items,
    stillVisibleIds: [],
    cursor: "cursor",
    nextCursor: null,
    hasMore: false,
    version: "1",
    unreadCount: "1",
    lastReadSequence: "0",
    groupRole: "MEMBER",
    groupStatus: "ACTIVE",
    ...overrides,
  };
}
it("serializes bounded catch-up and purges access after a current membership denial", async () => {
  const sync = vi
    .fn()
    .mockResolvedValueOnce(
      page([text("first")], {
        hasMore: true,
        nextCursor: "next",
        cursor: "next",
      }),
    )
    .mockResolvedValueOnce(
      page([text("second", "2")], { stillVisibleIds: ["first"] }),
    )
    .mockRejectedValueOnce(
      new ApiClientError("unavailable", 404, "GROUP_UNAVAILABLE"),
    );
  const lost = vi.fn(),
    api = { sync, markRead: vi.fn() };
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: lost,
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(2));
  expect(sync).toHaveBeenNthCalledWith(1, "g", { limit: 20, renderedIds: [] });
  expect(sync).toHaveBeenNthCalledWith(2, "g", {
    limit: 20,
    cursor: "next",
    renderedIds: ["first"],
  });
  await act(async () => result.current.reconcile());
  expect(result.current.texts).toEqual([]);
  expect(result.current.unreadCount).toBe("0");
  expect(lost).toHaveBeenCalledOnce();
});
it("drops previously rendered hidden text when the current role loses moderation capability", async () => {
  const sync = vi
    .fn()
    .mockResolvedValueOnce(
      page([{ ...text("hidden"), hidden: true }], { groupRole: "MODERATOR" }),
    )
    .mockResolvedValueOnce(
      page([], { stillVisibleIds: [], groupRole: "MEMBER", unreadCount: "0" }),
    );
  const api = { sync, markRead: vi.fn() },
    lost = vi.fn();
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: lost,
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(1));
  await act(async () => result.current.reconcile());
  expect(result.current.texts).toEqual([]);
  expect(result.current.role).toBe("MEMBER");
});
it("does not restore a previous actor response or preserve protected texts on actor switch", async () => {
  let resolve!: (page: GroupSyncPage) => void;
  const sync = vi
    .fn()
    .mockReturnValueOnce(
      new Promise<GroupSyncPage>((done) => {
        resolve = done;
      }),
    )
    .mockResolvedValueOnce(page([text("B-view")]));
  const api = { sync, markRead: vi.fn() },
    lost = vi.fn();
  const { result, rerender } = renderHook(
    ({ actor }) =>
      useGroupCollaboration({
        api,
        groupId: "g",
        actor,
        enabled: true,
        onAccessLost: lost,
      }),
    { initialProps: { actor: "A" } },
  );
  rerender({ actor: "B" });
  await waitFor(() => expect(result.current.texts[0]?.id).toBe("B-view"));
  await act(async () => resolve(page([text("A-secret")])));
  expect(result.current.texts.map((x) => x.id)).toEqual(["B-view"]);
});

it("marks read using only an observed visible text identity and rejects local future/foreign IDs", async () => {
  const sync = vi.fn().mockResolvedValue(page([text("observed")]));
  const markRead = vi
      .fn()
      .mockResolvedValue({ unreadCount: "0", lastReadSequence: "1" }),
    api = { sync, markRead },
    lost = vi.fn();
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: lost,
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(1));
  await act(async () => result.current.markRead("foreign"));
  expect(markRead).not.toHaveBeenCalled();
  await act(async () => result.current.markRead("observed"));
  expect(markRead).toHaveBeenCalledWith("g", "observed");
  expect(result.current.unreadCount).toBe("0");
});

it("ignores a late older mark-read response after a newer observed read completes", async () => {
  let oldResolve!: (state: {
    lastReadSequence: string;
    unreadCount: number;
  }) => void;
  const sync = vi
    .fn()
    .mockResolvedValue(
      page([text("one", "1"), text("two", "2")], { unreadCount: 2 }),
    );
  const markRead = vi
      .fn()
      .mockReturnValueOnce(
        new Promise((done) => {
          oldResolve = done;
        }),
      )
      .mockResolvedValueOnce({ lastReadSequence: "2", unreadCount: 0 }),
    api = { sync, markRead },
    lost = vi.fn();
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: lost,
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(2));
  act(() => {
    void result.current.markRead("one");
  });
  await act(async () => result.current.markRead("two"));
  await act(async () => oldResolve({ lastReadSequence: "1", unreadCount: 1 }));
  expect(result.current.lastReadSequence).toBe("2");
  expect(result.current.unreadCount).toBe("0");
});

it("keeps the current read position when an older in-flight sync completes and catches up again", async () => {
  let resolveSync!: (value: GroupSyncPage) => void;
  const sync = vi
    .fn()
    .mockResolvedValueOnce(page([text("one")], { unreadCount: 1 }))
    .mockReturnValueOnce(
      new Promise((done) => {
        resolveSync = done;
      }),
    )
    .mockResolvedValueOnce(
      page([], {
        stillVisibleIds: ["one"],
        lastReadSequence: "1",
        unreadCount: 0,
      }),
    );
  const api = {
      sync,
      markRead: vi
        .fn()
        .mockResolvedValue({ lastReadSequence: "1", unreadCount: 0 }),
    },
    lost = vi.fn();
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: lost,
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(1));
  act(() => {
    void result.current.reconcile();
  });
  await act(async () => result.current.markRead("one"));
  await act(async () =>
    resolveSync(
      page([], {
        stillVisibleIds: ["one"],
        lastReadSequence: "0",
        unreadCount: 1,
      }),
    ),
  );
  expect(result.current.lastReadSequence).toBe("1");
  expect(result.current.unreadCount).toBe("0");
  expect(sync).toHaveBeenCalledTimes(3);
});

it("purges a stale membership cursor and allows an explicit fresh-generation retry", async () => {
  const sync = vi
    .fn()
    .mockResolvedValueOnce(page([text("old")]))
    .mockRejectedValueOnce(
      new ApiClientError("cursor", 400, "GROUP_INVALID_CURSOR"),
    )
    .mockResolvedValueOnce(
      page([text("rejoined")], { cursor: "new-generation" }),
    );
  const api = { sync, markRead: vi.fn() },
    lost = vi.fn();
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: lost,
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(1));
  await act(async () => result.current.reconcile());
  expect(result.current.texts).toEqual([]);
  expect(result.current.epoch).toBe(1);
  await act(async () => result.current.reconcile());
  expect(sync).toHaveBeenLastCalledWith("g", { limit: 20, renderedIds: [] });
  expect(result.current.texts[0].id).toBe("rejoined");
});

it("does not overwrite newer sync unread state with an equal-position delayed read", async () => {
  let finish!: (value: {
    lastReadSequence: string;
    unreadCount: number;
  }) => void;
  const sync = vi
    .fn()
    .mockResolvedValueOnce(
      page([text("one")], { lastReadSequence: "1", unreadCount: 0 }),
    )
    .mockResolvedValue(
      page([text("two", "2")], {
        stillVisibleIds: ["one"],
        version: "2",
        lastReadSequence: "1",
        unreadCount: 1,
      }),
    );
  const api = {
    sync,
    markRead: vi.fn().mockReturnValue(
      new Promise((done) => {
        finish = done;
      }),
    ),
  };
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: vi.fn(),
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(1));
  act(() => {
    void result.current.markRead("one");
  });
  await act(async () => result.current.reconcile());
  await act(async () => finish({ lastReadSequence: "1", unreadCount: 0 }));
  expect(result.current.unreadCount).toBe("1");
});

it("refreshes already-rendered hidden flags for a current moderator", async () => {
  const sync = vi
    .fn()
    .mockResolvedValueOnce(page([text("one")], { groupRole: "MODERATOR" }))
    .mockResolvedValueOnce(
      page([], {
        stillVisibleIds: ["one"],
        hiddenIds: ["one"],
        groupRole: "MODERATOR",
        version: "2",
        unreadCount: 0,
      }),
    );
  const api = { sync, markRead: vi.fn() };
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: vi.fn(),
    }),
  );
  await waitFor(() => expect(result.current.texts).toHaveLength(1));
  await act(async () => result.current.reconcile());
  expect(result.current.texts[0].hidden).toBe(true);
  await act(async () => result.current.markRead("one"));
  expect(api.markRead).not.toHaveBeenCalled();
});

it("makes one bounded fresh projection when promotion grants hidden-text moderation", async () => {
  const sync = vi
    .fn()
    .mockResolvedValueOnce(page([], { cursor: "head" }))
    .mockResolvedValueOnce(page([], { groupRole: "MODERATOR", cursor: "head" }))
    .mockResolvedValueOnce(
      page([{ ...text("hidden"), hidden: true }], {
        groupRole: "MODERATOR",
        cursor: "head",
      }),
    );
  const api = { sync, markRead: vi.fn() };
  const { result } = renderHook(() =>
    useGroupCollaboration({
      api,
      groupId: "g",
      actor: "A",
      enabled: true,
      onAccessLost: vi.fn(),
    }),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => result.current.reconcile());
  expect(sync).toHaveBeenLastCalledWith("g", { limit: 20, renderedIds: [] });
  expect(result.current.texts[0].hidden).toBe(true);
});
