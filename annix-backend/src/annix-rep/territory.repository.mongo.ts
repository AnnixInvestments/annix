import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Territory } from "./entities/territory.entity";
import { TerritoryRepository } from "./territory.repository";

@Injectable()
export class MongoTerritoryRepository
  extends MongoCrudRepository<Territory>
  implements TerritoryRepository
{
  constructor(@InjectModel("Territory") model: Model<Territory>) {
    super(model);
  }

  async findByOrganization(organizationId: number): Promise<Territory[]> {
    const docs = await this.documents
      .find({ organizationId })
      .populate("assignedTo")
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithRelations(id: number): Promise<Territory | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["assignedTo", "organization"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveByOrganization(organizationId: number): Promise<Territory[]> {
    const docs = await this.documents.find({ organizationId, isActive: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveByAssignedUser(userId: number): Promise<Territory[]> {
    const docs = await this.documents
      .find({ assignedToId: userId, isActive: true })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByOrganizationWithAssignedTo(organizationId: number): Promise<Territory[]> {
    const docs = await this.documents.find({ organizationId }).populate("assignedTo").lean().exec();
    return this.toDomainList(docs);
  }
}
