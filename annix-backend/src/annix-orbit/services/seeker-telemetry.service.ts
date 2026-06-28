import { Injectable, Logger } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { SeekerTestEvent } from "../entities/seeker-test-event.entity";
import { SeekerTestEventRepository } from "../repositories/seeker-test-event.repository";

export interface RecordEventOptions {
  durationMs?: number | null;
  ok?: boolean;
  errorMessage?: string | null;
  page?: string | null;
  phaseId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LatencyStat {
  eventName: string;
  samples: number;
  p50Ms: number;
  p95Ms: number;
}

@Injectable()
export class SeekerTelemetryService {
  private readonly logger = new Logger(SeekerTelemetryService.name);

  constructor(private readonly events: SeekerTestEventRepository) {}

  async record(
    candidateId: number | null,
    eventName: string,
    options: RecordEventOptions = {},
  ): Promise<void> {
    try {
      await this.events.create({
        candidateId,
        eventName,
        ts: now().toJSDate(),
        durationMs: options.durationMs ?? null,
        ok: options.ok ?? true,
        errorMessage: options.errorMessage ?? null,
        page: options.page ?? null,
        phaseId: options.phaseId ?? null,
        metadata: options.metadata ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to record seeker event ${eventName}: ${message}`);
    }
  }

  recentFailures(limit = 50): Promise<SeekerTestEvent[]> {
    return this.events.recentFailures(limit);
  }

  async errorRatePct(sinceDays = 30): Promise<{ total: number; failed: number; ratePct: number }> {
    const since = now().minus({ days: sinceDays }).toJSDate();
    const [total, failed] = await Promise.all([
      this.events.countSince(since),
      this.events.countFailedSince(since),
    ]);
    const ratePct = total === 0 ? 0 : Math.round((failed / total) * 1000) / 10;
    return { total, failed, ratePct };
  }

  async latencyStats(sinceDays = 30): Promise<LatencyStat[]> {
    const since = now().minus({ days: sinceDays }).toJSDate();
    const all = await this.events.eventsSince(since);
    const byEvent = all.reduce<Map<string, number[]>>((acc, event) => {
      if (typeof event.durationMs !== "number") {
        return acc;
      }
      const list = acc.get(event.eventName) ?? [];
      list.push(event.durationMs);
      acc.set(event.eventName, list);
      return acc;
    }, new Map());
    return Array.from(byEvent.entries())
      .map(([eventName, durations]) => {
        const sorted = [...durations].sort((a, b) => a - b);
        return {
          eventName,
          samples: sorted.length,
          p50Ms: percentile(sorted, 50),
          p95Ms: percentile(sorted, 95),
        };
      })
      .sort((a, b) => b.p95Ms - a.p95Ms);
  }

  async distinctCandidatesWithEvent(eventName: string, sinceDays = 90): Promise<number> {
    const since = now().minus({ days: sinceDays }).toJSDate();
    const all = await this.events.eventsSince(since);
    const ids = all.reduce<Set<number>>((acc, event) => {
      if (event.eventName === eventName && typeof event.candidateId === "number") {
        acc.add(event.candidateId);
      }
      return acc;
    }, new Set());
    return ids.size;
  }
}

function percentile(sortedAscending: number[], pct: number): number {
  if (sortedAscending.length === 0) {
    return 0;
  }
  const rank = Math.ceil((pct / 100) * sortedAscending.length) - 1;
  const index = Math.min(Math.max(rank, 0), sortedAscending.length - 1);
  return Math.round(sortedAscending[index]);
}
