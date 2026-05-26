import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RollRejectionStatus, RubberRollRejection } from "../entities/rubber-roll-rejection.entity";
import { RubberRollRejectionRepository } from "./rubber-roll-rejection.repository";

@Injectable()
export class MongoRubberRollRejectionRepository
  extends MongoCrudRepository<RubberRollRejection>
  implements RubberRollRejectionRepository
{
  constructor(@InjectModel("RubberRollRejection") model: Model<RubberRollRejection>) {
    super(model);
  }

  build(data: Partial<RubberRollRejection>): RubberRollRejection {
    return data as RubberRollRejection;
  }

  async findByIdWithCocs(id: number): Promise<RubberRollRejection | null> {
    const doc = await this.documents
      .findById(id)
      .populate(["originalSupplierCoc", "replacementSupplierCoc"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findBySupplierCocOrdered(supplierCocId: number): Promise<RubberRollRejection[]> {
    const docs = await this.documents
      .find({ originalSupplierCocId: supplierCocId })
      .populate(["originalSupplierCoc", "replacementSupplierCoc"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRollNumbersBySupplierCoc(supplierCocId: number): Promise<RubberRollRejection[]> {
    const docs = await this.documents
      .find({ originalSupplierCocId: supplierCocId })
      .select("rollNumber")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllRejectionRefs(): Promise<RubberRollRejection[]> {
    const docs = await this.documents
      .find()
      .select("originalSupplierCocId rollNumber replacementSupplierCocId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllOrdered(statusFilter?: RollRejectionStatus): Promise<RubberRollRejection[]> {
    const filter = statusFilter ? { status: statusFilter } : {};
    const docs = await this.documents
      .find(filter)
      .populate(["originalSupplierCoc", "replacementSupplierCoc"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRefsByCocIds(cocIds: number[]): Promise<RubberRollRejection[]> {
    if (cocIds.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ originalSupplierCocId: { $in: cocIds } })
      .select("originalSupplierCocId rollNumber")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findReplacementRefsByCocIds(cocIds: number[]): Promise<RubberRollRejection[]> {
    if (cocIds.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ originalSupplierCocId: { $in: cocIds } })
      .select("originalSupplierCocId replacementSupplierCocId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
