import type { CompanyRole } from "@/app/lib/api/stockControlApi";

const FALLBACK_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  accounts: "Accounts",
  storeman: "Storeman",
  quality: "Quality",
  viewer: "Viewer",
};

export function roleLabel(role: string, companyRoles?: CompanyRole[]): string {
  if (companyRoles) {
    const match = companyRoles.find((r) => r.key === role);
    if (match) return match.label;
  }
  return FALLBACK_LABELS[role] ?? role;
}
