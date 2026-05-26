import { PollingJobOverride } from "../entities/polling-job-override.entity";

export abstract class PollingJobOverrideRepository {
  abstract findAll(): Promise<PollingJobOverride[]>;
  abstract save(override: PollingJobOverride): Promise<PollingJobOverride>;
}
