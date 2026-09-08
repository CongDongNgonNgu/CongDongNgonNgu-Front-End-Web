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
    expect(screen.getByRole("img", { name: /cộng đồng đa ngôn ngữ/i }).getAttribute("src")).toMatch(/language-community-hero-v2[.]jpg/);
    expect(screen.getByRole("link", { name: /bỏ qua đến nội dung chính/i })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Cùng nhau học hỏi và chia sẻ ngôn ngữ");
    expect(screen.queryByText(/phase 01|global shell|đang xây nền|trạng thái hệ thống|sắp có/i)).not.toBeInTheDocument();
  });

  it("keeps the public shell free of unavailable destinations and placeholder icons", () => {
    render(<App />);

    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));

    expect(hrefs).toContain("/");
    expect(hrefs).not.toContain("#");
    expect(hrefs).not.toContain("/courses");
    expect(screen.queryByText("Sắp có")).not.toBeInTheDocument();
    for (const glyph of ["⌂", "⌕", "•", "≡", "◉", "◌", "✦", "◇"]) {
      expect(screen.queryByText(glyph)).not.toBeInTheDocument();
    }
  });

  it("shows a bounded not-found page for unavailable routes", () => {
    window.history.pushState({}, "", "/courses");
    render(<App />);

    expect(screen.getByRole("heading", { name: /trang này chưa có/i })).toBeVisible();
    expect(screen.queryByText(/course catalog/i)).not.toBeInTheDocument();
  });
});
