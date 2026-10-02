import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./AppShell";

afterEach(cleanup);

function LocationProbe() {
  const { pathname, hash } = useLocation();
  return <span data-testid="location">{pathname}{hash}</span>;
}

function HistoryControls() {
  const navigate = useNavigate();
  return <><button type="button" onClick={() => navigate(-1)}>Back</button><button type="button" onClick={() => navigate(1)}>Forward</button></>;
}

function renderShell(isAuthenticated = false, initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppShell isAuthenticated={isAuthenticated}>
        <p>Nội dung kiểm thử</p>
        <button type="button">Outside dropdown</button>
        <Link to="/community">Đi tới cộng đồng</Link>
        <LocationProbe />
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell", () => {
  it("handles a rejected logout promise from shell actions", async () => {
    const user = userEvent.setup();
    let rejectLogout!: (reason: Error) => void;
    const logoutPromise = new Promise<void>((_, reject) => {
      rejectLogout = reject;
    });
    const catchSpy = vi.spyOn(logoutPromise, "catch");
    const onLogout = vi.fn(() => logoutPromise);

    render(
      <MemoryRouter>
        <AppShell isAuthenticated onLogout={onLogout}>
          <p>Test content</p>
        </AppShell>
      </MemoryRouter>,
    );

    const logoutButton = screen.getAllByRole("button").find((button) => button.className.includes("headerAuthLink"));
    expect(logoutButton).toBeDefined();
    await user.click(logoutButton!);
    expect(onLogout).toHaveBeenCalledTimes(1);
    rejectLogout(new Error("network"));
    await waitFor(() => expect(catchSpy).toHaveBeenCalledTimes(1));
  });

  it("opens and closes the mobile drawer with real public destinations", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getAllByRole("button", { name: "Mở menu" })[0]);

    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(drawer).toBeVisible();
    expect(within(drawer).getByRole("link", { name: "Trang chủ" })).toHaveAttribute("href", "/");
    expect(within(drawer).getByRole("link", { name: "Ngôn ngữ" })).toHaveAttribute("href", "/languages");
    expect(within(drawer).getByRole("link", { name: "Cộng đồng" })).toHaveAttribute("href", "/community");
    expect(within(drawer).getByRole("link", { name: "Cách bắt đầu" })).toHaveAttribute("href", "/#how-it-works");
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
    expect(document.activeElement).toHaveAttribute("aria-label", "Đóng menu");

    await user.click(screen.getByRole("button", { name: "Đóng menu" }));
    expect(screen.queryByRole("dialog", { name: "Menu" })).not.toBeInTheDocument();
  });

  it("supports complete desktop More menu dismissal behavior", async () => {
    const user = userEvent.setup();
    renderShell();

    const trigger = screen.getByRole("button", { name: "Thêm" });
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Outside dropdown" }));
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("navigates every implemented More destination and closes the menu", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    await user.click(within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Ngôn ngữ" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/languages");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    await user.click(within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Cộng đồng" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/community");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    await user.click(within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Cách bắt đầu" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/#how-it-works");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();
  });

  it("closes More when another component changes the route", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    await user.click(screen.getByRole("link", { name: "Đi tới cộng đồng" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/community");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();
  });

  it("derives desktop, drawer, and quick-action active state from the current route", async () => {
    const user = userEvent.setup();
    renderShell(false, "/community/posts/post-1");

    const quickActions = screen.getByRole("navigation", { name: "Điều hướng nhanh" });
    expect(within(quickActions).getByRole("link", { name: "Trang chủ" })).not.toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    const communityMenuItem = within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Cộng đồng" });
    expect(communityMenuItem).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Ngôn ngữ" })).not.toHaveAttribute("aria-current", "page");

    await user.click(screen.getAllByRole("button", { name: "Mở menu" })[0]);
    const drawer = screen.getByRole("dialog", { name: "Menu" });
    expect(within(drawer).getByRole("link", { name: "Cộng đồng" })).toHaveAttribute("aria-current", "page");
    expect(within(drawer).getByRole("link", { name: "Trang chủ" })).not.toHaveAttribute("aria-current", "page");
  });

  it("keeps route-derived active state correct through Back and Forward", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/", "/community", "/languages"]} initialIndex={2}>
        <AppShell>
          <HistoryControls />
          <LocationProbe />
        </AppShell>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Ngôn ngữ" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/community");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thêm" }));
    expect(within(screen.getByRole("menu", { name: "Thêm" })).getByRole("link", { name: "Cộng đồng" })).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Forward" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/languages");
    expect(screen.queryByRole("menu", { name: "Thêm" })).not.toBeInTheDocument();
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

    expect(screen.getAllByRole("button", { name: /Tài khoản/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /đăng nhập, sắp có/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
  });
});
