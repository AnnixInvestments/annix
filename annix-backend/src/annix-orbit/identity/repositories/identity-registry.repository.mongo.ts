import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import type { IdentityRegistryEntry } from "../entities/identity-registry-entry.entity";
import { IdentityRegistryRepository } from "./identity-registry.repository";

@Injectable()
export class MongoIdentityRegistryRepository
  extends MongoCrudRepository<IdentityRegistryEntry>
  implements IdentityRegistryRepository
{
  constructor(
    @InjectModel("IdentityRegistry", ORBIT_CONNECTION) model: Model<IdentityRegistryEntry>,
  ) {
    super(model);
  }

  async upsert(userId: number, app: string, module: string, emailLower: string): Promise<void> {
    // `_id` is the userId, so this is keyed on the global id — never id-generated.
    await this.documents
      .findByIdAndUpdate(userId, { $set: { app, module, emailLower } }, { upsert: true })
      .exec();
  }

  findByUserId(userId: number): Promise<IdentityRegistryEntry | null> {
    return this.findById(userId);
  }

  async deleteByUserId(userId: number): Promise<void> {
    await this.documents.findByIdAndDelete(userId).exec();
  }

  async findByEmailLower(emailLower: string): Promise<IdentityRegistryEntry[]> {
    const documents = await this.documents.find({ emailLower }).lean().exec();
    return this.toDomainList(documents);
  }
}
