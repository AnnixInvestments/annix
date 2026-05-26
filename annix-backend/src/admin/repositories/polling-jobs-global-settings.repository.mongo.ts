import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { PollingJobsGlobalSettings } from "../entities/polling-jobs-global-settings.entity";
import { PollingJobsGlobalSettingsRepository } from "./polling-jobs-global-settings.repository";

type PollingJobsGlobalSettingsDocument = {
  _id: string;
  suspendOnWeekendsAndHolidays?: boolean;
};

@Injectable()
export class MongoPollingJobsGlobalSettingsRepository
  implements PollingJobsGlobalSettingsRepository
{
  constructor(
    @InjectModel("PollingJobsGlobalSettings")
    private readonly model: Model<Record<string, unknown>>,
  ) {}

  private toDomain(document: PollingJobsGlobalSettingsDocument): PollingJobsGlobalSettings {
    return {
      settingsKey: document._id,
      suspendOnWeekendsAndHolidays: document.suspendOnWeekendsAndHolidays ?? true,
    };
  }

  async findByKey(settingsKey: string): Promise<PollingJobsGlobalSettings | null> {
    const doc = await this.model
      .findById(settingsKey)
      .lean<PollingJobsGlobalSettingsDocument>()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(settings: PollingJobsGlobalSettings): Promise<PollingJobsGlobalSettings> {
    const saved = await this.model
      .findByIdAndUpdate(
        settings.settingsKey,
        {
          $set: { suspendOnWeekendsAndHolidays: settings.suspendOnWeekendsAndHolidays },
          $setOnInsert: { _id: settings.settingsKey },
        },
        { new: true, upsert: true },
      )
      .lean<PollingJobsGlobalSettingsDocument>()
      .exec();
    return this.toDomain(saved as PollingJobsGlobalSettingsDocument);
  }
}
