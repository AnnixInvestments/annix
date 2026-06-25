import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { IssuanceSession } from "../entities/issuance-session.entity";
import {
  IssuanceSessionRepository,
  type IssuanceSessionWhere,
} from "./issuance-session.repository";

const FULL_RELATIONS = ["rows"];

@Injectable()
export class MongoIssuanceSessionRepository
  extends MongoCrudRepository<IssuanceSession>
  implements IssuanceSessionRepository
{
  constructor(
    @InjectModel("SmIssuanceSession") model: Model<IssuanceSession>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<IssuanceSession>): IssuanceSession {
    return data as IssuanceSession;
  }

  withTransaction(context: TransactionContext): MongoIssuanceSessionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoIssuanceSessionRepository requires a MongoTransactionContext");
    }
    return new MongoIssuanceSessionRepository(this.model, context.session);
  }

  async findByIdWithFullRelations(id: number): Promise<IssuanceSession | null> {
    const doc = await this.documents
      .findById(id)
      .populate(FULL_RELATIONS)
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdForCompanyWithFullRelations(
    companyId: number,
    id: number,
  ): Promise<IssuanceSession | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(FULL_RELATIONS)
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPaginatedForCompany(
    where: IssuanceSessionWhere,
    skip: number,
    take: number,
  ): Promise<{ items: IssuanceSession[]; total: number }> {
    const criteria: Record<string, unknown> = { companyId: where.companyId };
    if (where.status) {
      criteria.status = where.status;
    }
    if (where.sessionKind) {
      criteria.sessionKind = where.sessionKind;
    }
    if (where.cpoId !== undefined) {
      criteria.cpoId = where.cpoId;
    }
    if (where.issuerStaffId !== undefined) {
      criteria.issuerStaffId = where.issuerStaffId;
    }
    if (where.recipientStaffId !== undefined) {
      criteria.recipientStaffId = where.recipientStaffId;
    }
    const [docs, total] = await Promise.all([
      this.documents
        .find(criteria)
        .populate(FULL_RELATIONS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take)
        .lean()
        .exec(),
      this.documents.countDocuments(criteria).exec(),
    ]);
    return { items: this.toDomainList(docs), total };
  }
}
