import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import { MessageContextCard } from "./MessageContextCard";
import type { MessageContextCard as Card } from "../context.types";
import type { MessageContextRefresh } from "../message-context-refresh";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const resource = "11111111-1111-4111-8111-111111111111";
const card = (previewText: string): Card => ({
  availability: "AVAILABLE",
  type: "LIBRARY_RESOURCE",
  id: resource,
  category: "VOCABULARY",
  languageCode: "en",
  previewText,
  canonicalPath: "/library/" + resource,
});
function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
function queueHarness() {
  const sinks = new Map<string, (value: Card | undefined) => void>();
  let resolve!: (value: Card | null) => void;
  const queue = {
    watch: (id: string, sink: (value: Card | undefined) => void) => {
      sinks.set(id, sink);
      sink(card(id === "first" ? "First source" : "Second source"));
      return () => sinks.delete(id);
    },
    visible: vi.fn(),
    recheck: vi.fn(() => {
      for (const sink of sinks.values()) sink(undefined);
      return new Promise<Card | null>((done) => {
        resolve = done;
      });
    }),
  };
  return {
    queue: queue as unknown as MessageContextRefresh,
    emit: (id: string, value: Card | undefined) => sinks.get(id)?.(value),
    resolve: (value: Card | null) => resolve(value),
  };
}
it("preserves measured sibling heights while open masks all previews, then opens only the fresh destination", async () => {
  const { queue, emit, resolve } = queueHarness();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      return {
        height: this.textContent?.includes("First source") ? 240 : 300,
      } as DOMRect;
    },
  );
  render(
    <MemoryRouter>
      <MessageContextCard queue={queue} messageId="first" />
      <MessageContextCard queue={queue} messageId="second" />
      <Location />
    </MemoryRouter>,
  );
  const first = screen.getByText("First source").parentElement!,
    second = screen.getByText("Second source").parentElement!;
  await userEvent.click(first.querySelector("button")!);
  expect(screen.queryByText("First source")).toBeNull();
  expect(screen.queryByText("Second source")).toBeNull();
  expect(first).toHaveStyle({ minHeight: "240px" });
  expect(second).toHaveStyle({ minHeight: "300px" });
  expect(first.querySelector("button")).toBeNull();
  expect(first.querySelector("a")).toBeNull();
  await act(async () => {
    emit("first", card("Fresh source"));
    resolve(card("Fresh source"));
  });
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/library/" + resource,
  );
  expect(first.style.minHeight).toBe("");
});
it("releases retained height after a fresh unavailable response without restoring content or a link", async () => {
  const { queue, emit } = queueHarness();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    height: 220,
  } as DOMRect);
  render(
    <MemoryRouter>
      <MessageContextCard queue={queue} messageId="first" />
    </MemoryRouter>,
  );
  const node = screen.getByText("First source").parentElement!;
  act(() => emit("first", undefined));
  expect(node).toHaveStyle({ minHeight: "220px" });
  act(() => emit("first", { availability: "UNAVAILABLE" }));
  expect(node.style.minHeight).toBe("");
  expect(screen.queryByText("First source")).toBeNull();
  expect(node.querySelector("button,a")).toBeNull();
});
it("does not carry a measured height or pending navigation into a different card owner", async () => {
  const prior = queueHarness(),
    next = queueHarness();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    height: 240,
  } as DOMRect);
  const view = render(
    <MemoryRouter>
      <MessageContextCard queue={prior.queue} messageId="first" />
      <Location />
    </MemoryRouter>,
  );
  await userEvent.click(
    screen.getByText("First source").parentElement!.querySelector("button")!,
  );
  view.rerender(
    <MemoryRouter>
      <MessageContextCard queue={next.queue} messageId="second" />
      <Location />
    </MemoryRouter>,
  );
  expect(screen.getByText("Second source").parentElement!.style.minHeight).toBe(
    "",
  );
  await act(async () => prior.resolve(card("Old fresh source")));
  expect(screen.getByTestId("location")).toHaveTextContent("/");
  expect(screen.queryByText("Old fresh source")).toBeNull();
});
