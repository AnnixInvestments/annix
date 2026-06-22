import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StaffSignature } from "../entities/staff-signature.entity";
import { StaffSignatureRepository } from "./staff-signature.repository";

@Injectable()
export class MongoStaffSignatureRepository
  extends MongoTenantScopedRepository<StaffSignature>
  implements StaffSignatureRepository
{
  constructor(
    @InjectModel("StaffSignature") model: Model<StaffSignature>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStaffSignatureRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStaffSignatureRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStaffSignatureRepository {
    return new MongoStaffSignatureRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: StaffSignature): Promise<StaffSignature> {
    if (entity.companyId !== companyId) {
      throw new Error("Staff signature does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StaffSignature): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Staff signature does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findByUser(userId: number): Promise<StaffSignature | null> {
    const doc = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(doc);
  }
}
