import type { PipelineFunnel } from "../services/recruiter-pipeline";

export interface KpiValue {
  value: number;
  deltaPct: number | null;
}

export interface RecruiterDashboardRange {
  from: string;
  to: string;
}

export interface DashboardKpis {
  totalCandidates: KpiValue;
  activeClients: KpiValue;
  activeJobs: KpiValue;
  submissions: KpiValue;
  placements: KpiValue;
  revenue: KpiValue;
}

export interface RevenuePoint {
  date: string;
  amount: number;
}

export interface TopConsultant {
  userId: number | null;
  name: string;
  placements: number;
  revenue: number;
  deltaPct: number | null;
}

export interface RecentPlacement {
  id: number;
  candidateName: string;
  jobTitle: string;
  clientName: string | null;
  fee: number | null;
  date: string | null;
}

export interface SourceBreakdownItem {
  source: string;
  label: string;
  count: number;
  pct: number;
}

export interface UpcomingInterview {
  submissionId: number;
  candidateName: string;
  jobTitle: string;
  clientName: string | null;
  interviewAt: string | null;
}

export interface RecruiterDashboardDto {
  range: RecruiterDashboardRange;
  kpis: DashboardKpis;
  pipeline: PipelineFunnel;
  revenueSeries: RevenuePoint[];
  revenueTotal: number;
  topConsultants: { gated: boolean; items: TopConsultant[] };
  recentPlacements: RecentPlacement[];
  sourceBreakdown: { total: number; items: SourceBreakdownItem[] };
  upcomingInterviews: UpcomingInterview[];
  complianceAlerts: { candidateCount: number; credentialCount: number };
  tasksDue: number;
}
