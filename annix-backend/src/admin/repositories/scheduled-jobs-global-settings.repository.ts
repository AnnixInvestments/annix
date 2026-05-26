import { ScheduledJobsGlobalSettings } from "../entities/scheduled-jobs-global-settings.entity";

export abstract class ScheduledJobsGlobalSettingsRepository {
  abstract findByKey(settingsKey: string): Promise<ScheduledJobsGlobalSettings | null>;
  abstract save(settings: ScheduledJobsGlobalSettings): Promise<ScheduledJobsGlobalSettings>;
}
