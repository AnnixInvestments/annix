import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ScheduledJobsGlobalSettings } from "../entities/scheduled-jobs-global-settings.entity";
import { ScheduledJobsGlobalSettingsRepository } from "./scheduled-jobs-global-settings.repository";

type ScheduledJobsGlobalSettingsDocument = {
  _id: string;
  suspendOnWeekendsAndHolidays?: boolean;
  pauseAllJobs?: boolean;
};

@Injectable()
export class MongoScheduledJobsGlobalSettingsRepository
  implements ScheduledJobsGlobalSettingsRepository
{
  constructor(
    @InjectModel("ScheduledJobsGlobalSettings")
    private readonly model: Model<Record<string, unknown>>,
  ) {}

  private toDomain(document: ScheduledJobsGlobalSettingsDocument): ScheduledJobsGlobalSettings {
    return {
      settingsKey: document._id,
      suspendOnWeekendsAndHolidays: document.suspendOnWeekendsAndHolidays ?? true,
      pauseAllJobs: document.pauseAllJobs ?? false,
    };
  }

  async findByKey(settingsKey: string): Promise<ScheduledJobsGlobalSettings | null> {
    const doc = await this.model
      .findById(settingsKey)
      .lean<ScheduledJobsGlobalSettingsDocument>()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(settings: ScheduledJobsGlobalSettings): Promise<ScheduledJobsGlobalSettings> {
    const saved = await this.model
      .findByIdAndUpdate(
        settings.settingsKey,
        {
          $set: {
            suspendOnWeekendsAndHolidays: settings.suspendOnWeekendsAndHolidays,
            pauseAllJobs: settings.pauseAllJobs,
          },
          $setOnInsert: { _id: settings.settingsKey },
        },
        { new: true, upsert: true },
      )
      .lean<ScheduledJobsGlobalSettingsDocument>()
      .exec();
    return this.toDomain(saved as ScheduledJobsGlobalSettingsDocument);
  }
}
