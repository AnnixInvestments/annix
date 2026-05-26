import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomFieldDefinitionRepository } from "./custom-field-definition.repository";
import { CustomFieldDefinition } from "./entities/custom-field-definition.entity";

@Injectable()
export class MongoCustomFieldDefinitionRepository
  extends MongoCrudRepository<CustomFieldDefinition>
  implements CustomFieldDefinitionRepository
{
  constructor(@InjectModel("CustomFieldDefinition") model: Model<CustomFieldDefinition>) {
    super(model);
  }

  async findByUserAndKey(userId: number, fieldKey: string): Promise<CustomFieldDefinition | null> {
    const doc = await this.documents.findOne({ userId, fieldKey }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdAndUser(id: number, userId: number): Promise<CustomFieldDefinition | null> {
    const doc = await this.documents.findOne({ _id: id, userId }).lean().exec();
    return this.toDomain(doc);
  }

  async findForUser(userId: number, includeInactive: boolean): Promise<CustomFieldDefinition[]> {
    const filter = includeInactive ? { userId } : { userId, isActive: true };
    const docs = await this.documents.find(filter).sort({ displayOrder: 1, name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async saveMany(fields: CustomFieldDefinition[]): Promise<CustomFieldDefinition[]> {
    return Promise.all(fields.map((field) => this.save(field)));
  }
}
