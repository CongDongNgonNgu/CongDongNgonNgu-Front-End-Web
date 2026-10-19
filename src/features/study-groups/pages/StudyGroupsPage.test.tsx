import { it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StudyGroupsPageView } from "./StudyGroupsPage";
import { StudyGroupsApi } from "../study-groups.api";
import type { StudyGroup } from "../study-groups.types";
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
    expect(
      within(screen.getByRole("dialog")).getByText(
        locale === "vi"
          ? /Nhóm luôn riêng tư, chỉ tham gia qua lời mời/
          : /Groups are always private and invitation only/,
      ),
    ).toBeVisible();
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

it.each(["vi", "en"])(
  "shows the fixed private invitation-only label on current membership list: %s",
  async (locale) => {
    const api = fake();
    api.list.mockResolvedValue({
      items: [{
        id: "g",
        name: "Private fixture",
        description: "Only members",
        role: "MEMBER",
        visibility: "PRIVATE_INVITE_ONLY",
        status: "ACTIVE",
        createdAt: "",
        updatedAt: "",
      } satisfies StudyGroup],
      page: 1,
      limit: 20,
      total: 1,
    });
    view(api, true, false, locale);
    const item = (await screen.findByRole("link", { name: "Private fixture" })).closest("li")!;
    expect(within(item).getByText(
      locale === "en" ? "Private · Invitation only" : "Riêng tư · Chỉ qua lời mời",
    )).toBeVisible();
    expect(screen.queryByRole("combobox", { name: /Visibility|Hiển thị/ })).toBeNull();
  },
);

it("explains explicit one-use invitation acceptance and that a group ID alone grants no access", () => {
  view(fake(), true, true, "en");
  expect(screen.getByText(/A group ID alone does not grant access/)).toBeVisible();
  expect(screen.getByText(/issued by the owner/)).toBeVisible();
  expect(screen.getByText(/expires after 24 hours/)).toBeVisible();
  expect(screen.queryByRole("button", { name: /Request to join|Public join/ })).toBeNull();
});

it.each(['vi', 'en'])('guides freeform learning purpose and cancels a create draft: %s', async locale => {
  const api = fake(); view(api, true, false, locale);
  await screen.findByText(locale === 'en' ? 'You have not joined a group yet.' : 'Bạn chưa tham gia nhóm nào.');
  await userEvent.click(screen.getByRole('button', { name: locale === 'en' ? 'Create group' : 'Tạo nhóm' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(locale === 'en'
    ? 'What language will you practise? Describe your goals, level and topics.'
    : 'Bạn muốn luyện ngôn ngữ nào? Chia sẻ mục tiêu, trình độ và chủ đề học.')).toBeVisible();
  expect(within(dialog).getAllByRole('textbox')).toHaveLength(2);
  await userEvent.type(within(dialog).getByRole('textbox', { name: locale === 'en' ? /Group name/ : /Tên nhóm/ }), 'Draft only');
  await userEvent.click(within(dialog).getByRole('button', { name: locale === 'en' ? 'Cancel' : 'Hủy' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.create).not.toHaveBeenCalled();
});
it('gives each authorized group a distinct destination without invented learning fields', async () => {
  const api = fake();
  api.list.mockResolvedValue({ items: [{ id: 'g', name: 'Private fixture', description: 'Vietnamese B1: weekly conversation', role: 'MODERATOR', visibility: 'PRIVATE_INVITE_ONLY', status: 'ACTIVE', createdAt: '', updatedAt: '' }], page: 1, limit: 20, total: 1 });
  view(api, true, false, 'en');
  expect(await screen.findByRole('link', { name: 'Open study group: Private fixture' })).toHaveAttribute('href', '/community/groups/g');
  expect(screen.getByText('Vietnamese B1: weekly conversation')).toBeVisible();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});
it('keeps a failed create draft and announces safe failure inside the dialog', async () => {
  const api = fake(); api.create.mockRejectedValue(new ApiClientError('private backend details', 503, 'UNAVAILABLE'));
  view(api, true, false, 'en');
  await screen.findByText('You have not joined a group yet.');
  await userEvent.click(screen.getByRole('button', { name: 'Create group' }));
  const dialog = screen.getByRole('dialog');
  await userEvent.type(within(dialog).getByRole('textbox', { name: /Group name/ }), 'Keep this draft');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create group' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not complete the request');
  expect(within(dialog).getByRole('textbox', { name: /Group name/ })).toHaveValue('Keep this draft');
  expect(screen.queryByText('private backend details')).not.toBeInTheDocument();
});
