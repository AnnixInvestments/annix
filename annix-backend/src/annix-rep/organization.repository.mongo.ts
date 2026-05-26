import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Organization } from "./entities/organization.entity";
import { OrganizationRepository } from "./organization.repository";

@Injectable()
export class MongoOrganizationRepository
  extends MongoCrudRepository<Organization>
  implements OrganizationRepository
{
  constructor(@InjectModel("Organization") model: Model<Organization>) {
    super(model);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const doc = await this.documents.findOne({ slug }).lean().exec();
    return this.toDomain(doc);
  }

  async findWithOwner(id: number): Promise<Organization | null> {
    const doc = await this.documents.findById(id).populate("owner").lean().exec();
    return this.toDomain(doc);
  }

  async findBySlugWithOwner(slug: string): Promise<Organization | null> {
    const doc = await this.documents.findOne({ slug }).populate("owner").lean().exec();
    return this.toDomain(doc);
  }
}
