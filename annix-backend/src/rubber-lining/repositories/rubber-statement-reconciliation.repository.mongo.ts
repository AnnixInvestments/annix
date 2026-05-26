import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberStatementReconciliation } from "../entities/rubber-statement-reconciliation.entity";
import {
  type ReconciliationListFilters,
  RubberStatementReconciliationRepository,
} from "./rubber-statement-reconciliation.repository";

type Doc = Record<string, unknown>;

@Injectable()
export class MongoRubberStatementReconciliationRepository
  extends MongoCrudRepository<RubberStatementReconciliation>
  implements RubberStatementReconciliationRepository
{
  constructor(
    @InjectModel("RubberStatementReconciliation")
    model: Model<RubberStatementReconciliation>,
  ) {
    super(model);
  }

  build(data: Partial<RubberStatementReconciliation>): RubberStatementReconciliation {
    return data as RubberStatementReconciliation;
  }

  async findByIdWithCompany(id: number): Promise<RubberStatementReconciliation | null> {
    const doc = await this.documents.findById(id).populate("company").lean().exec();
    return this.toDomain(doc);
  }

  async findAllWithCompanyOrdered(
    filters?: ReconciliationListFilters,
  ): Promise<RubberStatementReconciliation[]> {
    const filter: Doc = {};
    if (filters?.companyId) {
      filter.companyId = filters.companyId;
    }
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.year) {
      filter.periodYear = filters.year;
    }
    if (filters?.month) {
      filter.periodMonth = filters.month;
    }
    const docs = await this.documents
      .find(filter)
      .populate("company")
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
