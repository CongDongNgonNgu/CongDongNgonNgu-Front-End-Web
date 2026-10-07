import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StudyGroupPageView } from "./StudyGroupPage";
import { StudyGroupsApi } from "../study-groups.api";
import { ApiClientError } from "../../../services/api-client";
import { UiLocaleProvider } from "../../ui-locale/UiLocaleProvider";
import type { GroupRole } from "../study-groups.types";
afterEach(() => {
  cleanup();
  localStorage.clear();
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
    transfer: vi.fn().mockResolvedValue({}),
    leave: vi.fn().mockResolvedValue({ left: true }),
    archive: vi.fn().mockResolvedValue({ archived: true }),
    role: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue({}),
    hide: vi.fn().mockResolvedValue({}),
    report: vi.fn().mockResolvedValue({}),
    revoke: vi.fn().mockResolvedValue({}),
    resolve: vi.fn().mockResolvedValue({}),
    write: vi.fn().mockResolvedValue({}),
  };
}
function view(api: ReturnType<typeof fake>, role: GroupRole = "OWNER") {
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
