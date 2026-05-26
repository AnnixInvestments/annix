import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ClarificationStatus, NixClarification } from "./entities/nix-clarification.entity";
import { NixClarificationRepository } from "./nix-clarification.repository";

@Injectable()
export class MongoNixClarificationRepository
  extends MongoCrudRepository<NixClarification>
  implements NixClarificationRepository
{
  constructor(@InjectModel("NixClarification") model: Model<NixClarification>) {
    super(model);
  }

  async findByIdWithExtraction(id: number): Promise<NixClarification | null> {
    return this.toDomain(await this.documents.findById(id).populate("extraction").lean().exec());
  }

  countPendingForExtraction(extractionId: number | undefined): Promise<number> {
    const filter: Record<string, unknown> = { status: ClarificationStatus.PENDING };
    if (extractionId !== undefined) {
      filter.extractionId = extractionId;
    }
    return this.documents.countDocuments(filter).exec();
  }

  async findPendingForExtractionOrdered(extractionId: number): Promise<NixClarification[]> {
    return this.toDomainList(
      await this.documents
        .find({ extractionId, status: ClarificationStatus.PENDING })
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
    );
  }
}
