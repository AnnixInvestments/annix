import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StaffMember } from "../entities/staff-member.entity";
import { StaffMemberRepository, type StaffSearchRow } from "./staff-member.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoStaffMemberRepository
  extends MongoTenantScopedRepository<StaffMember>
  implements StaffMemberRepository
{
  constructor(
    @InjectModel("StaffMember") model: Model<StaffMember>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStaffMemberRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStaffMemberRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStaffMemberRepository {
    return new MongoStaffMemberRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: StaffMember): Promise<StaffMember> {
    if (entity.companyId !== companyId) {
      throw new Error("Staff member does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StaffMember): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Staff member does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findAllForCompanyOrdered(
    companyId: number,
    filters?: { search?: string; active?: string },
  ): Promise<StaffMember[]> {
    const base: Record<string, unknown> = { companyId };

    if (filters?.active === "true") {
      base.active = true;
    } else if (filters?.active === "false") {
      base.active = false;
    }

    const searchPattern = filters?.search ? escapeRegex(filters.search.slice(0, 100)) : null;
    const query = searchPattern
      ? {
          ...base,
          $or: [
            { name: { $regex: searchPattern, $options: "i" } },
            { employeeNumber: { $regex: searchPattern, $options: "i" } },
            { department: { $regex: searchPattern, $options: "i" } },
          ],
        }
      : base;

    const docs = await this.documents.find(query).sort({ name: 1 }).limit(2000).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveForCompanyOrdered(companyId: number): Promise<StaffMember[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ name: 1 })
      .limit(2000)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StaffMember | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findActiveByIdForUnifiedCompany(
    id: number,
    unifiedCompanyId: number,
  ): Promise<StaffMember | null> {
    const doc = await this.documents
      .findOne({ _id: id, unifiedCompanyId, active: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<StaffSearchRow[]> {
    const term = escapeRegex(pattern.replace(/%/g, "").slice(0, 100));
    const docs = await this.documents
      .find({
        companyId,
        $or: [
          { name: { $regex: term, $options: "i" } },
          { employeeNumber: { $regex: term, $options: "i" } },
          { department: { $regex: term, $options: "i" } },
        ],
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((doc) => {
      const row = doc as Record<string, unknown>;
      return {
        id: row._id as number,
        name: row.name as string,
        employeeNumber: (row.employeeNumber as string | null) ?? null,
        department: (row.department as string | null) ?? null,
        active: row.active as boolean,
        updatedAt: row.updatedAt as Date,
      };
    });
  }
}
