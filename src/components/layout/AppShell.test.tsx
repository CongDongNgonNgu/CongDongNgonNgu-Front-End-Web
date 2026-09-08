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
  it("opens and closes the mobile drawer with real public destinations", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getAllByRole("button", { name: "Mở menu" })[0]);

    const drawer = screen.getByRole("dialog", { name: "Community Hub" });
    expect(drawer).toBeVisible();
    expect(within(drawer).getByRole("link", { name: "Khám phá" })).toHaveAttribute("href", "/");
    expect(within(drawer).getByRole("link", { name: "Trao đổi" })).toHaveAttribute("href", "#exchange");
    expect(within(drawer).getByRole("link", { name: "Luyện tập với AI" })).toHaveAttribute("href", "#ai-practice");
    expect(within(drawer).getByRole("link", { name: "Thư viện mở" })).toHaveAttribute("href", "#library");
    expect(within(drawer).getByRole("link", { name: "Ngôn ngữ" })).toHaveAttribute("href", "#languages");
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute("aria-label", "Đóng menu");

    await user.click(screen.getByRole("button", { name: "Đóng menu" }));
    expect(screen.queryByRole("dialog", { name: "Community Hub" })).not.toBeInTheDocument();
  });

  it("opens searchable shell feedback and supports the desktop overflow menu", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getAllByRole("button", { name: "Tìm kiếm" })[0]);
    expect(screen.getByRole("dialog", { name: /tìm kiếm trong cộng đồng/i })).toBeVisible();
    await user.type(screen.getByPlaceholderText("Tìm kiếm trong cộng đồng"), "ngôn ngữ");
    await user.click(screen.getByRole("button", { name: "Tìm" }));
    expect(screen.getByRole("status")).toHaveTextContent(/đã nhận từ khóa/i);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /tìm kiếm trong cộng đồng/i })).not.toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute("aria-label", "Tìm kiếm");

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(screen.getByRole("menu", { name: "Thêm" })).toHaveTextContent("Ngôn ngữ");
    expect(screen.getByRole("menu", { name: "Thêm" })).toHaveTextContent("Cách bắt đầu");
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
  });

  it("renders the logged-in account variant without unavailable badges", () => {
    renderShell(true);

    expect(screen.getAllByRole("button", { name: "Tài khoản" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /đăng nhập, sắp có/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
  });
});
