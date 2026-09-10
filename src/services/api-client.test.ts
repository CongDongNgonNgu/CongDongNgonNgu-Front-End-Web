import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClient,
  ApiClientError,
  resolveApiBaseUrl,
} from "./api-client";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("resolveApiBaseUrl", () => {
  it("uses the versioned same-origin API path by default", () => {
    expect(resolveApiBaseUrl(undefined, "https://app.example.test")).toBe("/api/v1");
  });

  it("accepts an explicitly configured HTTPS API origin", () => {
    expect(resolveApiBaseUrl("https://api.example.test/api/v1", "https://app.example.test"))
      .toBe("https://api.example.test/api/v1");
  });

  it("rejects credentials, query strings, and fragments in the base URL", () => {
    expect(() => resolveApiBaseUrl("https://user:pass@api.example.test/api/v1", "https://app.example.test"))
      .toThrow(/credentials/i);
    expect(() => resolveApiBaseUrl("/api/v1?token=secret", "https://app.example.test"))
      .toThrow(/query/i);
  });
  it("rejects an external-product API origin", () => {
    expect(() => resolveApiBaseUrl("https://api.eduai.example.test/api/v1", "https://app.example.test"))
      .toThrow("API base URL points to a blocked external-product host");
  });
});

describe("ApiClient", () => {
  it("rejects an absolute request path instead of escaping the configured API base", async () => {
    const client = new ApiClient("/api/v1", vi.fn());

    await expect(client.get("https://evil.example.test/data")).rejects.toThrow(
      "API paths must be relative",
    );
  });

  it("unwraps the stable success envelope", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { status: "ok" }, message: "OK" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new ApiClient("/api/v1", fetcher);

    await expect(client.get<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
    expect(fetcher).toHaveBeenCalledWith("/api/v1/health", expect.objectContaining({ method: "GET" }));
  });

  it("binds the default fetcher to globalThis", async () => {
    const fetcher = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: { status: "ok" }, message: "OK" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetcher);
    const client = new ApiClient("/api/v1");

    await expect(client.get<{ status: string }>("/health")).resolves.toEqual({ status: "ok" });
    expect(fetcher).toHaveBeenCalledWith("/api/v1/health", expect.objectContaining({ method: "GET" }));
  });

  it("raises a typed error for an API failure envelope", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: "NOT_READY", message: "Not ready" } }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new ApiClient("/api/v1", fetcher);

    await expect(client.get("/health")).rejects.toMatchObject({
      name: "ApiClientError",
      status: 503,
      code: "NOT_READY",
      message: "Not ready",
    } satisfies Partial<ApiClientError>);
  });
});
