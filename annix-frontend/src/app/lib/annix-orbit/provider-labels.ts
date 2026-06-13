const PROVIDER_LABELS: Record<string, string> = {
  adzuna: "Adzuna",
  remotive: "Remotive",
  dpsa: "DPSA",
  careerjet: "Careerjet",
  jooble: "Jooble",
  careerjunction: "CareerJunction",
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

const HOST_SOURCE_LABELS: Array<[RegExp, string]> = [
  [/adzuna\./i, "Adzuna"],
  [/careerjet\./i, "Careerjet"],
  [/remotive\./i, "Remotive"],
  [/jooble\./i, "Jooble"],
  [/careerjunction\./i, "CareerJunction"],
  [/executiveplacements\./i, "Executive Placements"],
  [/jobplacements\./i, "Job Placements"],
  [/jobmail\./i, "JobMail"],
  [/pnet\./i, "PNet"],
  [/careers24\./i, "Careers24"],
  [/indeed\./i, "Indeed"],
  [/linkedin\./i, "LinkedIn"],
];

// Friendly name of the site an apply link lands on, so the seeker knows where
// they're being taken (e.g. "Apply on Adzuna"). Prefers the known provider,
// then a known host, then the bare hostname.
export function sourceNameFromUrl(url: string | null, provider?: string | null): string {
  const fromProvider = providerLabel(provider ?? null);
  if (fromProvider) return fromProvider;
  if (!url) return "the job site";
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const known = HOST_SOURCE_LABELS.find(([pattern]) => pattern.test(host));
    return known ? known[1] : host;
  } catch {
    return "the job site";
  }
}
