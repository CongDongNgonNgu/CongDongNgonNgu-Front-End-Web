import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon";

describe("Icon", () => {
  it("uses the shared SVG sizing and stroke policy", () => {
    const { container } = render(
      <button type="button" aria-label="Tìm kiếm">
        <Icon name="search" size={18} />
      </button>,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "18");
    expect(svg).toHaveAttribute("height", "18");
    expect(svg).toHaveAttribute("stroke-width", "1.8");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
