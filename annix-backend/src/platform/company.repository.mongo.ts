import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CompanyRepository } from "./company.repository";
import type { CompanyPage, CompanySearchFilters } from "./company.service";
import { Company, CompanyType } from "./entities/company.entity";

@Injectable()
export class MongoCompanyRepository
  extends MongoCrudRepository<Company>
  implements CompanyRepository
{
  constructor(@InjectModel("Company") model: Model<Company>) {
    super(model);
  }

  build(data: Partial<Company>): Company {
    return data as Company;
  }

  async findByTypeAndNameLike(
    companyType: CompanyType,
    namePattern: string | null,
    limit: number,
    ownerCompanyId?: number,
  ): Promise<Company[]> {
    const query: Record<string, unknown> = { companyType };
    if (namePattern) {
      const fragment = namePattern.replace(/^%/, "").replace(/%$/, "");
      query.name = { $regex: escapeRegExp(fragment), $options: "i" };
    }
    if (ownerCompanyId !== undefined) {
      query.$or = [
        { ownerCompanyId },
        { ownerCompanyId: null },
        { ownerCompanyId: { $exists: false } },
      ];
    }
    const documents = await this.documents.find(query).sort({ name: 1 }).limit(limit).lean().exec();
    return this.toDomainList(documents);
  }

  async findOneByIdAndType(
    id: number,
    companyType: CompanyType,
    ownerCompanyId?: number,
  ): Promise<Company | null> {
    const query: Record<string, unknown> = { _id: id, companyType };
    if (ownerCompanyId !== undefined) {
      query.$or = [
        { ownerCompanyId },
        { ownerCompanyId: null },
        { ownerCompanyId: { $exists: false } },
      ];
    }
    const document = await this.documents.findOne(query).lean().exec();
    return this.toDomain(document);
  }

  async findByIds(ids: number[]): Promise<Company[]> {
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<Company | null> {
    const document = await this.documents.findOne({ registrationNumber }).lean().exec();
    return this.toDomain(document);
  }

  async search(filters: CompanySearchFilters): Promise<CompanyPage> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filters.companyType) {
      query.companyType = filters.companyType;
    }
    if (filters.search) {
      const re = new RegExp(filters.search, "i");
      query.$or = [{ name: re }, { tradingName: re }, { legalName: re }];
    }

    const [documents, total] = await Promise.all([
      this.documents.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);

    return { data: this.toDomainList(documents), total, page, limit };
  }

  async findOnboardingStatusById(id: number): Promise<Company | null> {
    const document = await this.documents
      .findById(id)
      .select({ id: 1, onboardingComplete: 1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async companiesWithModule(moduleCode: string): Promise<Company[]> {
    const documents = await this.documents
      .find({ activeModules: moduleCode })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
