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
