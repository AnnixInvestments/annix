import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomFieldValueRepository } from "./custom-field-value.repository";
import { CustomFieldValue } from "./entities/custom-field-value.entity";

@Injectable()
export class MongoCustomFieldValueRepository
  extends MongoCrudRepository<CustomFieldValue>
  implements CustomFieldValueRepository
{
  constructor(@InjectModel("CustomFieldValue") model: Model<CustomFieldValue>) {
    super(model);
  }

  async findByEntityAndField(
    entityType: "customer" | "supplier",
    entityId: number,
    fieldName: string,
  ): Promise<CustomFieldValue | null> {
    return this.toDomain(
      await this.documents.findOne({ entityType, entityId, fieldName }).lean().exec(),
    );
  }

  async findForEntityOrdered(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<CustomFieldValue[]> {
    return this.toDomainList(
      await this.documents.find({ entityType, entityId }).sort({ fieldName: 1 }).lean().exec(),
    );
  }

  async findByIdOrFail(id: number): Promise<CustomFieldValue> {
    const found = await this.findById(id);
    if (!found) {
      throw new NotFoundException(`CustomFieldValue ${id} not found`);
    }
    return found;
  }

  async deleteById(id: number): Promise<void> {
    await this.documents.findByIdAndDelete(id).exec();
  }
}
