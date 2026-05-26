import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { PollingJobOverride } from "../entities/polling-job-override.entity";
import { PollingJobOverrideRepository } from "./polling-job-override.repository";

type PollingJobOverrideDocument = {
  _id: string;
  active?: boolean;
  intervalMs?: number | null;
  nightSuspensionHours?: number | null;
};

@Injectable()
export class MongoPollingJobOverrideRepository implements PollingJobOverrideRepository {
  constructor(
    @InjectModel("PollingJobOverride")
    private readonly model: Model<Record<string, unknown>>,
  ) {}

  private toDomain(document: PollingJobOverrideDocument): PollingJobOverride {
    return {
      jobName: document._id,
      active: document.active ?? true,
      intervalMs: document.intervalMs ?? null,
      nightSuspensionHours: document.nightSuspensionHours ?? null,
    };
  }

  async findAll(): Promise<PollingJobOverride[]> {
    const docs = await this.model.find().lean<PollingJobOverrideDocument[]>().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async save(override: PollingJobOverride): Promise<PollingJobOverride> {
    const saved = await this.model
      .findByIdAndUpdate(
        override.jobName,
        {
          $set: {
            active: override.active,
            intervalMs: override.intervalMs,
            nightSuspensionHours: override.nightSuspensionHours,
          },
          $setOnInsert: { _id: override.jobName },
        },
        { new: true, upsert: true },
      )
      .lean<PollingJobOverrideDocument>()
      .exec();
    return this.toDomain(saved as PollingJobOverrideDocument);
  }
}
