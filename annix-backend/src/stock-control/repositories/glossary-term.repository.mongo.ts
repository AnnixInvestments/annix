import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { GlossaryTerm } from "../entities/glossary-term.entity";
import { GlossaryTermRepository } from "./glossary-term.repository";

@Injectable()
export class MongoGlossaryTermRepository
  extends MongoTenantScopedRepository<GlossaryTerm>
  implements GlossaryTermRepository
{
  constructor(
    @InjectModel("GlossaryTerm") model: Model<GlossaryTerm>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoGlossaryTermRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoGlossaryTermRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoGlossaryTermRepository {
    return new MongoGlossaryTermRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: GlossaryTerm): Promise<GlossaryTerm> {
    if (entity.companyId !== companyId) {
      throw new Error("Glossary term does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: GlossaryTerm): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Glossary term does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForCompanyOrdered(companyId: number): Promise<GlossaryTerm[]> {
    const docs = await this.documents.find({ companyId }).sort({ abbreviation: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyByAbbreviation(
    companyId: number,
    abbreviation: string,
  ): Promise<GlossaryTerm | null> {
    const doc = await this.documents.findOne({ companyId, abbreviation }).lean().exec();
    return this.toDomain(doc);
  }

  async deleteForCompanyByAbbreviation(companyId: number, abbreviation: string): Promise<void> {
    await this.documents.deleteMany({ companyId, abbreviation }).exec();
  }

  async deleteAllForCompany(companyId: number): Promise<void> {
    await this.documents.deleteMany({ companyId }).exec();
  }
}
