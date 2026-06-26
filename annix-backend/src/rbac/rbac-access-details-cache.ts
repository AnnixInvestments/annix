import { Injectable } from "@nestjs/common";
import { nowMillis } from "../lib/datetime";
import type { ResolvedAccessDetails } from "./resolved-access-details";

interface CachedAccessDetails {
  value: ResolvedAccessDetails;
  expiresAtMillis: number;
}

// Scale-out note: this cache is per-process. On multi-machine Fly (min_machines_running > 1)
// each instance keeps its own copy, so an invalidation on one machine does not clear another —
// a revoke/grant can stay stale for up to the TTL on other instances. Wire a shared invalidation
// channel (Redis pub/sub or a Mongo version-stamp) before raising min_machines_running above 1.
const ACCESS_DETAILS_TTL_MILLIS = 45_000;
const ACCESS_DETAILS_CACHE_MAX_ENTRIES = 50_000;

@Injectable()
export class RbacAccessDetailsCache {
  private readonly entries = new Map<string, CachedAccessDetails>();

  private cacheKey(userId: number, appCode: string): string {
    return `${userId}::${appCode}`;
  }

  private prune(): void {
    const cutoffMillis = nowMillis();
    this.entries.forEach((entry, key) => {
      if (entry.expiresAtMillis <= cutoffMillis) {
        this.entries.delete(key);
      }
    });
    if (this.entries.size > ACCESS_DETAILS_CACHE_MAX_ENTRIES) {
      this.entries.clear();
    }
  }

  cached(userId: number, appCode: string): ResolvedAccessDetails | null {
    const entry = this.entries.get(this.cacheKey(userId, appCode));
    if (!entry) {
      return null;
    }
    if (entry.expiresAtMillis <= nowMillis()) {
      this.entries.delete(this.cacheKey(userId, appCode));
      return null;
    }
    return entry.value;
  }

  store(userId: number, appCode: string, value: ResolvedAccessDetails): void {
    this.prune();
    this.entries.set(this.cacheKey(userId, appCode), {
      value,
      expiresAtMillis: nowMillis() + ACCESS_DETAILS_TTL_MILLIS,
    });
  }

  invalidate(userId: number, appCode: string): void {
    this.entries.delete(this.cacheKey(userId, appCode));
  }

  invalidateApp(appCode: string): void {
    const suffix = `::${appCode}`;
    this.entries.forEach((_entry, key) => {
      if (key.endsWith(suffix)) {
        this.entries.delete(key);
      }
    });
  }

  clear(): void {
    this.entries.clear();
  }
}
