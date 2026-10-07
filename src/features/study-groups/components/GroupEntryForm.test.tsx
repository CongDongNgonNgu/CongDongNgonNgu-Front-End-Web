import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GroupEntryForm } from "./GroupEntryForm";
import { UiLocaleProvider } from "../../ui-locale/UiLocaleProvider";
it("accepts pasted invitation only on submit and clears secret after submission", async () => {
  localStorage.setItem("congdongngonngu.ui-locale.v1", "en");
  const submit = vi.fn().mockResolvedValue(true);
  render(
    <UiLocaleProvider>
      <GroupEntryForm mode="accept" busy={false} onSubmit={submit} />
    </UiLocaleProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Group ID/), "group");
  await user.type(screen.getByLabelText(/Secret invitation token/), "secret");
  expect(submit).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: "Join with invitation" }),
  );
  expect(submit).toHaveBeenCalledWith("group", "secret");
  expect(screen.getByLabelText(/Secret invitation token/)).toHaveValue("");
  localStorage.clear();
});
