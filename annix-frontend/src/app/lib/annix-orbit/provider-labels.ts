const PROVIDER_LABELS: Record<string, string> = {
  adzuna: "Adzuna",
  remotive: "Remotive",
  dpsa: "DPSA",
  executiveplacements: "Executive Placements",
  jobplacements: "Job Placements",
  jobmail: "JobMail",
};

export function providerLabel(provider: string | null): string | null {
  if (!provider) return null;
  const mapped = PROVIDER_LABELS[provider];
  return mapped || provider;
}

export function providerBadgeLabel(provider: string | null): string | null {
  const label = providerLabel(provider);
  return label ? `via ${label}` : null;
}
