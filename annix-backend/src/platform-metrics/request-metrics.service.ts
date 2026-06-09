import { Injectable } from "@nestjs/common";
import { nowMillis } from "../lib/datetime";

interface RequestSample {
  at: number;
  ms: number;
  status: number;
  route: string;
}

export interface SlowRoute {
  route: string;
  p95Ms: number;
  count: number;
}

export interface RequestMetricsSnapshot {
  active: number;
  peak5m: number;
  p95Ms5m: number | null;
  errors5m: number;
  sampleSize5m: number;
  slowRoutes: SlowRoute[];
}

const FIVE_MIN_MS = 5 * 60 * 1000;
const FIFTEEN_MIN_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 5000;

function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  const index = Math.min(sortedAsc.length - 1, Math.max(0, rank));
  return Math.round(sortedAsc[index]);
}

function topSlowRoutes(window: RequestSample[], limit: number): SlowRoute[] {
  const routes = [...new Set(window.map((sample) => sample.route))];
  return routes
    .map((route) => {
      const durations = window
        .filter((sample) => sample.route === route)
        .map((sample) => sample.ms)
        .sort((a, b) => a - b);
      return { route, p95Ms: percentile(durations, 95) ?? 0, count: durations.length };
    })
    .sort((a, b) => b.p95Ms - a.p95Ms)
    .slice(0, limit);
}

@Injectable()
export class RequestMetricsService {
  private active = 0;
  private peakActiveBucket = 0;
  private bucketStartedAt = nowMillis();
  private samples: RequestSample[] = [];

  beginRequest(): void {
    this.rollBucketIfStale();
    this.active += 1;
    if (this.active > this.peakActiveBucket) {
      this.peakActiveBucket = this.active;
    }
  }

  endRequest(durationMs: number, status: number, route: string): void {
    this.active = Math.max(0, this.active - 1);
    const at = nowMillis();
    const retained = [...this.samples, { at, ms: durationMs, status, route }].filter(
      (sample) => at - sample.at <= FIFTEEN_MIN_MS,
    );
    this.samples =
      retained.length > MAX_SAMPLES ? retained.slice(retained.length - MAX_SAMPLES) : retained;
  }

  snapshot(): RequestMetricsSnapshot {
    const at = nowMillis();
    const window = this.samples.filter((sample) => at - sample.at <= FIVE_MIN_MS);
    const durations = window.map((sample) => sample.ms).sort((a, b) => a - b);
    return {
      active: this.active,
      peak5m: Math.max(this.peakActiveBucket, this.active),
      p95Ms5m: percentile(durations, 95),
      errors5m: window.filter((sample) => sample.status >= 500).length,
      sampleSize5m: window.length,
      slowRoutes: topSlowRoutes(window, 5),
    };
  }

  private rollBucketIfStale(): void {
    const at = nowMillis();
    if (at - this.bucketStartedAt > FIVE_MIN_MS) {
      this.bucketStartedAt = at;
      this.peakActiveBucket = this.active;
    }
  }
}
