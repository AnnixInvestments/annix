import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import {
  type CachedJobAnalysis,
  JobAnalysisCacheRepository,
} from "./job-analysis-cache.repository";

@Injectable()
export class MongoJobAnalysisCacheRepository implements JobAnalysisCacheRepository {
  constructor(
    @InjectModel("JobAnalysisCache", ORBIT_CONNECTION)
    private readonly model: Model<Record<string, unknown>>,
  ) {}

  async findByKey(key: string): Promise<CachedJobAnalysis | null> {
    const doc = await this.model.findById(key).lean().exec();
    if (!doc) {
      return null;
    }
    return {
      category: (doc.category as string | undefined) ?? null,
      skills: (doc.skills as string[] | undefined) ?? [],
    };
  }

  async upsert(entry: { key: string; category: string | null; skills: string[] }): Promise<void> {
    await this.model
      .findByIdAndUpdate(
        entry.key,
        {
          $set: { category: entry.category, skills: entry.skills },
          $setOnInsert: { _id: entry.key },
        },
        { upsert: true },
      )
      .exec();
  }
}
