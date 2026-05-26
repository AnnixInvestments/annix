import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PollingJobsGlobalSettings } from "../entities/polling-jobs-global-settings.entity";
import { PollingJobsGlobalSettingsRepository } from "./polling-jobs-global-settings.repository";

@Injectable()
export class PostgresPollingJobsGlobalSettingsRepository
  implements PollingJobsGlobalSettingsRepository
{
  constructor(
    @InjectRepository(PollingJobsGlobalSettings)
    private readonly repository: Repository<PollingJobsGlobalSettings>,
  ) {}

  findByKey(settingsKey: string): Promise<PollingJobsGlobalSettings | null> {
    return this.repository.findOne({ where: { settingsKey } });
  }

  save(settings: PollingJobsGlobalSettings): Promise<PollingJobsGlobalSettings> {
    return this.repository.save(settings);
  }
}
