import type { RevenuePoint, SourceBreakdownItem } from "../dto/recruiter-dashboard.dto";
import {
  type AnnixOrbitCandidateSource,
  ORBIT_CANDIDATE_SOURCES,
} from "../entities/annix-orbit-talent-candidate.entity";

// Pure aggregation helpers for the recruiter dashboard (issue #362
// phase 1) — kept free of repositories so the maths is unit-tested
// directly. Dates are ISO `yyyy-MM-dd`; lexicographic comparison is
// correct and timezone-free.

const SOURCE_LABELS: Record<AnnixOrbitCandidateSource, string> = {
  database: "Database",
  referral: "Referrals",
  website: "Website",
  social: "Social Media",
  job_board: "Job Boards",
  other: "Other",
};

export function isoDateOf(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value.slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return shifted.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map((p) => Number.parseInt(p, 10));
  const [ty, tm, td] = to.split("-").map((p) => Number.parseInt(p, 10));
  const diff = (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000;
  return diff + 1;
}

export interface DashboardRange {
  from: string;
  to: string;
  priorFrom: string;
  priorTo: string;
}

// Resolve the requested window (default: last 30 days ending today) and
// the equal-length window immediately before it for deltas.
export function computeRange(
  from: string | undefined,
  to: string | undefined,
  today: string,
): DashboardRange {
  const resolvedTo = to && to.length === 10 ? to : today;
  const resolvedFrom = from && from.length === 10 ? from : addDaysIso(resolvedTo, -29);
  const length = Math.max(1, daysBetweenInclusive(resolvedFrom, resolvedTo));
  const priorTo = addDaysIso(resolvedFrom, -1);
  const priorFrom = addDaysIso(priorTo, -(length - 1));
  return { from: resolvedFrom, to: resolvedTo, priorFrom, priorTo };
}

export function inRange(date: string | null, from: string, to: string): boolean {
  if (!date) {
    return false;
  }
  return date >= from && date <= to;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export interface DatedAmount {
  createdAt: Date | string | null;
  placementFee: number | null;
}

// Daily cumulative revenue across the range (one point per day), plus
// the range total.
export function buildRevenueSeries(
  placements: DatedAmount[],
  from: string,
  to: string,
): { series: RevenuePoint[]; total: number } {
  const dailyByDate = placements.reduce((acc, placement) => {
    const date = isoDateOf(placement.createdAt);
    if (!date || !inRange(date, from, to)) {
      return acc;
    }
    const fee = placement.placementFee ?? 0;
    acc.set(date, (acc.get(date) ?? 0) + fee);
    return acc;
  }, new Map<string, number>());

  const dayCount = Math.max(1, daysBetweenInclusive(from, to));
  let running = 0;
  const series = Array.from({ length: dayCount }, (_unused, index) => {
    const date = addDaysIso(from, index);
    running += dailyByDate.get(date) ?? 0;
    return { date, amount: running };
  });
  return { series, total: running };
}

export function buildSourceBreakdown(sources: Array<string | null | undefined>): {
  total: number;
  items: SourceBreakdownItem[];
} {
  const counts = sources.reduce((acc, raw) => {
    const source = (raw ?? "database") as AnnixOrbitCandidateSource;
    const key = ORBIT_CANDIDATE_SOURCES.includes(source) ? source : "other";
    acc.set(key, (acc.get(key) ?? 0) + 1);
    return acc;
  }, new Map<AnnixOrbitCandidateSource, number>());

  const total = sources.length;
  const items = ORBIT_CANDIDATE_SOURCES.map((source) => {
    const count = counts.get(source) ?? 0;
    const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return { source, label: SOURCE_LABELS[source], count, pct };
  }).filter((item) => item.count > 0);

  return { total, items };
}

export interface ConsultantPlacement {
  consultantUserId: number | null;
  placementFee: number | null;
}

export interface GroupedConsultant {
  userId: number | null;
  placements: number;
  revenue: number;
  deltaPct: number | null;
}

// Group placements by consultant for the leaderboard, with a revenue
// delta vs the prior window. Sorted by revenue desc, top N.
export function groupConsultants(
  current: ConsultantPlacement[],
  prior: ConsultantPlacement[],
  limit: number,
): GroupedConsultant[] {
  const tally = (rows: ConsultantPlacement[]) =>
    rows.reduce((acc, row) => {
      const key = row.consultantUserId;
      const existing = acc.get(key) ?? { placements: 0, revenue: 0 };
      existing.placements += 1;
      existing.revenue += row.placementFee ?? 0;
      acc.set(key, existing);
      return acc;
    }, new Map<number | null, { placements: number; revenue: number }>());

  const currentTally = tally(current);
  const priorTally = tally(prior);

  return Array.from(currentTally.entries())
    .map(([userId, stats]) => {
      const priorRevenue = priorTally.get(userId)?.revenue ?? 0;
      return {
        userId,
        placements: stats.placements,
        revenue: stats.revenue,
        deltaPct: pctChange(stats.revenue, priorRevenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}
