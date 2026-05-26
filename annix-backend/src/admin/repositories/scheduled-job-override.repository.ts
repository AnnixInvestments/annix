import { ScheduledJobOverride } from "../entities/scheduled-job-override.entity";

export type ScheduledJobOverrideInput = Partial<ScheduledJobOverride> &
  Pick<ScheduledJobOverride, "jobName">;

export abstract class ScheduledJobOverrideRepository {
  abstract findAll(): Promise<ScheduledJobOverride[]>;
  abstract findByJobName(jobName: string): Promise<ScheduledJobOverride | null>;
  abstract save(override: ScheduledJobOverrideInput): Promise<ScheduledJobOverride>;
}
