import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("renders the independent foundation shell", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toHaveTextContent("CongDongNgonNgu");
    expect(screen.getByRole("heading", { name: /language community foundation/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /skip to main content/i })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("does not expose the old course route", () => {
    window.history.pushState({}, "", "/courses");
    render(<App />);

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeVisible();
    expect(screen.queryByText(/course catalog/i)).not.toBeInTheDocument();
  });
});
