import { getHeapSpaceStatistics, getHeapStatistics } from "node:v8";
import { Inject, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
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

export interface PlatformLimitBreakdownRow {
  label: string;
  value: number;
  unit: string;
  percent: number | null;
}

export interface PlatformLimitBreakdown {
  id: string;
  title: string;
  generatedAt: string;
  rows: PlatformLimitBreakdownRow[];
  note: string | null;
}

const VM_MEMORY_CAP_MB = 1024;
const HEAP_FALLBACK_CAP_MB = 768;
const HTTP_HARD_LIMIT = 50;
const HTTP_SOFT_LIMIT = 25;
const ATLAS_STORAGE_CAP_MB = 512;
const ATLAS_COLLECTION_CAP = 500;
const DEFAULT_RETENTION_CAP = 15000;
const AI_DAILY_CALL_SOFT_CAP = 100_000;
const AI_DAILY_TOKEN_SOFT_CAP = 5_000_000;
const REQUEST_P95_TARGET_MS = 1000;
const S3_SOFT_BUDGET_GB = 25;
const DYNAMIC_CARDS_TTL_MS = 5 * 60 * 1000;
const AI_TOTALS_TTL_MS = 60 * 1000;
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
  private dynamicCardsCache: { atMs: number; cards: (PlatformLimitCard | null)[] } | null = null;
  private refreshingDynamicCards = false;
  private aiTotalsCache: { atMs: number; totals: { calls: number; tokens: number } | null } | null =
    null;

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
    const [aiTotals, dynamicCards] = await Promise.all([
      this.cachedAiTotals(),
      this.cachedDynamicCards(),
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

  private async cachedAiTotals(): Promise<{ calls: number; tokens: number } | null> {
    const cache = this.aiTotalsCache;
    if (cache && nowMillis() - cache.atMs < AI_TOTALS_TTL_MS) {
      return cache.totals;
    }
    const totals = await this.aiDailyTotals();
    this.aiTotalsCache = { atMs: nowMillis(), totals };
    return totals;
  }

  private async cachedDynamicCards(): Promise<(PlatformLimitCard | null)[]> {
    const cache = this.dynamicCardsCache;
    if (cache && nowMillis() - cache.atMs < DYNAMIC_CARDS_TTL_MS) {
      return cache.cards;
    }
    if (cache) {
      void this.refreshDynamicCards().catch((error) => {
        this.logger.warn(`background dynamic-card refresh failed: ${String(error)}`);
      });
      return cache.cards;
    }
    return this.refreshDynamicCards();
  }

  private async refreshDynamicCards(): Promise<(PlatformLimitCard | null)[]> {
    const cache = this.dynamicCardsCache;
    if (this.refreshingDynamicCards && cache) {
      return cache.cards;
    }
    this.refreshingDynamicCards = true;
    try {
      const cards = await Promise.all([
        this.orbitStorageCard(),
        this.collectionCountCard(this.mainConnection, "collections-main", "Collections — main DB"),
        this.collectionCountCard(
          this.orbitConnection,
          "collections-orbit",
          "Collections — Orbit DB",
        ),
        this.externalJobsCard(),
      ]);
      this.dynamicCardsCache = { atMs: nowMillis(), cards };
      return cards;
    } finally {
      this.refreshingDynamicCards = false;
    }
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
    if (!connection?.db) return null;
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
    if (!connection?.db) return null;
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
      limitLabel: `of ${formatNumber(softCap)} Gemini RPD`,
      details: `binding cap: Gemini 2.5 Flash 100K requests/day (Tier 2) · ${totals.tokens.toLocaleString()} tokens today`,
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
      limitLabel: `of ${formatNumber(budgetMillions)}M cost guard`,
      details: `Gemini has no daily token cap (3–10M TPM per model) — this is a self-imposed cost guard · ${totals.tokens.toLocaleString()} tokens across ${totals.calls} calls today`,
    });
  }

  async breakdown(cardId: string): Promise<PlatformLimitBreakdown> {
    if (cardId === "vm-memory") return this.vmMemoryBreakdown();
    if (cardId === "node-heap") return this.nodeHeapBreakdown();
    if (cardId === "uptime") return this.uptimeBreakdown();
    if (cardId === "active-requests") return this.activeRequestsBreakdown();
    if (cardId === "request-p95") return this.latencyBreakdown();
    if (cardId === "request-errors") return this.errorsBreakdown();
    if (cardId === "orbit-storage") return this.orbitStorageBreakdown();
    if (cardId === "collections-main")
      return this.collectionsBreakdown(this.mainConnection, cardId, "Collections — main DB");
    if (cardId === "collections-orbit")
      return this.collectionsBreakdown(this.orbitConnection, cardId, "Collections — Orbit DB");
    if (cardId === "external-jobs") return this.externalJobsBreakdown();
    if (cardId === "s3-storage") return this.s3Breakdown();
    throw new NotFoundException(`No breakdown available for card '${cardId}'`);
  }

  private breakdownResult(
    id: string,
    title: string,
    rows: PlatformLimitBreakdownRow[],
    note: string | null,
  ): PlatformLimitBreakdown {
    return { id, title, generatedAt: nowISO(), rows, note };
  }

  private vmMemoryBreakdown(): PlatformLimitBreakdown {
    const usage = process.memoryUsage();
    const capMb = Number(process.env.FLY_VM_MEMORY_MB) || VM_MEMORY_CAP_MB;
    const toMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
    const rssMb = toMb(usage.rss);
    const rows: PlatformLimitBreakdownRow[] = [
      { label: "Resident set (RSS)", value: rssMb, unit: "MB", percent: percentOf(rssMb, capMb) },
      {
        label: "V8 heap used",
        value: toMb(usage.heapUsed),
        unit: "MB",
        percent: percentOf(toMb(usage.heapUsed), capMb),
      },
      {
        label: "V8 heap allocated",
        value: toMb(usage.heapTotal),
        unit: "MB",
        percent: percentOf(toMb(usage.heapTotal), capMb),
      },
      {
        label: "External (buffers, C++)",
        value: toMb(usage.external),
        unit: "MB",
        percent: percentOf(toMb(usage.external), capMb),
      },
      {
        label: "ArrayBuffers",
        value: toMb(usage.arrayBuffers),
        unit: "MB",
        percent: percentOf(toMb(usage.arrayBuffers), capMb),
      },
    ];
    return this.breakdownResult(
      "vm-memory",
      "VM memory (RSS)",
      rows,
      `every row shown as share of the ${capMb} MB Fly VM cap — bars only heat up near the cap`,
    );
  }

  private nodeHeapBreakdown(): PlatformLimitBreakdown {
    const heap = getHeapStatistics();
    const limitMb = Math.round(heap.heap_size_limit / 1024 / 1024) || HEAP_FALLBACK_CAP_MB;
    const spaces = getHeapSpaceStatistics()
      .filter((space) => space.space_used_size > 0)
      .sort((a, b) => b.space_used_size - a.space_used_size);
    const rows = spaces.map((space) => {
      const usedMb = Math.round((space.space_used_size / 1024 / 1024) * 10) / 10;
      return {
        label: space.space_name.replace(/_/g, " "),
        value: usedMb,
        unit: "MB",
        percent: percentOf(usedMb, limitMb),
      };
    });
    return this.breakdownResult(
      "node-heap",
      "Node heap by V8 space",
      rows,
      `heap limit ${formatNumber(limitMb)} MB (--max-old-space-size) · share of heap limit`,
    );
  }

  private uptimeBreakdown(): PlatformLimitBreakdown {
    const seconds = Math.round(process.uptime());
    const startedAt = now().minus({ seconds }).toISO();
    const rows: PlatformLimitBreakdownRow[] = [
      {
        label: "Uptime",
        value: Math.round((seconds / 3600) * 10) / 10,
        unit: "h",
        percent: null,
      },
    ];
    return this.breakdownResult(
      "uptime",
      "Process uptime",
      rows,
      `started ${startedAt} · Node ${process.version} · PID ${process.pid} · ${formatDuration(seconds)} — every deploy restarts the process`,
    );
  }

  private activeRequestsBreakdown(): PlatformLimitBreakdown {
    const snapshot = this.requestMetrics.snapshot();
    const rows: PlatformLimitBreakdownRow[] = [
      {
        label: "Active right now",
        value: snapshot.active,
        unit: "req",
        percent: percentOf(snapshot.active, HTTP_HARD_LIMIT),
      },
      {
        label: "Peak concurrent (5m)",
        value: snapshot.peak5m,
        unit: "req",
        percent: percentOf(snapshot.peak5m, HTTP_HARD_LIMIT),
      },
      {
        label: "Requests handled (5m)",
        value: snapshot.sampleSize5m,
        unit: "req",
        percent: null,
      },
      {
        label: "5xx responses (5m)",
        value: snapshot.errors5m,
        unit: "errors",
        percent: null,
      },
    ];
    return this.breakdownResult(
      "active-requests",
      "HTTP concurrency",
      rows,
      `Fly concurrency: soft limit ${HTTP_SOFT_LIMIT}, hard limit ${HTTP_HARD_LIMIT} requests per machine`,
    );
  }

  private latencyBreakdown(): PlatformLimitBreakdown {
    const snapshot = this.requestMetrics.snapshot();
    const target = Number(process.env.REQUEST_P95_TARGET_MS) || REQUEST_P95_TARGET_MS;
    const rows = snapshot.slowRoutes.map((route) => ({
      label: `${route.route} (${route.count}x)`,
      value: route.p95Ms,
      unit: "ms",
      percent: percentOf(route.p95Ms, target),
    }));
    const overall = snapshot.p95Ms5m ?? 0;
    return this.breakdownResult(
      "request-p95",
      "Slowest routes by p95 (5m)",
      rows,
      `overall p95 ${formatNumber(overall)} ms over ${snapshot.sampleSize5m} requests · target ${formatNumber(target)} ms`,
    );
  }

  private errorsBreakdown(): PlatformLimitBreakdown {
    const snapshot = this.requestMetrics.snapshot();
    const rows = snapshot.errorRoutes.map((route) => ({
      label: route.route,
      value: route.count,
      unit: "errors",
      percent: percentOf(route.count, Math.max(1, snapshot.errors5m)),
    }));
    const rate =
      snapshot.sampleSize5m > 0
        ? Math.round((snapshot.errors5m / snapshot.sampleSize5m) * 1000) / 10
        : 0;
    return this.breakdownResult(
      "request-errors",
      "5xx responses by route (5m)",
      rows,
      rows.length === 0
        ? "no server errors in the last 5 minutes"
        : `${snapshot.errors5m} errors · ${rate}% of ${snapshot.sampleSize5m} requests`,
    );
  }

  private async orbitStorageBreakdown(): Promise<PlatformLimitBreakdown> {
    const connection = this.orbitConnection;
    if (!connection) throw new NotFoundException("Orbit connection unavailable");
    const client = connection.getClient();
    const { databases } = await client.db().admin().listDatabases();
    const orbitDbs = databases.filter((database) => database.name.startsWith("orbit_"));
    const rows = await Promise.all(
      orbitDbs.map(async (database) => {
        const stats = await client.db(database.name).command({ dbStats: 1 });
        const sizeMb =
          Math.round((((stats.dataSize ?? 0) + (stats.indexSize ?? 0)) / 1024 / 1024) * 10) / 10;
        return {
          label: database.name,
          value: sizeMb,
          unit: "MB",
          percent: percentOf(sizeMb, ATLAS_STORAGE_CAP_MB),
        };
      }),
    );
    const sorted = [...rows].sort((a, b) => b.value - a.value);
    return this.breakdownResult(
      "orbit-storage",
      "Orbit cluster storage by database",
      sorted,
      `all orbit_* databases share the single ${ATLAS_STORAGE_CAP_MB} MB Atlas M0 logical-size cap`,
    );
  }

  private async collectionsBreakdown(
    connection: Connection | null,
    id: string,
    title: string,
  ): Promise<PlatformLimitBreakdown> {
    if (!connection?.db) throw new NotFoundException("Connection unavailable");
    const collections = await connection.db.listCollections().toArray();
    const total = collections.length;
    const prefixCounts = collections.reduce<Map<string, number>>((acc, collection) => {
      const prefix = collection.name.split("_")[0];
      acc.set(prefix, (acc.get(prefix) ?? 0) + 1);
      return acc;
    }, new Map());
    const rows = [...prefixCounts.entries()]
      .map(([prefix, count]) => ({
        label: `${prefix}_*`,
        value: count,
        unit: "collections",
        percent: percentOf(count, ATLAS_COLLECTION_CAP),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
    return this.breakdownResult(
      id,
      `${title} — by prefix`,
      rows,
      `${total} collections of the Atlas M0 ${ATLAS_COLLECTION_CAP}-collection cap · top 15 prefixes · each row shown as share of the cap`,
    );
  }

  private async externalJobsBreakdown(): Promise<PlatformLimitBreakdown> {
    const connection = this.orbitConnection;
    if (!connection?.db) throw new NotFoundException("Orbit connection unavailable");
    const collection = connection.db.collection(EXTERNAL_JOBS_COLLECTION);
    const total = await collection.estimatedDocumentCount();
    const settings = await connection.db
      .collection<{ _id: string; externalJobRetentionCap?: number }>(ORBIT_SETTINGS_COLLECTION)
      .findOne({ _id: "default" });
    const cap =
      settings && typeof settings.externalJobRetentionCap === "number"
        ? settings.externalJobRetentionCap
        : DEFAULT_RETENTION_CAP;
    const byCountry = (await collection
      .aggregate([
        { $group: { _id: { $ifNull: ["$country", "unknown"] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray()) as { _id: string; count: number }[];
    const last24h = await collection.countDocuments({
      createdAt: { $gte: now().minus({ hours: 24 }).toJSDate() },
    });
    const rows = byCountry.map((entry) => ({
      label: entry._id,
      value: entry.count,
      unit: "jobs",
      percent: percentOf(entry.count, cap),
    }));
    return this.breakdownResult(
      "external-jobs",
      "External jobs by country",
      rows,
      `${formatNumber(total)} jobs of the ${formatNumber(cap)} retention cap · ${formatNumber(last24h)} ingested in the last 24h · each row shown as share of the cap`,
    );
  }

  private s3Breakdown(): PlatformLimitBreakdown {
    const snapshot = this.s3Usage.snapshot();
    if (snapshot === null) throw new NotFoundException("S3 usage snapshot unavailable");
    const gb = Math.round((snapshot.sizeBytes / 1024 / 1024 / 1024) * 100) / 100;
    const budgetGb = Number(process.env.S3_SOFT_BUDGET_GB) || S3_SOFT_BUDGET_GB;
    const avgKb =
      snapshot.objectCount > 0 ? Math.round(snapshot.sizeBytes / snapshot.objectCount / 1024) : 0;
    const rows: PlatformLimitBreakdownRow[] = [
      { label: "Stored size", value: gb, unit: "GB", percent: percentOf(gb, budgetGb) },
      { label: "Objects", value: snapshot.objectCount, unit: "objects", percent: null },
      { label: "Average object size", value: avgKb, unit: "KB", percent: null },
    ];
    const ageMin = Math.round((nowMillis() - snapshot.computedAtMs) / 60000);
    const approxNote = snapshot.approximate ? " · approximate (capped scan)" : "";
    return this.breakdownResult(
      "s3-storage",
      "S3 object storage",
      rows,
      `soft budget ${formatNumber(budgetGb)} GB · snapshot refreshed ${ageMin}m ago${approxNote}`,
    );
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
