import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobAnalysisCache } from "../entities/job-analysis-cache.entity";
import {
  type CachedJobAnalysis,
  JobAnalysisCacheRepository,
} from "./job-analysis-cache.repository";

@Injectable()
export class PostgresJobAnalysisCacheRepository implements JobAnalysisCacheRepository {
  constructor(
    @InjectRepository(JobAnalysisCache)
    private readonly repository: Repository<JobAnalysisCache>,
  ) {}

  async findByKey(key: string): Promise<CachedJobAnalysis | null> {
    const row = await this.repository.findOne({ where: { cacheKey: key } });
    return row ? { category: row.category, skills: row.skills } : null;
  }

  async upsert(entry: { key: string; category: string | null; skills: string[] }): Promise<void> {
    await this.repository.save(
      this.repository.create({
        cacheKey: entry.key,
        category: entry.category,
        skills: entry.skills,
      }),
    );
  }
}
