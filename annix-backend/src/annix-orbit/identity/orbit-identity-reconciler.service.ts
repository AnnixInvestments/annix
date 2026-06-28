import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import type { Connection } from "mongoose";
import { FEATURE_FLAGS } from "../../feature-flags/feature-flags.constants";
import { FeatureFlagsService } from "../../feature-flags/feature-flags.service";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { UserRepository } from "../../user/user.repository";
import { OrbitIdentityWriter } from "./orbit-identity-writer";
import { ORBIT_MODULES, type OrbitModule } from "./orbit-module";

const RECONCILE_QUEUE_COLLECTION = "orbit_identity_reconcile_queue";
const DRAIN_BATCH = 100;
const BACKLOG_ALERT_THRESHOLD = 100;

interface ReconcileItem {
  _id: unknown;
  userId: number;
  module: string;
  op: string;
}

/**
 * F3 — standing reconcile drain (ADR-0001 / M4). The durability backstop that
 * makes removing the login read-fallback safe: best-effort mirror failures land
 * in `orbit_identity_reconcile_queue`, and this cron rebuilds a COMPLETE identity
 * row + `identity_registry` entry from the authoritative core `user`, so no
 * identity can stay partial or registry-less. Alerts if the queue backs up.
 */
@Injectable()
export class OrbitIdentityReconciler {
  private readonly logger = new Logger(OrbitIdentityReconciler.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly writer: OrbitIdentityWriter,
    private readonly flags: FeatureFlagsService,
    @InjectConnection(ORBIT_CONNECTION) private readonly orbitConnection: Connection,
  ) {}

  @Cron("*/5 * * * *", { name: "annix-orbit:identity-reconcile" })
  async drain(): Promise<void> {
    // Only meaningful while dual-write is active (the writer is otherwise inert).
    if (!(await this.flags.isEnabled(FEATURE_FLAGS.ORBIT_IDENTITY_DUAL_WRITE))) {
      return;
    }
    const db = this.orbitConnection.db;
    if (!db) {
      return;
    }
    const queue = db.collection(RECONCILE_QUEUE_COLLECTION);
    const items = (await queue
      .find({ status: "pending" })
      .limit(DRAIN_BATCH)
      .toArray()) as unknown as ReconcileItem[];

    for (const item of items) {
      try {
        await this.reconcileOne(item);
        await queue.deleteOne({ _id: item._id } as never);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Orbit identity reconcile failed userId=${item.userId} op=${item.op}: ${reason}`,
        );
      }
    }

    const remaining = await queue.countDocuments({ status: "pending" });
    if (remaining > BACKLOG_ALERT_THRESHOLD) {
      this.logger.error(`orbit.identity.reconcile_backlog remaining=${remaining}`);
    }
  }

  private async reconcileOne(item: ReconcileItem): Promise<void> {
    const module = this.asModule(item.module);
    if (!module) {
      this.logger.warn(`Reconcile dropping item with unknown module=${item.module}`);
      return;
    }
    if (item.op === "deleteIdentity") {
      // The source user was removed — make the identity removal converge.
      await this.writer.deleteIdentity(item.userId, module);
      return;
    }
    const user = await this.userRepo.findById(item.userId);
    if (!user) {
      // No source to rebuild from (user gone but op wasn't a delete) — log + drop.
      this.logger.warn(
        `Reconcile dropping userId=${item.userId} op=${item.op} — source user not found`,
      );
      return;
    }
    // Rebuild a COMPLETE identity row + registry from the authoritative user.
    await this.writer.createIdentity(module, user);
  }

  private asModule(value: string): OrbitModule | null {
    return ORBIT_MODULES.includes(value as OrbitModule) ? (value as OrbitModule) : null;
  }
}
