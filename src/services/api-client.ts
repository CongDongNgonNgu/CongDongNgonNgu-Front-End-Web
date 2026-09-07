export interface ApiSuccess<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const DEFAULT_API_BASE_URL = "/api/v1";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export function resolveApiBaseUrl(
  value: string | undefined,
  appOrigin = typeof window === "undefined" ? "http://localhost" : window.location.origin,
): string {
  const raw = value?.trim();
  if (!raw) return DEFAULT_API_BASE_URL;

  if (raw.startsWith("//")) {
    throw new Error("API base URL must not be protocol-relative");
  }

  const isRootRelative = raw.startsWith("/");
  const isHttpUrl = /^https?:\/\//i.test(raw);
  if (!isRootRelative && !isHttpUrl) {
    throw new Error("API base URL must be root-relative or an absolute HTTP(S) URL");
  }

  let url: URL;
  try {
    url = new URL(raw, appOrigin);
  } catch {
    throw new Error("API base URL must be valid");
  }

  if (url.username || url.password) {
    throw new Error("API base URL must not contain credentials");
  }
  if (url.search) {
    throw new Error("API base URL must not contain a query string");
  }
  if (url.hash) {
    throw new Error("API base URL must not contain a fragment");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API base URL must use HTTP or HTTPS");
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  return isRootRelative ? path : `${url.origin}${path}`;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  constructor(baseUrl: string, fetcher: Fetcher = fetch) {
    this.baseUrl = resolveApiBaseUrl(baseUrl);
    this.fetcher = fetcher;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (isAbsoluteUrl(path) || path.startsWith("//")) {
      throw new Error("API paths must be relative");
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl.replace(/\/$/, "")}${normalizedPath}`;
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    const response = await this.fetcher(url, { ...init, headers });
    if (response.status === 204) return undefined as T;

    const body = await readJson(response);
    if (!response.ok) {
      const failure = isApiFailure(body) ? body : undefined;
      throw new ApiClientError(
        failure?.error.message ?? "Request failed",
        response.status,
        failure?.error.code ?? `HTTP_${response.status}`,
      );
    }

    if (isApiSuccess<T>(body)) return body.data;
    return body as T;
  }
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:/i.test(value);
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return undefined;
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  return isRecord(value) && value.success === true && "data" in value;
}

function isApiFailure(value: unknown): value is ApiFailure {
  if (!isRecord(value) || value.success !== false || !isRecord(value.error)) return false;
  return typeof value.error.code === "string" && typeof value.error.message === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export const apiClient = new ApiClient(
  resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
);
