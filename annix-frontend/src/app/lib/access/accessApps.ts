export type AccessSubjectType = "company" | "orbit-seeker";

export interface AccessApp {
  moduleKey: string;
  name: string;
  subjectType: AccessSubjectType;
}

export const ACCESS_APPS: AccessApp[] = [
  { moduleKey: "au-rubber", name: "AU Rubber", subjectType: "company" },
  { moduleKey: "annix-orbit", name: "Annix Orbit (employers)", subjectType: "company" },
  { moduleKey: "annix-orbit-seeker", name: "Annix Orbit (seekers)", subjectType: "orbit-seeker" },
  { moduleKey: "stock-control", name: "Stock Control", subjectType: "company" },
  { moduleKey: "rfq-platform", name: "RFQ", subjectType: "company" },
  { moduleKey: "annix-sentinel", name: "Annix Sentinel", subjectType: "company" },
  { moduleKey: "annix-rep", name: "Annix Pulse / FieldFlow", subjectType: "company" },
  { moduleKey: "insights", name: "Annix Insights", subjectType: "company" },
];

export function accessAppByModuleKey(moduleKey: string): AccessApp | null {
  return ACCESS_APPS.find((app) => app.moduleKey === moduleKey) ?? null;
}
