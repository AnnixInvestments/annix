import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SeekerTestingIssue } from "../entities/seeker-testing-issue.entity";
import { SeekerTestingIssueRepository } from "./seeker-testing-issue.repository";

@Injectable()
export class MongoSeekerTestingIssueRepository
  extends MongoCrudRepository<SeekerTestingIssue>
  implements SeekerTestingIssueRepository
{
  constructor(
    @InjectModel("SeekerTestingIssue", ORBIT_CONNECTION) model: Model<SeekerTestingIssue>,
  ) {
    super(model);
  }

  async listNewestFirst(): Promise<SeekerTestingIssue[]> {
    const docs = await this.documents.find().sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async listByStatus(status: string): Promise<SeekerTestingIssue[]> {
    const docs = await this.documents.find({ status }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  countOpenCritical(): Promise<number> {
    return this.documents
      .countDocuments({ severity: "critical", status: { $in: ["open", "in_progress"] } })
      .exec();
  }
}
