import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ScheduledJobsGlobalSettings } from "../entities/scheduled-jobs-global-settings.entity";
import { ScheduledJobsGlobalSettingsRepository } from "./scheduled-jobs-global-settings.repository";

@Injectable()
export class PostgresScheduledJobsGlobalSettingsRepository
  implements ScheduledJobsGlobalSettingsRepository
{
  constructor(
    @InjectRepository(ScheduledJobsGlobalSettings)
    private readonly repository: Repository<ScheduledJobsGlobalSettings>,
  ) {}

  findByKey(settingsKey: string): Promise<ScheduledJobsGlobalSettings | null> {
    return this.repository.findOne({ where: { settingsKey } });
  }

  save(settings: ScheduledJobsGlobalSettings): Promise<ScheduledJobsGlobalSettings> {
    return this.repository.save(settings);
  }
}
