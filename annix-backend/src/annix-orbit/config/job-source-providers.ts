import { JobSourceProvider } from "../entities/job-market-source.entity";

export interface JobSourceCredentialField {
  key: "apiId" | "apiKey";
  label: string;
  secret: boolean;
}

export interface JobSourceProviderInfo {
  id: JobSourceProvider;
  label: string;
  description: string;
  credentialFields: JobSourceCredentialField[];
}

export const JOB_SOURCE_PROVIDERS: JobSourceProviderInfo[] = [
  {
    id: JobSourceProvider.ADZUNA,
    label: "Adzuna",
    description: "South African job listings via the Adzuna API",
    credentialFields: [
      { key: "apiId", label: "App ID", secret: false },
      { key: "apiKey", label: "App Key", secret: true },
    ],
  },
  {
    id: JobSourceProvider.REMOTIVE,
    label: "Remotive",
    description: "Remote job listings via the public Remotive API",
    credentialFields: [],
  },
  {
    id: JobSourceProvider.EXECUTIVE_PLACEMENTS,
    label: "Executive Placements",
    description: "SA job listings crawled from the Executive Placements sitemap (no API key)",
    credentialFields: [],
  },
  {
    id: JobSourceProvider.JOB_PLACEMENTS,
    label: "Job Placements",
    description: "SA job listings crawled from the Job Placements sitemap (no API key)",
    credentialFields: [],
  },
  {
    id: JobSourceProvider.JOBMAIL,
    label: "JobMail",
    description: "SA job listings crawled from the JobMail sitemap (no API key)",
    credentialFields: [],
  },
];

// Fallback source-respect ranking (higher = kept when de-duplicating). The
// live values live in the cv_assistant_source_respect_ranks table; this mirrors
// the researched seed and is used only when the table has no row for a provider.
export const SOURCE_RESPECT_RANK: Record<string, number> = {
  [JobSourceProvider.DPSA]: 100,
  [JobSourceProvider.EXECUTIVE_PLACEMENTS]: 85,
  [JobSourceProvider.JOBMAIL]: 75,
  [JobSourceProvider.JOB_PLACEMENTS]: 70,
  [JobSourceProvider.ADZUNA]: 50,
  [JobSourceProvider.REMOTIVE]: 40,
};

export function sourceRespectRank(provider: string): number {
  return SOURCE_RESPECT_RANK[provider] ?? 0;
}
