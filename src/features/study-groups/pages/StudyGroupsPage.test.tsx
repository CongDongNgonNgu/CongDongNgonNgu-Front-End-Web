import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StudyGroupsPageView } from "./StudyGroupsPage";
import { StudyGroupsApi } from "../study-groups.api";
import { UiLocaleProvider } from "../../ui-locale/UiLocaleProvider";
import { ApiClientError } from "../../../services/api-client";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
function fake() {
  return {
    list: vi
      .fn()
      .mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
    create: vi.fn().mockResolvedValue({ id: "g" }),
    accept: vi.fn().mockResolvedValue({ id: "g" }),
  };
}
function view(
  api: ReturnType<typeof fake>,
  signed = true,
  accept = false,
  locale = "vi",
) {
  localStorage.setItem("congdongngonngu.ui-locale.v1", locale);
  return render(
    <UiLocaleProvider>
      <MemoryRouter
        initialEntries={[
          accept ? "/community/groups/invitations" : "/community/groups",
        ]}
      >
        <Routes>
          <Route
            path="/community/groups"
            element={
              <StudyGroupsPageView
                api={api as unknown as StudyGroupsApi}
                authenticated={signed}
                userId="u"
              />
            }
          />
          <Route
            path="/community/groups/invitations"
            element={
              <StudyGroupsPageView
                api={api as unknown as StudyGroupsApi}
                authenticated={signed}
                userId="u"
              />
            }
          />
          <Route
            path="/community/groups/g"
            element={<p>Detail destination</p>}
          />
          <Route path="/login" element={<p>Login destination</p>} />
        </Routes>
      </MemoryRouter>
    </UiLocaleProvider>,
  );
}
it.each(["vi", "en"])(
  "renders locale %s create form preserving optional description",
  async (locale) => {
    const api = fake();
    view(api, true, false, locale);
    await screen.findByText(
      locale === "vi"
        ? "Bạn chưa tham gia nhóm nào."
        : "You have not joined a group yet.",
    );
    await userEvent.click(
      screen.getByRole("button", {
        name: locale === "vi" ? "Tạo nhóm" : "Create group",
      }),
    );
    await userEvent.type(
      screen.getByLabelText(locale === "vi" ? /Tên nhóm/ : /Group name/),
      "  Synthetic group  ",
    );
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: locale === "vi" ? "Tạo nhóm" : "Create group",
      }),
    );
    await screen.findByText("Detail destination");
    expect(api.create).toHaveBeenCalledWith("Synthetic group", "");
  },
);
it("signed-out surface never requests group data and returns to login", async () => {
  const api = fake();
  view(api, false, false, "en");
  expect(api.list).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Sign in to use study groups" }),
  );
  await screen.findByText("Login destination");
});
it("acceptance has no group preview and safely clears invalid token", async () => {
  const api = fake();
  api.accept.mockRejectedValue(
    new ApiClientError("secret-details", 404, "GROUP_UNAVAILABLE"),
  );
  view(api, true, true, "en");
  expect(api.list).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText(/Group ID/), "g");
  await userEvent.type(
    screen.getByLabelText(/Secret invitation token/),
    "invalid-secret",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Join with invitation" }),
  );
  await screen.findByText(/group or invitation is unavailable/i);
  expect(screen.getByLabelText(/Secret invitation token/)).toHaveValue("");
  expect(screen.queryByText("secret-details")).toBeNull();
  expect(location.search).toBe("");
});
