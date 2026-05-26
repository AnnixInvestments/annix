import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import type { PasskeyChallengeType } from "./entities/passkey-challenge.entity";
import { PasskeyChallenge } from "./entities/passkey-challenge.entity";
import { PasskeyChallengeRepository } from "./passkey-challenge.repository";

@Injectable()
export class MongoPasskeyChallengeRepository
  extends MongoCrudRepository<PasskeyChallenge>
  implements PasskeyChallengeRepository
{
  constructor(@InjectModel("PasskeyChallenge") model: Model<PasskeyChallenge>) {
    super(model);
  }

  async findLatestForUserAndType(
    userId: number | null,
    type: PasskeyChallengeType,
  ): Promise<PasskeyChallenge | null> {
    const query: Record<string, unknown> = { type };
    if (userId === null) {
      query.userId = null;
    } else {
      query.userId = userId;
    }
    const document = await this.documents.findOne(query).sort({ createdAt: -1 }).lean().exec();
    return this.toDomain(document);
  }

  async findLatestForAuthenticationByUserId(userId: number): Promise<PasskeyChallenge | null> {
    const document = await this.documents
      .findOne({
        type: "authentication",
        $or: [{ userId }, { userId: null }],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }

  async deleteExpiredBefore(cutoff: Date): Promise<number> {
    const result = await this.documents.deleteMany({ expiresAt: { $lt: cutoff } }).exec();
    return result.deletedCount ?? 0;
  }
}
