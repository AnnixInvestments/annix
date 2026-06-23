import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { RubberBondingAgent } from "../entities/rubber-bonding-agent.entity";
import { RubberBondingAgentRepository } from "./rubber-bonding-agent.repository";

@Injectable()
export class MongoRubberBondingAgentRepository
  extends MongoTenantScopedRepository<RubberBondingAgent>
  implements RubberBondingAgentRepository
{
  constructor(
    @InjectModel("RubberBondingAgent") model: Model<RubberBondingAgent>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoRubberBondingAgentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoRubberBondingAgentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoRubberBondingAgentRepository {
    return new MongoRubberBondingAgentRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: RubberBondingAgent): Promise<RubberBondingAgent> {
    if (entity.companyId !== companyId) {
      throw new Error("Rubber bonding agent does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: RubberBondingAgent): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Rubber bonding agent does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findAllForCompany(companyId: number): Promise<RubberBondingAgent[]> {
    const docs = await this.documents
      .find({ companyId })
      .sort({ supplier: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(companyId: number, id: number): Promise<RubberBondingAgent | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }
}
