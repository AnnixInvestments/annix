import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ScheduledJobOverride } from "../entities/scheduled-job-override.entity";
import {
  ScheduledJobOverrideInput,
  ScheduledJobOverrideRepository,
} from "./scheduled-job-override.repository";

type ScheduledJobOverrideDocument = {
  _id: string;
  active?: boolean;
  cronExpression?: string | null;
  nightSuspensionHours?: number | null;
};

@Injectable()
export class MongoScheduledJobOverrideRepository implements ScheduledJobOverrideRepository {
  constructor(
    @InjectModel("ScheduledJobOverride")
    private readonly model: Model<Record<string, unknown>>,
  ) {}

  private toDomain(document: ScheduledJobOverrideDocument): ScheduledJobOverride {
    return {
      jobName: document._id,
      active: document.active ?? true,
      cronExpression: document.cronExpression ?? null,
      nightSuspensionHours: document.nightSuspensionHours ?? null,
    };
  }

  async findAll(): Promise<ScheduledJobOverride[]> {
    const docs = await this.model.find().lean<ScheduledJobOverrideDocument[]>().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async findByJobName(jobName: string): Promise<ScheduledJobOverride | null> {
    const doc = await this.model.findById(jobName).lean<ScheduledJobOverrideDocument>().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async save(override: ScheduledJobOverrideInput): Promise<ScheduledJobOverride> {
    const update: Record<string, unknown> = {};
    if (override.active !== undefined) update.active = override.active;
    if (override.cronExpression !== undefined) update.cronExpression = override.cronExpression;
    if (override.nightSuspensionHours !== undefined) {
      update.nightSuspensionHours = override.nightSuspensionHours;
    }
    const saved = await this.model
      .findByIdAndUpdate(
        override.jobName,
        { $set: update, $setOnInsert: { _id: override.jobName } },
        { new: true, upsert: true },
      )
      .lean<ScheduledJobOverrideDocument>()
      .exec();
    return this.toDomain(saved as ScheduledJobOverrideDocument);
  }
}
