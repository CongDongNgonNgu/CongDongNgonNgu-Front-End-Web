import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";
import { Dialog } from "./Overlays";
import { ErrorState, Pagination, SearchField, Skeleton } from "./Feedback";
import { CheckboxControl, Tabs, TextInput } from "./FormControls";

afterEach(cleanup);

describe("UI primitives", () => {
  it("exposes loading and disabled button state", () => {
    render(<Button loading>Đang lưu</Button>);

    expect(screen.getByRole("button", { name: "Đang lưu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đang lưu" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Đang lưu" })).toHaveAttribute("data-state", "loading");
  });

  it("connects fields to labels, hints, errors, and checkbox semantics", () => {
    render(<><TextInput label="Tên hiển thị" hint="Tối đa 80 ký tự" error="Tên này chưa hợp lệ" /><CheckboxControl label="Nhớ lựa chọn" /></>);

    expect(screen.getByLabelText("Tên hiển thị")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Tên này chưa hợp lệ")).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Nhớ lựa chọn" })).toBeEnabled();
  });

  it("supports retry, search submission, pagination, and tab callbacks", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const submit = vi.fn();
    const changePage = vi.fn();
    const changeTab = vi.fn();
    render(<>
      <ErrorState title="Đã xảy ra lỗi" description="Thử lại sau." onRetry={retry} />
      <SearchField value="" onChange={vi.fn()} onSubmit={submit} />
      <Pagination page={1} totalPages={2} onChange={changePage} />
      <Tabs tabs={[{ id: "one", label: "Một" }, { id: "two", label: "Hai" }]} value="one" onChange={changeTab} />
    </>);

    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    await user.click(screen.getByRole("button", { name: "Tìm" }));
    await user.click(screen.getByRole("button", { name: "Sau" }));
    await user.click(screen.getByRole("tab", { name: "Hai" }));

    expect(retry).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();
    expect(changePage).toHaveBeenCalledWith(2);
    expect(changeTab).toHaveBeenCalledWith("two");
  });

  it("provides a semantic dialog and an announced skeleton", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<><Dialog open title="Xác nhận" onClose={onClose}>Nội dung hộp thoại</Dialog><Skeleton lines={2} /></>);

    expect(screen.getByRole("dialog", { name: "Xác nhận" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Đang tải nội dung" })).toHaveAttribute("aria-busy", "true");
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});