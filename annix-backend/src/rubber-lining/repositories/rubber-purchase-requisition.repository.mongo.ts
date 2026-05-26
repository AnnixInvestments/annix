import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  RequisitionSourceType,
  RequisitionStatus,
  RubberPurchaseRequisition,
} from "../entities/rubber-purchase-requisition.entity";
import {
  type RequisitionListFilters,
  RubberPurchaseRequisitionRepository,
} from "./rubber-purchase-requisition.repository";

const REQUISITION_RELATIONS = ["supplierCompany", "items"];

@Injectable()
export class MongoRubberPurchaseRequisitionRepository
  extends MongoCrudRepository<RubberPurchaseRequisition>
  implements RubberPurchaseRequisitionRepository
{
  constructor(
    @InjectModel("RubberPurchaseRequisition")
    model: Model<RubberPurchaseRequisition>,
  ) {
    super(model);
  }

  build(data: Partial<RubberPurchaseRequisition>): RubberPurchaseRequisition {
    return data as RubberPurchaseRequisition;
  }

  async findFilteredWithRelations(
    filters?: RequisitionListFilters,
  ): Promise<RubberPurchaseRequisition[]> {
    const filter: Record<string, unknown> = {};
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.sourceType) {
      filter.sourceType = filters.sourceType;
    }
    const docs = await this.documents
      .find(filter)
      .populate(REQUISITION_RELATIONS)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberPurchaseRequisition | null> {
    const doc = await this.documents.findById(id).populate(REQUISITION_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithItems(id: number): Promise<RubberPurchaseRequisition | null> {
    const doc = await this.documents.findById(id).populate("items").lean().exec();
    return this.toDomain(doc);
  }

  async findOnePendingLowStockWithItems(): Promise<RubberPurchaseRequisition | null> {
    const doc = await this.documents
      .findOne({
        sourceType: RequisitionSourceType.LOW_STOCK,
        status: RequisitionStatus.PENDING,
      })
      .populate("items")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingWithRelations(): Promise<RubberPurchaseRequisition[]> {
    const docs = await this.documents
      .find({ status: RequisitionStatus.PENDING })
      .populate(REQUISITION_RELATIONS)
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
