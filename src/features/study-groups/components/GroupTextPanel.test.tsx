import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  UiLocaleProvider,
  useUiLocale,
} from "../../ui-locale/UiLocaleProvider";
import { GroupTextPanel } from "./GroupTextPanel";
afterEach(() => {
  cleanup();
  localStorage.removeItem("congdongngonngu.ui-locale.v1");
});
function LocaleSwitch() {
  const { setLocale } = useUiLocale();
  return <button onClick={() => setLocale("vi")}>Switch locale</button>;
}
function setup(write = vi.fn().mockResolvedValue(true)) {
  localStorage.setItem("congdongngonngu.ui-locale.v1", "en");
  const view = render(
    <UiLocaleProvider>
      <LocaleSwitch />
      <GroupTextPanel
        role="MEMBER"
        texts={[]}
        busy={false}
        onWrite={write}
        onAction={vi.fn()}
      />
    </UiLocaleProvider>,
  );
  return { write, ...view };
}
it("keeps a three-row Unicode editor and retries an unchanged draft with the same client UUID", async () => {
  const user = userEvent.setup(),
    write = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  setup(write);
  const field = screen.getByRole("textbox", { name: "Text content" });
  expect(field).toHaveAttribute("rows", "3");
  expect(field).not.toHaveAttribute("maxlength");
  fireEvent.change(field, { target: { value: "😀".repeat(2000) } });
  await user.click(screen.getByRole("button", { name: "Post text" }));
  await screen.findByRole("button", { name: "Retry draft" });
  expect(field).toHaveValue("😀".repeat(2000));
  await user.click(screen.getByRole("button", { name: "Retry draft" }));
  await waitFor(() => expect(field).toHaveValue(""));
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[0][0]).toEqual(write.mock.calls[1][0]);
  expect(write.mock.calls[0][0].clientMessageId).toMatch(/^[0-9a-f-]{36}$/u);
});
it("rejects a 2001-codepoint draft with a linked field error without losing it", async () => {
  const { write } = setup(),
    field = screen.getByRole("textbox", { name: "Text content" });
  fireEvent.change(field, { target: { value: "😀".repeat(2001) } });
  fireEvent.submit(field.closest("form")!);
  expect(write).not.toHaveBeenCalled();
  expect(field).toHaveAttribute("aria-invalid", "true");
  expect(
    document.getElementById(field.getAttribute("aria-describedby")!),
  ).toHaveAttribute("role", "alert");
  expect(field).toHaveValue("😀".repeat(2001));
});
it("supports an exact canonical reference-only send and preserves link/note across locale change", async () => {
  const user = userEvent.setup(),
    { write } = setup();
  await user.click(
    screen.getByRole("button", { name: "Share a resource or community post" }),
  );
  const url = "/community/posts/11111111-1111-4111-8111-111111111111";
  await user.type(screen.getByRole("textbox", { name: "Content link" }), url);
  await user.click(screen.getByRole("button", { name: "Switch locale" }));
  expect(
    screen.getByRole("textbox", { name: "Liên kết nội dung" }),
  ).toHaveValue(url);
  await user.click(screen.getByRole("button", { name: "Gửi văn bản" }));
  expect(write).toHaveBeenCalledWith({
    contextType: "COMMUNITY_POST",
    contextId: "11111111-1111-4111-8111-111111111111",
    clientMessageId: expect.any(String),
  });
});
it("reveals invalid reference validation when its disclosure was collapsed", async () => {
  const user = userEvent.setup(),
    { write } = setup();
  await user.click(
    screen.getByRole("button", { name: "Share a resource or community post" }),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Content link" }),
    "https://foreign.test/library/11111111-1111-4111-8111-111111111111",
  );
  await user.click(
    screen.getByRole("button", { name: "Share a resource or community post" }),
  );
  await user.click(screen.getByRole("button", { name: "Post text" }));
  expect(screen.getByRole("textbox", { name: "Content link" })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(write).not.toHaveBeenCalled();
});

it("rotates retry identity after explicit draft editing, even when restored to the original text", async () => {
  const user = userEvent.setup(),
    write = vi.fn().mockResolvedValue(false);
  setup(write);
  const field = screen.getByRole("textbox", { name: "Text content" });
  fireEvent.change(field, { target: { value: "original" } });
  await user.click(screen.getByRole("button", { name: "Post text" }));
  await screen.findByRole("button", { name: "Retry draft" });
  fireEvent.change(field, { target: { value: "changed" } });
  fireEvent.change(field, { target: { value: "original" } });
  await user.click(screen.getByRole("button", { name: "Post text" }));
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[0][0].clientMessageId).not.toBe(
    write.mock.calls[1][0].clientMessageId,
  );
});
