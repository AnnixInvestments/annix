import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./stores", () => ({
  offlinePendingActions: {
    add: vi.fn(),
    all: vi.fn(),
    byId: vi.fn(),
    remove: vi.fn(),
    count: vi.fn(),
    incrementRetry: vi.fn(),
  },
}));

import {
  addMutationQueueListener,
  pendingMutationCount,
  pendingMutations,
  processMutation,
  removeMutation,
  retryMutation,
} from "./mutationQueue";
import type { PendingAction } from "./stores";
import { offlinePendingActions } from "./stores";

const mockStore = vi.mocked(offlinePendingActions);

function makePendingAction(overrides?: Partial<PendingAction>): PendingAction {
  return {
    id: "action-123",
    url: "https://api.example.com/stock",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: '{"name":"test"}',
    timestamp: Date.now(),
    retryCount: 0,
    ...overrides,
  };
}

describe("mutationQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("pendingMutations", () => {
    it("delegates to store.all()", async () => {
      const actions = [makePendingAction()];
      mockStore.all.mockResolvedValue(actions);

      const result = await pendingMutations();
      expect(result).toBe(actions);
      expect(mockStore.all).toHaveBeenCalled();
    });
  });

  describe("pendingMutationCount", () => {
    it("delegates to store.count()", async () => {
      mockStore.count.mockResolvedValue(5);

      const result = await pendingMutationCount();
      expect(result).toBe(5);
    });
  });

  describe("removeMutation", () => {
    it("removes from store and notifies listeners", async () => {
      mockStore.count.mockResolvedValue(3);
      const listener = { onQueueCountChanged: vi.fn() };
      const unsub = addMutationQueueListener(listener);

      await removeMutation("action-123");

      expect(mockStore.remove).toHaveBeenCalledWith("action-123");
      expect(listener.onQueueCountChanged).toHaveBeenCalledWith(3);

      unsub();
    });
  });

  describe("retryMutation", () => {
    it("returns null when action not found", async () => {
      mockStore.byId.mockResolvedValue(undefined);

      const result = await retryMutation("unknown-id");
      expect(result).toBeNull();
    });

    it("increments retry count and returns updated action", async () => {
      const action = makePendingAction({ retryCount: 2 });
      mockStore.byId
        .mockResolvedValueOnce(action)
        .mockResolvedValueOnce({ ...action, retryCount: 3 });
      mockStore.incrementRetry.mockResolvedValue(3);

      const result = await retryMutation("action-123");
      expect(result).toBeDefined();
      expect(mockStore.incrementRetry).toHaveBeenCalledWith("action-123");
    });

    it("removes action after exceeding 5 retries", async () => {
      const action = makePendingAction({ retryCount: 5 });
      mockStore.byId.mockResolvedValue(action);
      mockStore.incrementRetry.mockResolvedValue(6);
      mockStore.count.mockResolvedValue(0);

      const listener = { onMutationProcessed: vi.fn() };
      const unsub = addMutationQueueListener(listener);

      const result = await retryMutation("action-123");

      expect(result).toBeNull();
      expect(mockStore.remove).toHaveBeenCalledWith("action-123");
      expect(listener.onMutationProcessed).toHaveBeenCalledWith(
        "action-123",
        "failed",
        "Max retries exceeded",
      );

      unsub();
    });
  });

  describe("processMutation", () => {
    it("removes mutation and returns true on successful fetch", async () => {
      const action = makePendingAction();
      mockStore.count.mockResolvedValue(0);

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      const listener = { onMutationProcessed: vi.fn() };
      const unsub = addMutationQueueListener(listener);

      const result = await processMutation(action);

      expect(result).toBe(true);
      expect(mockStore.remove).toHaveBeenCalledWith("action-123");
      expect(listener.onMutationProcessed).toHaveBeenCalledWith("action-123", "success");

      unsub();
      vi.unstubAllGlobals();
    });

    it("retries and returns false on HTTP error", async () => {
      const action = makePendingAction();
      mockStore.byId.mockResolvedValue(action);
      mockStore.incrementRetry.mockResolvedValue(1);
      mockStore.count.mockResolvedValue(1);

      const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
      vi.stubGlobal("fetch", mockFetch);

      const result = await processMutation(action);

      expect(result).toBe(false);
      expect(mockStore.incrementRetry).toHaveBeenCalledWith("action-123");

      vi.unstubAllGlobals();
    });

    it("retries and returns false on network error", async () => {
      const action = makePendingAction();
      mockStore.byId.mockResolvedValue(action);
      mockStore.incrementRetry.mockResolvedValue(1);
      mockStore.count.mockResolvedValue(1);

      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      vi.stubGlobal("fetch", mockFetch);

      const result = await processMutation(action);

      expect(result).toBe(false);
      expect(mockStore.incrementRetry).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });

    it("passes correct fetch options", async () => {
      const action = makePendingAction({
        method: "PUT",
        headers: { Authorization: "Bearer token" },
        body: '{"updated":true}',
      });
      mockStore.count.mockResolvedValue(0);

      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", mockFetch);

      await processMutation(action);

      expect(mockFetch).toHaveBeenCalledWith(action.url, {
        method: "PUT",
        headers: { Authorization: "Bearer token" },
        body: '{"updated":true}',
      });

      vi.unstubAllGlobals();
    });
  });

  describe("listeners", () => {
    it("subscribe and unsubscribe works correctly", async () => {
      const listener = { onQueueCountChanged: vi.fn() };
      const unsub = addMutationQueueListener(listener);
      mockStore.count.mockResolvedValue(0);

      await removeMutation("x");
      expect(listener.onQueueCountChanged).toHaveBeenCalledTimes(1);

      unsub();
      await removeMutation("y");
      expect(listener.onQueueCountChanged).toHaveBeenCalledTimes(1);
    });
  });
});
