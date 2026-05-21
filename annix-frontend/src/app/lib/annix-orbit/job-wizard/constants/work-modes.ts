export type WorkModeValue = "on_site" | "hybrid" | "remote";

export interface WorkModeOption {
  value: WorkModeValue;
  label: string;
  description: string;
}

export const WORK_MODE_OPTIONS: readonly WorkModeOption[] = [
  { value: "on_site", label: "On-site", description: "Full-time at a physical location" },
  { value: "hybrid", label: "Hybrid", description: "Mix of on-site and remote" },
  { value: "remote", label: "Remote", description: "Work from anywhere" },
] as const;
