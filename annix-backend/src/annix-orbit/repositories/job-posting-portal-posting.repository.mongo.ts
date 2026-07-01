import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  JobPostingPortalPosting,
  JobPostingPortalStatus,
} from "../entities/job-posting-portal-posting.entity";
import { JobPostingPortalPostingRepository } from "./job-posting-portal-posting.repository";

@Injectable()
export class MongoJobPostingPortalPostingRepository
  extends MongoCrudRepository<JobPostingPortalPosting>
  implements JobPostingPortalPostingRepository
{
  constructor(
    @InjectModel("JobPostingPortalPosting", ORBIT_CONNECTION)
    model: Model<JobPostingPortalPosting>,
  ) {
    super(model);
  }

  async findByJobAndPortal(
    jobPostingId: number,
    portalCode: string,
  ): Promise<JobPostingPortalPosting | null> {
    const doc = await this.documents.findOne({ jobPostingId, portalCode }).lean().exec();
    return this.toDomain(doc);
  }

  async findByJob(jobPostingId: number): Promise<JobPostingPortalPosting[]> {
    const docs = await this.documents.find({ jobPostingId }).lean().exec();
    return this.toDomainList(docs);
  }

  async sumCostSince(companyId: number, portalCode: string, since: Date): Promise<number> {
    const result = await this.documents
      .aggregate<{ total: number }>([
        {
          $match: {
            companyId,
            portalCode,
            cost: { $ne: null, $gt: 0 },
            createdAt: { $gte: since },
          },
        },
        { $group: { _id: null, total: { $sum: "$cost" } } },
      ])
      .exec();
    return result[0]?.total ?? 0;
  }

  async findRetryDue(now: Date, limit: number): Promise<JobPostingPortalPosting[]> {
    const docs = await this.documents
      .find({
        status: JobPostingPortalStatus.FAILED,
        nextRetryAt: { $lte: now },
      })
      .sort({ nextRetryAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
