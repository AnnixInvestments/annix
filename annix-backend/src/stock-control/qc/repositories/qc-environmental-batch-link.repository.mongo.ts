import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcEnvironmentalBatchLink } from "../entities/qc-environmental-batch-link.entity";
import { QcEnvironmentalBatchLinkRepository } from "./qc-environmental-batch-link.repository";

@Injectable()
export class MongoQcEnvironmentalBatchLinkRepository
  extends MongoCrudRepository<QcEnvironmentalBatchLink>
  implements QcEnvironmentalBatchLinkRepository
{
  constructor(@InjectModel("QcEnvironmentalBatchLink") model: Model<QcEnvironmentalBatchLink>) {
    super(model);
  }

  async findByAssignmentAndRecord(
    batchAssignmentId: number,
    environmentalRecordId: number,
  ): Promise<QcEnvironmentalBatchLink | null> {
    const doc = await this.documents
      .findOne({ batchAssignmentId, environmentalRecordId })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
