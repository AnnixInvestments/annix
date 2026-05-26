import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  type CompoundMovementReferenceType,
  RubberCompoundMovement,
} from "../entities/rubber-compound-movement.entity";
import {
  type CompoundMovementFilters,
  RubberCompoundMovementRepository,
} from "./rubber-compound-movement.repository";

@Injectable()
export class MongoRubberCompoundMovementRepository
  extends MongoCrudRepository<RubberCompoundMovement>
  implements RubberCompoundMovementRepository
{
  constructor(
    @InjectModel("RubberCompoundMovement")
    model: Model<RubberCompoundMovement>,
  ) {
    super(model);
  }

  build(data: Partial<RubberCompoundMovement>): RubberCompoundMovement {
    return data as RubberCompoundMovement;
  }

  async findAllWithRelationsFiltered(
    filters?: CompoundMovementFilters,
  ): Promise<RubberCompoundMovement[]> {
    const filter: Record<string, unknown> = {};
    if (filters?.compoundStockId) {
      filter.compoundStockId = filters.compoundStockId;
    }
    if (filters?.movementType) {
      filter.movementType = filters.movementType;
    }
    if (filters?.referenceType) {
      filter.referenceType = filters.referenceType;
    }
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberCompoundMovement | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  countByReference(
    referenceType: CompoundMovementReferenceType,
    referenceId: number,
  ): Promise<number> {
    return this.documents.countDocuments({ referenceType, referenceId }).exec();
  }

  async findByReferenceWithStock(
    referenceType: CompoundMovementReferenceType,
    referenceId: number,
  ): Promise<RubberCompoundMovement[]> {
    const docs = await this.documents.find({ referenceType, referenceId }).lean().exec();
    return this.toDomainList(docs);
  }
}
