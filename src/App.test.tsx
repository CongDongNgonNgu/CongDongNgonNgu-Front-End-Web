import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the independent language community shell", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toHaveTextContent("Cộng đồng ngôn ngữ");
    expect(screen.getByRole("heading", { name: /học ngôn ngữ cùng nhau/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /bỏ qua đến nội dung chính/i })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("PHASE 01 / GLOBAL SHELL");
  });

  it("keeps only the home destination active in Phase 01", () => {
    render(<App />);

    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/");
    expect(hrefs).not.toContain("#");
    expect(hrefs).not.toContain("/courses");
    expect(screen.getAllByText("Sắp có").length).toBeGreaterThan(4);
  });

  it("shows a bounded not-found page for unavailable routes", () => {
    window.history.pushState({}, "", "/courses");
    render(<App />);

    expect(screen.getByRole("heading", { name: /trang này chưa có/i })).toBeVisible();
    expect(screen.queryByText(/course catalog/i)).not.toBeInTheDocument();
  });
});