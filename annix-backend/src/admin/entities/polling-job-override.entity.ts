export class PollingJobOverride {
  jobName: string;

  active: boolean;

  intervalMs: number | null;

  nightSuspensionHours: number | null;
}
