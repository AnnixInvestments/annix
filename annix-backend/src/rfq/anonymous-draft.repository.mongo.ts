import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { AnonymousDraftRepository } from "./anonymous-draft.repository";
import { AnonymousDraft } from "./entities/anonymous-draft.entity";

@Injectable()
export class MongoAnonymousDraftRepository
  extends MongoCrudRepository<AnonymousDraft>
  implements AnonymousDraftRepository
{
  constructor(@InjectModel("AnonymousDraft") model: Model<AnonymousDraft>) {
    super(model);
  }

  async findLatestUnclaimedByEmail(customerEmail: string): Promise<AnonymousDraft | null> {
    const document = await this.documents
      .findOne({ customerEmail, isClaimed: false })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByRecoveryToken(token: string): Promise<AnonymousDraft | null> {
    const document = await this.documents.findOne({ recoveryToken: token }).lean().exec();
    return this.toDomain(document);
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.documents.deleteMany({ expiresAt: { $lt: before } }).exec();
    return result.deletedCount || 0;
  }

  async searchUnclaimedPaginated(params: {
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ items: AnonymousDraft[]; total: number }> {
    const filter: Record<string, unknown> = { isClaimed: false };
    if (params.search) {
      const escaped = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { projectName: { $regex: escaped, $options: "i" } },
        { customerEmail: { $regex: escaped, $options: "i" } },
      ];
    }
    if (params.dateFrom && params.dateTo) {
      filter.createdAt = { $gte: params.dateFrom, $lte: params.dateTo };
    }
    const [documents, total] = await Promise.all([
      this.documents.find(filter).lean().exec(),
      this.documents.countDocuments(filter).exec(),
    ]);
    return { items: this.toDomainList(documents), total };
  }
}
