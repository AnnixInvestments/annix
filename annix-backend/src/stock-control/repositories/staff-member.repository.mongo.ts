import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StaffMember } from "../entities/staff-member.entity";
import { StaffMemberRepository, type StaffSearchRow } from "./staff-member.repository";

@Injectable()
export class MongoStaffMemberRepository
  extends MongoCrudRepository<StaffMember>
  implements StaffMemberRepository
{
  constructor(@InjectModel("StaffMember") model: Model<StaffMember>) {
    super(model);
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

    const query = filters?.search
      ? {
          ...base,
          $or: [
            { name: { $regex: filters.search, $options: "i" } },
            { employeeNumber: { $regex: filters.search, $options: "i" } },
            { department: { $regex: filters.search, $options: "i" } },
          ],
        }
      : base;

    const docs = await this.documents.find(query).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findActiveForCompanyOrdered(companyId: number): Promise<StaffMember[]> {
    const docs = await this.documents
      .find({ companyId, active: true })
      .sort({ name: 1 })
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
    const term = pattern.replace(/%/g, "");
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
