export type OrbitModuleKey = "seeker" | "portal" | "recruiter" | "student";

export interface OrbitModuleManifest {
  name: string;
  startUrl: string;
  scope: string;
  shortcuts: Array<{ name: string; url: string; description?: string }>;
}

export const ORBIT_MODULE_MANIFESTS: Record<OrbitModuleKey, OrbitModuleManifest> = {
  seeker: {
    name: "Annix Orbit Seeker",
    startUrl: "/annix/orbit/seeker/dashboard",
    scope: "/annix/orbit/seeker",
    shortcuts: [
      { name: "My applications", url: "/annix/orbit/seeker/applications" },
      { name: "Interviews", url: "/annix/orbit/seeker/calendar" },
      { name: "Browse jobs", url: "/annix/orbit/seeker/jobs" },
    ],
  },
  portal: {
    name: "Orbit Company",
    startUrl: "/annix/orbit/portal/dashboard",
    scope: "/annix/orbit/portal",
    shortcuts: [
      { name: "Jobs", url: "/annix/orbit/portal/jobs" },
      { name: "Candidates", url: "/annix/orbit/portal/candidates" },
      { name: "Calendar", url: "/annix/orbit/portal/calendar" },
    ],
  },
  recruiter: {
    name: "Orbit Recruiter",
    startUrl: "/annix/orbit/recruiter/dashboard",
    scope: "/annix/orbit/recruiter",
    shortcuts: [
      { name: "Jobs", url: "/annix/orbit/recruiter/jobs" },
      { name: "Candidates", url: "/annix/orbit/recruiter/candidates" },
    ],
  },
  student: {
    name: "Orbit Student",
    startUrl: "/annix/orbit/student/dashboard",
    scope: "/annix/orbit/student",
    shortcuts: [
      { name: "FuturePath", url: "/annix/orbit/student/futurepath" },
      { name: "Dashboard", url: "/annix/orbit/student/dashboard" },
    ],
  },
};

export function orbitModuleManifest(module: string | null): OrbitModuleManifest | null {
  if (!module) return null;
  const found = ORBIT_MODULE_MANIFESTS[module as OrbitModuleKey];
  return found || null;
}
