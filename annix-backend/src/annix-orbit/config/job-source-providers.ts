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
    id: JobSourceProvider.JOOBLE,
    label: "Jooble",
    description: "Aggregated job listings via the Jooble API",
    credentialFields: [{ key: "apiKey", label: "API Key", secret: true }],
  },
  {
    id: JobSourceProvider.REMOTIVE,
    label: "Remotive",
    description: "Remote job listings via the public Remotive API",
    credentialFields: [],
  },
];
