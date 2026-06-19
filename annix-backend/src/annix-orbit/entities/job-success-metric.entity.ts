import { JobPosting } from "./job-posting.entity";

export enum SuccessMetricTimeframe {
  THREE_MONTHS = "3_months",
  TWELVE_MONTHS = "12_months",
}

export class JobSuccessMetric {
  id: number;

  jobPosting: JobPosting;

  jobPostingId: number;

  timeframe: SuccessMetricTimeframe;

  metric: string;

  sortOrder: number;

  createdAt: Date;
}
