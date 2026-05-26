import { PollingJobsGlobalSettings } from "../entities/polling-jobs-global-settings.entity";

export abstract class PollingJobsGlobalSettingsRepository {
  abstract findByKey(settingsKey: string): Promise<PollingJobsGlobalSettings | null>;
  abstract save(settings: PollingJobsGlobalSettings): Promise<PollingJobsGlobalSettings>;
}
