import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiError";
import { type ApiClient, createEndpoint } from "./createApiClient";

const stubClient = (
  request: ApiClient["request"] = vi.fn(),
): ApiClient & { request: ReturnType<typeof vi.fn> } =>
  ({
    baseURL: "https://api.test",
    request: request as ReturnType<typeof vi.fn>,
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    requestBlob: vi.fn(),
    uploadFile: vi.fn(),
    downloadBlob: vi.fn(),
    fetchBlobUrl: vi.fn(),
    refreshAccessToken: vi.fn(),
    triggerDownload: vi.fn(),
  }) as unknown as ApiClient & { request: ReturnType<typeof vi.fn> };

describe("createEndpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls a simple GET with no args and returns parsed body", async () => {
    const data = [{ id: 1 }];
    const request = vi.fn().mockResolvedValue(data);
    const client = stubClient(request);
    const list = createEndpoint<void, typeof data>(client, "GET", { path: "/items" });

    const result = await list();

    expect(result).toBe(data);
    expect(request).toHaveBeenCalledWith("/items", { method: "GET" });
  });

  it("substitutes path params via builder", async () => {
    const request = vi.fn().mockResolvedValue({ id: 7 });
    const client = stubClient(request);
    const detail = createEndpoint<{ id: number }, { id: number }>(client, "GET", {
      path: ({ id }) => `/items/${id}`,
    });

    await detail({ id: 7 });

    expect(request).toHaveBeenCalledWith("/items/7", { method: "GET" });
  });

  it("appends a query string built from args, skipping null and undefined", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const client = stubClient(request);
    const search = createEndpoint<{ q?: string; status?: string | null }, unknown>(client, "GET", {
      path: "/items",
      query: ({ q, status }) => ({ q, status, archived: false }),
    });

    await search({ q: "foo", status: null });

    expect(request).toHaveBeenCalledWith("/items?q=foo&archived=false", { method: "GET" });
  });

  it("repeats a query key for array values", async () => {
    const request = vi.fn().mockResolvedValue([]);
    const client = stubClient(request);
    const tagged = createEndpoint<{ tag: string[] }, unknown>(client, "GET", {
      path: "/items",
      query: ({ tag }) => ({ tag }),
    });

    await tagged({ tag: ["a", "b"] });

    expect(request).toHaveBeenCalledWith("/items?tag=a&tag=b", { method: "GET" });
  });

  it("serialises JSON body for POST and sets Content-Type", async () => {
    const request = vi.fn().mockResolvedValue({ id: 9 });
    const client = stubClient(request);
    const create = createEndpoint<{ name: string }, { id: number }>(client, "POST", {
      path: "/items",
      body: (args) => args,
    });

    await create({ name: "widget" });

    expect(request).toHaveBeenCalledWith("/items", {
      method: "POST",
      body: JSON.stringify({ name: "widget" }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("combines path builder + body for PUT with id + payload", async () => {
    const request = vi.fn().mockResolvedValue({ id: 3, name: "renamed" });
    const client = stubClient(request);
    const update = createEndpoint<{ id: number; data: { name: string } }, { id: number }>(
      client,
      "PUT",
      {
        path: ({ id }) => `/items/${id}`,
        body: ({ data }) => data,
      },
    );

    await update({ id: 3, data: { name: "renamed" } });

    expect(request).toHaveBeenCalledWith("/items/3", {
      method: "PUT",
      body: JSON.stringify({ name: "renamed" }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("sends DELETE with no body", async () => {
    const request = vi.fn().mockResolvedValue({});
    const client = stubClient(request);
    const remove = createEndpoint<{ id: number }, void>(client, "DELETE", {
      path: ({ id }) => `/items/${id}`,
    });

    await remove({ id: 4 });

    expect(request).toHaveBeenCalledWith("/items/4", { method: "DELETE" });
  });

  it("sends FormData without setting Content-Type so fetch can set the boundary", async () => {
    const request = vi.fn().mockResolvedValue({ uploaded: true });
    const client = stubClient(request);
    const upload = createEndpoint<{ file: File }, { uploaded: boolean }>(client, "POST", {
      path: "/uploads",
      formData: ({ file }) => {
        const fd = new FormData();
        fd.append("file", file);
        return fd;
      },
    });

    const file = new File(["abc"], "a.txt", { type: "text/plain" });
    await upload({ file });

    const call = request.mock.calls[0];
    expect(call[0]).toBe("/uploads");
    expect(call[1].method).toBe("POST");
    expect(call[1].body).toBeInstanceOf(FormData);
    expect(call[1].headers).toBeUndefined();
  });

  it("applies transform to the raw response", async () => {
    const request = vi.fn().mockResolvedValue({ items: [1, 2, 3] });
    const client = stubClient(request);
    const count = createEndpoint<void, number>(client, "GET", {
      path: "/items",
      transform: (raw) => (raw as { items: unknown[] }).items.length,
    });

    expect(await count()).toBe(3);
  });

  it("propagates 4xx ApiError from the underlying client", async () => {
    const request = vi.fn().mockRejectedValue(new ApiError({ status: 404, message: "Not found" }));
    const client = stubClient(request);
    const detail = createEndpoint<{ id: number }, unknown>(client, "GET", {
      path: ({ id }) => `/items/${id}`,
    });

    await expect(detail({ id: 99 })).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Not found",
    });
  });

  it("propagates 5xx ApiError from the underlying client", async () => {
    const request = vi
      .fn()
      .mockRejectedValue(new ApiError({ status: 502, message: "Bad gateway" }));
    const client = stubClient(request);
    const list = createEndpoint<void, unknown>(client, "GET", { path: "/items" });

    await expect(list()).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
    });
  });

  it("does not send a body when the body builder returns null", async () => {
    const request = vi.fn().mockResolvedValue({});
    const client = stubClient(request);
    const noop = createEndpoint<void, unknown>(client, "POST", {
      path: "/items/refresh",
      body: () => null,
    });

    await noop();

    expect(request).toHaveBeenCalledWith("/items/refresh", { method: "POST" });
  });
});
