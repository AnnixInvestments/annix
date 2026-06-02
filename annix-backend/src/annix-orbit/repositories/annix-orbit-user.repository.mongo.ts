import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixOrbitUser } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitUserRepository } from "./annix-orbit-user.repository";

@Injectable()
export class MongoAnnixOrbitUserRepository
  extends MongoCrudRepository<AnnixOrbitUser>
  implements AnnixOrbitUserRepository
{
  constructor(@InjectModel("AnnixOrbitUser", ORBIT_CONNECTION) model: Model<AnnixOrbitUser>) {
    super(model);
  }

  async updatePreferences(id: number, updates: Partial<AnnixOrbitUser>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, updates).exec();
  }

  async findAllOrderedById(): Promise<AnnixOrbitUser[]> {
    const docs = await this.documents.find().sort({ _id: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
