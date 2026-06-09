import { getHeapStatistics } from "node:v8";
import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import type { Connection } from "mongoose";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { now, nowISO, nowMillis } from "../lib/datetime";
import { ORBIT_CONNECTION } from "../lib/persistence/mongo-connections";
import type { RequestMetricsSnapshot } from "../platform-metrics/request-metrics.service";
import { RequestMetricsService } from "../platform-metrics/request-metrics.service";
import { S3UsageService } from "../platform-metrics/s3-usage.service";

export type LimitStatus = "ok" | "warn" | "critical" | "info";

export interface PlatformLimitCard {
  id: string;
  label: string;
  value: number;
  unit: string;
  limit: number | null;
  percent: number | null;
  status: LimitStatus;
  trend: string | null;
  details: string;
  href: string | null;
  limitLabel: string | null;
}

export interface PlatformLimitsResponse {
  generatedAt: string;
  cards: PlatformLimitCard[];
}

const VM_MEMORY_CAP_MB = 1024;
const HEAP_FALLBACK_CAP_MB = 768;
const HTTP_HARD_LIMIT = 50;
const HTTP_SOFT_LIMIT = 25;
const ATLAS_STORAGE_CAP_MB = 512;
const ATLAS_COLLECTION_CAP = 500;
const DEFAULT_RETENTION_CAP = 15000;
const AI_DAILY_CALL_SOFT_CAP = 5000;
const AI_DAILY_TOKEN_SOFT_CAP = 5_000_000;
const REQUEST_P95_TARGET_MS = 1000;
const S3_SOFT_BUDGET_GB = 25;
const EXTERNAL_JOBS_COLLECTION = "cv_assistant_external_jobs";
const ORBIT_SETTINGS_COLLECTION = "cv_assistant_orbit_settings";

function percentOf(value: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((value / limit) * 100);
}

function statusForPercent(percent: number): LimitStatus {
  if (percent >= 85) return "critical";
  if (percent >= 70) return "warn";
  return "ok";
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function buildCard(input: {
  id: string;
  label: string;
  value: number;
  unit: string;
  limit: number | null;
  details: string;
  status?: LimitStatus;
  trend?: string | null;
  href?: string | null;
  limitLabel?: string | null;
}): PlatformLimitCard {
  const limit = input.limit;
  const percent = limit === null ? null : percentOf(input.value, limit);
  const status = input.status ?? (percent === null ? "info" : statusForPercent(percent));
  const limitLabel =
    input.limitLabel !== undefined
      ? input.limitLabel
      : limit === null
        ? null
        : `of ${formatNumber(limit)} ${input.unit}`;
  return {
    id: input.id,
    label: input.label,
    value: input.value,
    unit: input.unit,
    limit,
    percent,
    status,
    trend: input.trend ?? null,
    details: input.details,
    href: input.href ?? null,
    limitLabel,
  };
}

function formatDuration(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    `${minutes}m`,
  ].filter((part) => part !== null);
  return parts.join(" ");
}

@Injectable()
export class AdminPlatformLimitsService {
  private readonly logger = new Logger(AdminPlatformLimitsService.name);

  constructor(
    private readonly requestMetrics: RequestMetricsService,
    private readonly s3Usage: S3UsageService,
    @Optional()
    @Inject(AiUsageService)
    private readonly aiUsageService: AiUsageService | null = null,
    @Optional() @InjectConnection() private readonly mainConnection: Connection | null = null,
    @Optional()
    @InjectConnection(ORBIT_CONNECTION)
    private readonly orbitConnection: Connection | null = null,
  ) {}

  async limits(): Promise<PlatformLimitsResponse> {
    const snapshot = this.requestMetrics.snapshot();
    const aiTotals = await this.aiDailyTotals();
    const dynamicCards = await Promise.all([
      this.orbitStorageCard(),
      this.collectionCountCard(this.mainConnection, "collections-main", "Collections — main DB"),
      this.collectionCountCard(this.orbitConnection, "collections-orbit", "Collections — Orbit DB"),
      this.externalJobsCard(),
    ]);
    const aiCards = aiTotals ? [this.aiCallsCard(aiTotals), this.aiTokensCard(aiTotals)] : [];
    const cards = [
      this.memoryCard(),
      this.heapCard(),
      this.uptimeCard(),
      this.activeRequestsCard(snapshot),
      this.latencyCard(snapshot),
      this.errorsCard(snapshot),
      ...dynamicCards,
      ...aiCards,
      this.s3StorageCard(),
    ].filter((card): card is PlatformLimitCard => card !== null);
    return { generatedAt: nowISO(), cards };
  }

  private memoryCard(): PlatformLimitCard {
    const usage = process.memoryUsage();
    const rssMb = Math.round(usage.rss / 1024 / 1024);
    const capMb = Number(process.env.FLY_VM_MEMORY_MB) || VM_MEMORY_CAP_MB;
    return buildCard({
      id: "vm-memory",
      label: "VM memory (RSS)",
      value: rssMb,
      unit: "MB",
      limit: capMb,
      details: `${Math.max(0, capMb - rssMb)} MB headroom on the Fly VM`,
    });
  }

  private heapCard(): PlatformLimitCard {
    const heap = getHeapStatistics();
    const usedMb = Math.round(heap.used_heap_size / 1024 / 1024);
    const limitMb = Math.round(heap.heap_size_limit / 1024 / 1024) || HEAP_FALLBACK_CAP_MB;
    return buildCard({
      id: "node-heap",
      label: "Node heap (V8 old space)",
      value: usedMb,
      unit: "MB",
      limit: limitMb,
      details: `${Math.max(0, limitMb - usedMb)} MB before the --max-old-space-size cap`,
    });
  }

  private uptimeCard(): PlatformLimitCard {
    const seconds = Math.round(process.uptime());
    const hours = Math.round((seconds / 3600) * 10) / 10;
    return buildCard({
      id: "uptime",
      label: "Process uptime",
      value: hours,
      unit: "h",
      limit: null,
      status: "info",
      details: `${formatDuration(seconds)} since the last restart`,
    });
  }

  private activeRequestsCard(snapshot: RequestMetricsSnapshot): PlatformLimitCard {
    return buildCard({
      id: "active-requests",
      label: "Active HTTP requests",
      value: snapshot.active,
      unit: "req",
      limit: HTTP_HARD_LIMIT,
      limitLabel: `of ${HTTP_HARD_LIMIT} hard limit`,
      details: `soft limit ${HTTP_SOFT_LIMIT} · peak ${snapshot.peak5m} (5m) · ${snapshot.sampleSize5m} requests in 5m`,
    });
  }

  private latencyCard(snapshot: RequestMetricsSnapshot): PlatformLimitCard {
    const p95 = snapshot.p95Ms5m ?? 0;
    const target = Number(process.env.REQUEST_P95_TARGET_MS) || REQUEST_P95_TARGET_MS;
    const slowest = snapshot.slowRoutes[0] ?? null;
    const slowestText = slowest ? ` · slowest ${slowest.route} ${slowest.p95Ms}ms` : "";
    return buildCard({
      id: "request-p95",
      label: "Request latency p95 (5m)",
      value: p95,
      unit: "ms",
      limit: target,
      limitLabel: `of ${formatNumber(target)} ms target`,
      details: `over ${snapshot.sampleSize5m} requests${slowestText}`,
    });
  }

  private errorsCard(snapshot: RequestMetricsSnapshot): PlatformLimitCard {
    const errors = snapshot.errors5m;
    const total = snapshot.sampleSize5m;
    const status: LimitStatus = errors >= 10 ? "critical" : errors >= 1 ? "warn" : "ok";
    const rate = total > 0 ? Math.round((errors / total) * 1000) / 10 : 0;
    const details =
      errors > 0
        ? `${rate}% of the last ${total} requests were 5xx`
        : "no server errors in the last 5 minutes";
    return buildCard({
      id: "request-errors",
      label: "5xx responses (5m)",
      value: errors,
      unit: "errors",
      limit: total,
      status,
      limitLabel: `of ${formatNumber(total)} requests (5m)`,
      details,
    });
  }

  private async orbitStorageCard(): Promise<PlatformLimitCard | null> {
    const connection = this.orbitConnection;
    if (!connection) return null;
    try {
      const client = connection.getClient();
      const { databases } = await client.db().admin().listDatabases();
      const orbitDbs = databases.filter((database) => database.name.startsWith("orbit_"));
      const sizes = await Promise.all(
        orbitDbs.map(async (database) => {
          const stats = await client.db(database.name).command({ dbStats: 1 });
          return ((stats.dataSize ?? 0) + (stats.indexSize ?? 0)) / 1024 / 1024;
        }),
      );
      const totalMb = Math.round(sizes.reduce((sum, mb) => sum + mb, 0) * 10) / 10;
      const freeMb = Math.max(0, Math.round((ATLAS_STORAGE_CAP_MB - totalMb) * 10) / 10);
      return buildCard({
        id: "orbit-storage",
        label: "Orbit cluster storage (M0)",
        value: totalMb,
        unit: "MB",
        limit: ATLAS_STORAGE_CAP_MB,
        details: `${freeMb} MB free · logical size Atlas enforces on M0`,
      });
    } catch (error) {
      this.logger.warn(`orbitStorageCard failed: ${String(error)}`);
      return null;
    }
  }

  private async collectionCountCard(
    connection: Connection | null,
    id: string,
    label: string,
  ): Promise<PlatformLimitCard | null> {
    if (!connection || !connection.db) return null;
    try {
      const collections = await connection.db.listCollections().toArray();
      const count = collections.length;
      return buildCard({
        id,
        label,
        value: count,
        unit: "collections",
        limit: ATLAS_COLLECTION_CAP,
        details: `${Math.max(0, ATLAS_COLLECTION_CAP - count)} below the Atlas M0 500-collection cap`,
      });
    } catch (error) {
      this.logger.warn(`${id} failed: ${String(error)}`);
      return null;
    }
  }

  private async externalJobsCard(): Promise<PlatformLimitCard | null> {
    const connection = this.orbitConnection;
    if (!connection || !connection.db) return null;
    try {
      const db = connection.db;
      const count = await db.collection(EXTERNAL_JOBS_COLLECTION).estimatedDocumentCount();
      const settings = await db
        .collection<{ _id: string; externalJobRetentionCap?: number }>(ORBIT_SETTINGS_COLLECTION)
        .findOne({ _id: "default" });
      const cap =
        settings && typeof settings.externalJobRetentionCap === "number"
          ? settings.externalJobRetentionCap
          : DEFAULT_RETENTION_CAP;
      return buildCard({
        id: "external-jobs",
        label: "External jobs vs retention cap",
        value: count,
        unit: "jobs",
        limit: cap,
        details: `${Math.max(0, cap - count)} jobs below the ingestion retention cap`,
      });
    } catch (error) {
      this.logger.warn(`externalJobsCard failed: ${String(error)}`);
      return null;
    }
  }

  private async aiDailyTotals(): Promise<{ calls: number; tokens: number } | null> {
    const service = this.aiUsageService;
    if (service === null) return null;
    try {
      const since = now().startOf("day").toJSDate();
      return await service.dailyTotals(since);
    } catch (error) {
      this.logger.warn(`aiDailyTotals failed: ${String(error)}`);
      return null;
    }
  }

  private aiCallsCard(totals: { calls: number; tokens: number }): PlatformLimitCard {
    const softCap = Number(process.env.AI_DAILY_CALL_SOFT_CAP) || AI_DAILY_CALL_SOFT_CAP;
    return buildCard({
      id: "ai-calls-today",
      label: "AI calls today",
      value: totals.calls,
      unit: "calls",
      limit: softCap,
      limitLabel: `of ${formatNumber(softCap)} soft budget`,
      details: `${totals.tokens.toLocaleString()} tokens today`,
    });
  }

  private aiTokensCard(totals: { calls: number; tokens: number }): PlatformLimitCard {
    const millions = Math.round((totals.tokens / 1_000_000) * 100) / 100;
    const budgetTokens = Number(process.env.AI_DAILY_TOKEN_SOFT_CAP) || AI_DAILY_TOKEN_SOFT_CAP;
    const budgetMillions = Math.round((budgetTokens / 1_000_000) * 10) / 10;
    return buildCard({
      id: "ai-tokens-today",
      label: "AI tokens today",
      value: millions,
      unit: "M",
      limit: budgetMillions,
      limitLabel: `of ${formatNumber(budgetMillions)}M soft budget`,
      details: `${totals.tokens.toLocaleString()} tokens across ${totals.calls} calls today`,
    });
  }

  private s3StorageCard(): PlatformLimitCard | null {
    const snapshot = this.s3Usage.snapshot();
    if (snapshot === null) return null;
    const gb = Math.round((snapshot.sizeBytes / 1024 / 1024 / 1024) * 100) / 100;
    const budgetGb = Number(process.env.S3_SOFT_BUDGET_GB) || S3_SOFT_BUDGET_GB;
    const approxNote = snapshot.approximate ? " (approx — capped scan)" : "";
    const ageMin = Math.round((nowMillis() - snapshot.computedAtMs) / 60000);
    return buildCard({
      id: "s3-storage",
      label: "S3 object storage",
      value: gb,
      unit: "GB",
      limit: budgetGb,
      limitLabel: `of ${formatNumber(budgetGb)} GB soft budget`,
      details: `${snapshot.objectCount.toLocaleString()} objects${approxNote} · refreshed ${ageMin}m ago`,
    });
  }
}
