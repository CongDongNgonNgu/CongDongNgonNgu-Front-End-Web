import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StudyGroupPageView } from "./StudyGroupPage";
import { StudyGroupsApi } from "../study-groups.api";
import { ApiClientError } from "../../../services/api-client";
import { UiLocaleProvider } from "../../ui-locale/UiLocaleProvider";
import type { GroupRole } from "../study-groups.types";
import type { ConnectionListApi } from "../../exchange/exchange.types";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("offers the connected invitation flow for the current owned group", async () => {
  const api = fake();
  const listConnections = vi
    .fn()
    .mockResolvedValue({
      items: [
        {
          connectionId: "pair",
          targetUserId: "partner",
          displayName: "Connected Partner",
          state: "CONNECTED",
          updatedAt: "",
        },
      ],
      nextCursor: null,
    });
  view(api, "OWNER", { listConnections });
  await userEvent.click(
    await screen.findByRole("button", { name: "Invite a connected partner" }),
  );
  await userEvent.click(
    await screen.findByRole("radio", { name: /Connected Partner/ }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Create invitation code" }),
  );
  await screen.findByDisplayValue("connected-secret");
  expect(api.issueConnectedPartner).toHaveBeenCalledWith("g", "partner");
  expect(api.issue).not.toHaveBeenCalled();
});
it("does not offer connected invitations to a group member", async () => {
  const listConnections = vi.fn();
  view(fake("MEMBER"), "MEMBER", { listConnections });
  await screen.findByRole("heading", { name: "Synthetic group" });
  expect(
    screen.queryByRole("button", { name: "Invite a connected partner" }),
  ).not.toBeInTheDocument();
  expect(listConnections).not.toHaveBeenCalled();
});
const page = (items: unknown[]) => ({
  items,
  page: 1,
  limit: 20,
  total: items.length,
});
function fake(role: GroupRole = "OWNER") {
  return {
    get: vi.fn().mockResolvedValue({
      id: "g",
      name: "Synthetic group",
      description: "group only",
      role,
      status: "ACTIVE",
      createdAt: "2026-10-07",
      updatedAt: "2026-10-07",
    }),
    members: vi.fn().mockResolvedValue(
      page([
        { userId: "o", displayName: "Owner", role: "OWNER", joinedAt: "" },
        { userId: "u", displayName: "Target", role: "MEMBER", joinedAt: "" },
      ]),
    ),
    texts: vi.fn().mockResolvedValue(
      page([
        {
          id: "t",
          body: "Synthetic protected text",
          hidden: false,
          author: { userId: "u", displayName: "Target" },
          createdAt: "2026-10-07",
        },
      ]),
    ),
    invitations: vi.fn().mockResolvedValue(
      page([
        {
          id: "i",
          state: "UNUSED",
          expiresAt: "2026-10-08",
          createdAt: "2026-10-07",
        },
      ]),
    ),
    reports: vi.fn().mockResolvedValue(
      page([
        {
          id: "r",
          textId: "t",
          reason: "Synthetic reason",
          status: "OPEN",
          createdAt: "",
        },
      ]),
    ),
    issue: vi.fn().mockResolvedValue({
      id: "i",
      token: "synthetic-secret",
      expiresAt: "2026-10-08",
    }),
    issueConnectedPartner: vi
      .fn()
      .mockResolvedValue({
        id: "connected-i",
        token: "connected-secret",
        expiresAt: "2030-01-01T00:00:00Z",
      }),
    transfer: vi.fn().mockResolvedValue({}),
    leave: vi.fn().mockResolvedValue({ left: true }),
    archive: vi.fn().mockResolvedValue({ archived: true }),
    role: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
    hide: vi.fn().mockResolvedValue({}),
    report: vi.fn().mockResolvedValue({}),
    revoke: vi.fn().mockResolvedValue({}),
    resolve: vi.fn().mockResolvedValue({}),
    sync: vi
      .fn()
      .mockResolvedValue({
        items: [
          {
            id: "t",
            sequence: "1",
            body: "Synthetic protected text",
            hidden: false,
            author: { userId: "u", displayName: "Target" },
            createdAt: "2026-10-07",
          },
        ],
        stillVisibleIds: ["t"],
        cursor: "cursor",
        nextCursor: null,
        hasMore: false,
        version: "1",
        unreadCount: "1",
        lastReadSequence: "0",
        groupRole: role,
        groupStatus: "ACTIVE",
      }),
    markRead: vi
      .fn()
      .mockResolvedValue({ unreadCount: "0", lastReadSequence: "1" }),
    context: vi.fn().mockResolvedValue({ textId: "t", context: null }),
    write: vi.fn().mockResolvedValue({}),
  };
}
function view(
  api: ReturnType<typeof fake>,
  role: GroupRole = "OWNER",
  connectionsApi?: Pick<ConnectionListApi, "listConnections">,
) {
  localStorage.setItem("congdongngonngu.ui-locale.v1", "en");
  return render(
    <UiLocaleProvider>
      <MemoryRouter initialEntries={["/community/groups/g"]}>
        <Routes>
          <Route
            path="/community/groups/g"
            element={
              <StudyGroupPageView
                api={api as unknown as StudyGroupsApi}
                connectionsApi={connectionsApi}
                groupId="g"
                userId={role === "OWNER" ? "o" : "u"}
                authenticated
              />
            }
          />
          <Route
            path="/community/groups"
            element={<p>Group list destination</p>}
          />
        </Routes>
      </MemoryRouter>
    </UiLocaleProvider>,
  );
}
describe("group page journey", () => {
  it("archive requires target group confirmation and clears all protected state after success", async () => {
    const api = fake();
    view(api);
    await screen.findByText("Synthetic group");
    await userEvent.click(
      screen.getByRole("button", { name: "Archive group" }),
    );
    expect(api.archive).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Selected group: Synthetic group",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "All members lose access",
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await screen.findByText("Group list destination");
    expect(api.archive).toHaveBeenCalledWith("g");
    expect(screen.queryByText("Synthetic protected text")).toBeNull();
  });
  it("member leave is confirmed and does not load privileged report or invitation data", async () => {
    const api = fake("MEMBER");
    view(api, "MEMBER");
    await screen.findByText("Synthetic group");
    await userEvent.click(screen.getByRole("button", { name: "Leave group" }));
    expect(api.leave).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "authored texts are retained",
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(api.leave).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("quota failures preserve current protected view and safe feedback without raw backend messages", async () => {
    const api = fake();
    api.issue.mockRejectedValue(
      new ApiClientError("database-secret", 409, "GROUP_LIMIT_REACHED"),
    );
    view(api);
    await screen.findByText("Synthetic group");
    await userEvent.click(
      screen.getByRole("button", { name: "Issue invitation" }),
    );
    await screen.findByText(/pilot capacity has been reached/);
    expect(screen.getByText("Synthetic protected text")).toBeVisible();
    expect(screen.queryByText("database-secret")).toBeNull();
  });

  it("fresh owner role loss discards a revealed secret before role restoration", async () => {
    const api = fake();
    view(api);
    await screen.findByText("Synthetic group");
    api.get.mockResolvedValueOnce({ ...(await api.get()), role: "MEMBER" });
    await userEvent.click(
      screen.getByRole("button", { name: "Issue invitation" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Leave group" })).toBeVisible(),
    );
    expect(screen.queryByDisplayValue("synthetic-secret")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Report content" }),
    );
    await userEvent.type(screen.getByLabelText(/Report reason/), "safe reason");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Issue invitation" }),
      ).toBeVisible(),
    );
    expect(screen.queryByDisplayValue("synthetic-secret")).toBeNull();
  });
  it.each(["MEMBER", "MODERATOR", "OWNER"] as const)(
    "loads only current %s capability projections",
    async (role) => {
      const api = fake(role);
      view(api, role);
      await screen.findByText("Synthetic group");
      expect(api.invitations).toHaveBeenCalledTimes(role === "OWNER" ? 1 : 0);
      expect(api.reports).toHaveBeenCalledTimes(role === "MEMBER" ? 0 : 1);
      if (role === "OWNER")
        expect(
          screen.getByRole("button", { name: "Archive group" }),
        ).toBeVisible();
      else
        expect(
          screen.queryByRole("button", { name: "Archive group" }),
        ).toBeNull();
      localStorage.clear();
    },
  );
  it("ownership transfer is explicitly confirmed then reloads fresh role", async () => {
    const api = fake();
    view(api);
    await screen.findByText("Synthetic group");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Group members" }));
    await user.click(
      screen.getByRole("button", { name: "Transfer ownership" }),
    );
    expect(api.transfer).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("you become a member");
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Selected member: Target",
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(api.transfer).toHaveBeenCalledWith("g", "u"));
    localStorage.clear();
  });
  it("raw invitation is displayed once and removed when closed without storage", async () => {
    const api = fake();
    view(api);
    await screen.findByText("Synthetic group");
    await userEvent.click(
      screen.getByRole("button", { name: "Issue invitation" }),
    );
    const field = await screen.findByDisplayValue("synthetic-secret");
    expect(field).toBeVisible();
    expect(location.search).toBe("");
    expect(Object.values(localStorage)).not.toContain("synthetic-secret");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Close dialog" })[0],
    );
    expect(screen.queryByDisplayValue("synthetic-secret")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Invitations" }));
    expect(screen.queryByDisplayValue("synthetic-secret")).toBeNull();
    localStorage.clear();
  });
  it("denial during invitation refresh never restores token or protected content", async () => {
    const api = fake();
    view(api);
    await screen.findByText("Synthetic group");
    api.get.mockRejectedValueOnce(
      new ApiClientError("safe", 404, "GROUP_UNAVAILABLE"),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Issue invitation" }),
    );
    await screen.findByText(/group or invitation is unavailable/i);
    expect(screen.queryByDisplayValue("synthetic-secret")).toBeNull();
    expect(screen.queryByText("Synthetic protected text")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Synthetic group");
    expect(screen.queryByDisplayValue("synthetic-secret")).toBeNull();
    localStorage.clear();
  });
  it("late invitation result after scope change cannot show the former secret", async () => {
    const api = fake();
    let finish!: (v: unknown) => void;
    api.issue.mockImplementation(() => new Promise((r) => (finish = r)));
    const rendered = view(api);
    await screen.findByText("Synthetic group");
    await userEvent.click(
      screen.getByRole("button", { name: "Issue invitation" }),
    );
    rendered.unmount();
    await act(async () =>
      finish({ id: "i", token: "stale-secret", expiresAt: "2026-10-08" }),
    );
    expect(screen.queryByDisplayValue("stale-secret")).toBeNull();
    localStorage.clear();
  });
});

it("purges discussion bodies and unsent drafts when a current sync loses membership", async () => {
  const api = fake("MEMBER");
  view(api, "MEMBER");
  await screen.findByText("Synthetic protected text");
  const draft = screen.getByRole("textbox", { name: "Text content" });
  await userEvent.type(draft, "Unsent private draft");
  api.sync.mockRejectedValueOnce(
    new ApiClientError("removed", 404, "GROUP_UNAVAILABLE"),
  );
  await userEvent.click(screen.getByRole("button", { name: "Sync texts" }));
  await waitFor(() =>
    expect(screen.queryByText("Synthetic protected text")).toBeNull(),
  );
  expect(screen.queryByDisplayValue("Unsent private draft")).toBeNull();
  expect(screen.queryByRole("textbox", { name: "Text content" })).toBeNull();
});

it("reconciles a hidden reference denial without discarding an active group draft", async () => {
  const api = fake("MEMBER");
  const shared = {
    id: "t",
    sequence: "1",
    body: "Synthetic protected text",
    hidden: false,
    author: { userId: "u", displayName: "Target" },
    createdAt: "2026-10-07",
    context: { availability: "UNAVAILABLE" },
  };
  api.sync.mockResolvedValueOnce({
    items: [shared],
    stillVisibleIds: ["t"],
    cursor: "cursor",
    nextCursor: null,
    hasMore: false,
    version: "1",
    unreadCount: 1,
    lastReadSequence: "0",
    groupRole: "MEMBER",
    groupStatus: "ACTIVE",
  });
  api.context.mockResolvedValueOnce({
    textId: "t",
    context: {
      availability: "AVAILABLE",
      type: "COMMUNITY_POST",
      id: "00000000-0000-4000-8000-000000000001",
      category: "DISCUSSION",
      languageCode: "en",
      previewText: "Current reference",
      canonicalPath: "/community/posts/00000000-0000-4000-8000-000000000001",
    },
  });
  view(api, "MEMBER");
  await screen.findByText("Current reference");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Text content" }),
    "Keep my draft",
  );
  api.context.mockRejectedValueOnce(
    new ApiClientError("hidden", 404, "GROUP_UNAVAILABLE"),
  );
  api.sync.mockResolvedValue({
    items: [],
    stillVisibleIds: [],
    cursor: "cursor-2",
    nextCursor: null,
    hasMore: false,
    version: "2",
    unreadCount: 0,
    lastReadSequence: "0",
    groupRole: "MEMBER",
    groupStatus: "ACTIVE",
  });
  await userEvent.click(screen.getByRole("button", { name: "Sync texts" }));
  await waitFor(() =>
    expect(screen.queryByText("Synthetic protected text")).toBeNull(),
  );
  expect(
    screen.getByRole("heading", { name: "Synthetic group" }),
  ).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Text content" })).toHaveValue(
    "Keep my draft",
  );
});

it("closes a privileged pending confirmation on role downgrade while preserving the draft", async () => {
  const api = fake("OWNER");
  view(api);
  await screen.findByText("Synthetic protected text");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Text content" }),
    "Draft after downgrade",
  );
  await userEvent.click(screen.getByRole("button", { name: "Archive group" }));
  expect(screen.getByRole("dialog")).toBeVisible();
  api.get.mockResolvedValue({
    id: "g",
    name: "Synthetic group",
    description: "group only",
    role: "MEMBER",
    status: "ACTIVE",
    createdAt: "2026-10-07",
    updatedAt: "2026-10-07",
  });
  api.sync.mockResolvedValue({
    items: [],
    stillVisibleIds: ["t"],
    cursor: "cursor",
    nextCursor: null,
    hasMore: false,
    version: "2",
    unreadCount: 0,
    lastReadSequence: "0",
    groupRole: "MEMBER",
    groupStatus: "ACTIVE",
  });
  act(() => window.dispatchEvent(new Event("focus")));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(api.archive).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "Text content" })).toHaveValue(
    "Draft after downgrade",
  );
});
