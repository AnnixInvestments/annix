import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../lib/persistence/nest-populate";
import { SupplierOnboardingStatus } from "./entities/supplier-onboarding.entity";
import { SupplierAccountStatus, SupplierProfile } from "./entities/supplier-profile.entity";
import {
  SupplierDirectoryFilters,
  SupplierProfilePage,
  SupplierProfileRepository,
} from "./supplier-profile.repository";

@Injectable()
export class MongoSupplierProfileRepository
  extends MongoCrudRepository<SupplierProfile>
  implements SupplierProfileRepository
{
  constructor(@InjectModel("SupplierProfile") model: Model<SupplierProfile>) {
    super(model);
  }

  private get onboardingModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("SupplierOnboarding");
  }

  private get userModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("User");
  }

  async findByIdWithRelations(id: number, relations: string[]): Promise<SupplierProfile | null> {
    const document = await this.documents
      .findById(id)
      .populate(nestPopulate(relations))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByUserId(userId: number, relations: string[] = []): Promise<SupplierProfile | null> {
    const document = await this.documents
      .findOne({ userId })
      .populate(nestPopulate(relations))
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByUserIdAndVerificationToken(
    userId: number,
    emailVerificationToken: string,
  ): Promise<SupplierProfile | null> {
    const document = await this.documents
      .findOne({ userId, emailVerificationToken })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByIdForRefresh(id: number | undefined): Promise<SupplierProfile | null> {
    if (id === undefined) {
      return null;
    }
    const document = await this.documents
      .findById(id)
      .populate(["company", "deviceBindings", "onboarding", "user"])
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllPaginated(
    page: number,
    limit: number,
    accountStatus?: SupplierAccountStatus,
  ): Promise<SupplierProfilePage> {
    const filter: Record<string, unknown> = {};
    if (accountStatus) {
      filter.accountStatus = accountStatus;
    }

    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .populate(["user", "company", "onboarding"])
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);

    return { items: this.toDomainList(docs), total };
  }

  async allUserIds(): Promise<number[]> {
    const docs = await this.documents.find().select("userId").lean().exec();
    return docs.map((doc) => doc.userId as number);
  }

  async searchActiveWithCompany(filters: SupplierDirectoryFilters): Promise<SupplierProfile[]> {
    const docs = await this.documents
      .find({ accountStatus: SupplierAccountStatus.ACTIVE })
      .populate(["company", "capabilities"])
      .lean()
      .exec();

    const matching = docs.filter((doc) => {
      const company = doc.company as Record<string, unknown> | null;
      if (!company) {
        return false;
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const legalName = String(company.legalName ?? "").toLowerCase();
        const tradingName = String(company.tradingName ?? "").toLowerCase();
        if (!legalName.includes(search) && !tradingName.includes(search)) {
          return false;
        }
      }
      if (filters.province) {
        const province = String(company.provinceState ?? "").toLowerCase();
        if (province !== filters.province.toLowerCase()) {
          return false;
        }
      }
      return true;
    });

    return this.toDomainList(matching);
  }

  async findByUserEmail(email: string): Promise<SupplierProfile | null> {
    const user = await this.userModel.findOne({ email }).lean().exec();
    if (!user) {
      return null;
    }
    const document = await this.documents
      .findOne({ userId: user._id })
      .populate("user")
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByIdsWithUserAndCompany(ids: number[]): Promise<SupplierProfile[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .populate(["user", "company"])
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findSubmittedForReview(): Promise<SupplierProfile[]> {
    const submittedOnboardings = await this.onboardingModel
      .find({ status: SupplierOnboardingStatus.SUBMITTED })
      .select("supplierId")
      .lean()
      .exec();
    const supplierIds = submittedOnboardings.map((onboarding) => onboarding.supplierId);

    const docs = await this.documents
      .find({ _id: { $in: supplierIds } })
      .populate(["user", "company", "onboarding"])
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
