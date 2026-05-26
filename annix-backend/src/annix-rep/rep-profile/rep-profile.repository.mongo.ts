import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RepProfile } from "./rep-profile.entity";
import { RepProfileRepository } from "./rep-profile.repository";

@Injectable()
export class MongoRepProfileRepository
  extends MongoCrudRepository<RepProfile>
  implements RepProfileRepository
{
  constructor(@InjectModel("RepProfile") model: Model<RepProfile>) {
    super(model);
  }

  async findByUserId(userId: number): Promise<RepProfile | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }

  private get userModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("User");
  }

  async findAllWithUserOrderedById(): Promise<RepProfile[]> {
    const documents = await this.documents.find().sort({ _id: 1 }).lean().exec();
    const userIds = Array.from(
      new Set(documents.map((document) => document.userId).filter((value) => value != null)),
    );
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select("email")
      .lean()
      .exec();
    const userById = users.reduce(
      (map, user) => map.set(user._id as number, { id: user._id, email: user.email }),
      new Map<number, { id: unknown; email: unknown }>(),
    );
    const enriched = documents.map((document) => ({
      ...document,
      user: document.userId != null ? (userById.get(document.userId as number) ?? null) : null,
    }));
    return this.toDomainList(enriched);
  }
}
