import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelGovernmentDocument } from "./entities/government-document.entity";
import { AnnixSentinelGovernmentDocumentRepository } from "./government-document.repository";

@Injectable()
export class MongoAnnixSentinelGovernmentDocumentRepository
  extends MongoCrudRepository<AnnixSentinelGovernmentDocument>
  implements AnnixSentinelGovernmentDocumentRepository
{
  constructor(
    @InjectModel("AnnixSentinelGovernmentDocument")
    model: Model<AnnixSentinelGovernmentDocument>,
  ) {
    super(model);
  }

  async findAllOrderedByCategory(): Promise<AnnixSentinelGovernmentDocument[]> {
    const documents = await this.documents.find().sort({ category: 1, sortOrder: 1 }).lean().exec();
    return this.toDomainList(documents);
  }
}
