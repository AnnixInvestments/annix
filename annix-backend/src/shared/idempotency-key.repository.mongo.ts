import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { IdempotencyKey } from "./entities/idempotency-key.entity";
import { IdempotencyKeyRepository } from "./idempotency-key.repository";

@Injectable()
export class MongoIdempotencyKeyRepository
  extends MongoCrudRepository<IdempotencyKey>
  implements IdempotencyKeyRepository
{
  constructor(@InjectModel("IdempotencyKey") model: Model<IdempotencyKey>) {
    super(model);
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.documents.deleteMany({ expiresAt: { $lt: before } }).exec();
    return result.deletedCount ?? 0;
  }
}
