export class ScheduledJobOverride {
  jobName: string;

  active: boolean;

  cronExpression: string | null;

  nightSuspensionHours: number | null;
}
