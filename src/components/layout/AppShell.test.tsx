import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

afterEach(cleanup);

function renderShell(isAuthenticated = false) {
  return render(<MemoryRouter><AppShell isAuthenticated={isAuthenticated}><p>Nội dung kiểm thử</p></AppShell></MemoryRouter>);
}

describe("AppShell", () => {
  it("opens and closes the mobile drawer with future routes gated", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Mở menu" }));

    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(drawer).toBeVisible();
    expect(within(drawer).getByRole("link", { name: "Trang chủ" })).toHaveAttribute("href", "/");
    expect(screen.getAllByText("Sắp có").length).toBeGreaterThan(5);
    expect(document.activeElement).toHaveAttribute("aria-label", "Đóng menu");

    await user.click(screen.getByRole("button", { name: "Đóng menu" }));
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("opens searchable shell feedback and supports the desktop overflow menu", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getAllByRole("button", { name: "Tìm kiếm" })[0]);
    expect(screen.getByRole("dialog", { name: /tìm kiếm trong cộng đồng/i })).toBeVisible();
    await user.type(screen.getByPlaceholderText("Tìm kiếm trong cộng đồng"), "ngôn ngữ");
    await user.click(screen.getByRole("button", { name: "Tìm" }));
    expect(screen.getByRole("status")).toHaveTextContent(/tìm kiếm sẽ khả dụng/i);

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByRole("menu", { name: "Thêm" })).toHaveTextContent("Phòng nói");
    expect(screen.getByRole("menu", { name: "Thêm" })).toHaveTextContent("Sắp có");
  });

  it("renders the logged-in account variant without activating auth routes", () => {
    renderShell(true);

    expect(screen.getAllByRole("button", { name: "Tài khoản" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /đăng nhập, sắp có/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Sắp có").length).toBeGreaterThan(4);
  });
});