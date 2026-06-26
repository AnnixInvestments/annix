import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection, mongo } from "mongoose";
import { nowISO } from "../lib/datetime";
import { RbacAccessDetailsCache } from "./rbac-access-details-cache";

const EPOCH_COLLECTION = "_rbac_cache_epoch";
const EPOCH_DOC_ID = "rbac";
const POLL_INTERVAL_MILLIS = 5_000;

interface EpochDoc {
  _id: string;
  epoch: number;
  updatedAt?: string;
}

/**
 * Cross-machine invalidation for {@link RbacAccessDetailsCache} so the backend
 * can run min_machines_running > 1 without serving stale permissions (#405
 * devops-1). Each RBAC mutation bumps a single monotonic epoch document on the
 * core cluster; every machine polls it and clears its local cache when the epoch
 * advances. The handling machine still evicts locally and instantly via the
 * cache; this only propagates the change to peers. Any Mongo error degrades to
 * the cache's existing 45s TTL — never worse than single-machine behaviour.
 */
@Injectable()
export class RbacCacheEpochService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RbacCacheEpochService.name);
  private lastSeenEpoch = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly accessDetailsCache: RbacAccessDetailsCache,
  ) {}

  async onModuleInit(): Promise<void> {
    this.lastSeenEpoch = await this.readEpoch();
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, POLL_INTERVAL_MILLIS);
    if (typeof this.pollTimer.unref === "function") {
      this.pollTimer.unref();
    }
  }

  onModuleDestroy(): void {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  bump(): void {
    const collection = this.epochCollection();
    if (collection == null) {
      return;
    }
    void collection
      .updateOne(
        { _id: EPOCH_DOC_ID },
        { $inc: { epoch: 1 }, $set: { updatedAt: nowISO() } },
        { upsert: true },
      )
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `RBAC cache epoch bump failed; peers fall back to the TTL for this change: ${reason}`,
        );
      });
  }

  private epochCollection(): mongo.Collection<EpochDoc> | null {
    const db = this.connection.db;
    if (db == null) {
      return null;
    }
    return db.collection<EpochDoc>(EPOCH_COLLECTION);
  }

  private async readEpoch(): Promise<number> {
    const collection = this.epochCollection();
    if (collection == null) {
      return this.lastSeenEpoch;
    }
    try {
      const doc = await collection.findOne({ _id: EPOCH_DOC_ID }, { projection: { epoch: 1 } });
      return doc?.epoch ?? 0;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`RBAC cache epoch read failed (falling back to TTL): ${reason}`);
      return this.lastSeenEpoch;
    }
  }

  private async pollOnce(): Promise<void> {
    const currentEpoch = await this.readEpoch();
    if (currentEpoch !== this.lastSeenEpoch) {
      const previousEpoch = this.lastSeenEpoch;
      this.lastSeenEpoch = currentEpoch;
      this.accessDetailsCache.clear();
      this.logger.log(
        `RBAC access-details cache cleared on cross-machine invalidation (epoch ${previousEpoch} -> ${currentEpoch})`,
      );
    }
  }
}
