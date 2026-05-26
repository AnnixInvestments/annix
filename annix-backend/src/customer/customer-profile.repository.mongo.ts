import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { CustomerListParams, CustomerProfileRepository } from "./customer-profile.repository";
import { CustomerProfile } from "./entities/customer-profile.entity";

@Injectable()
export class MongoCustomerProfileRepository
  extends MongoCrudRepository<CustomerProfile>
  implements CustomerProfileRepository
{
  constructor(@InjectModel("CustomerProfile") model: Model<CustomerProfile>) {
    super(model);
  }

  async findByUserId(userId: number, relations: string[] = []): Promise<CustomerProfile | null> {
    const document = await this.documents
      .findOne({ userId })
      .populate(relations)
      .session(null)
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findByValidEmailVerificationToken(
    token: string,
    notExpiredBefore: Date,
  ): Promise<CustomerProfile | null> {
    const document = await this.documents
      .findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: notExpiredBefore },
      })
      .populate(["user", "company"])
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async listForAdmin(params: CustomerListParams): Promise<[CustomerProfile[], number]> {
    const filter: Record<string, unknown> = {};

    if (params.status) {
      filter.accountStatus = params.status;
    }

    const sortKey = params.sortField === "createdAt" ? "createdAt" : params.sortField;
    const sortDirection = params.sortOrder === "ASC" ? 1 : -1;

    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .populate(["company", "user", "deviceBindings"])
        .sort({ [sortKey]: sortDirection })
        .skip(params.skip)
        .limit(params.limit)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);

    return [this.toDomainList(docs), total];
  }

  async allUserIds(): Promise<number[]> {
    const docs = await this.documents.find().select("userId").lean().exec();
    return docs.map((doc) => doc.userId as number);
  }

  async findWithExpiringBeeCertificates(todayStr: string): Promise<CustomerProfile[]> {
    const docs = await this.documents.find().populate(["company", "user"]).lean().exec();

    const matching = docs.filter((doc) => {
      const company = doc.company as Record<string, unknown> | null;
      if (!company) {
        return false;
      }
      const expiry = company.beeCertificateExpiry as Date | null | undefined;
      if (!expiry) {
        return false;
      }
      const expiryDay = new Date(expiry).toISOString().slice(0, 10);
      if (expiryDay > todayStr) {
        return false;
      }
      const notificationSent = company.beeExpiryNotificationSentAt as Date | null | undefined;
      if (!notificationSent) {
        return true;
      }
      const notificationDay = new Date(notificationSent).toISOString().slice(0, 10);
      return notificationDay < expiryDay;
    });

    return this.toDomainList(matching);
  }

  async findByIdWithRelations(id: number, relations: string[]): Promise<CustomerProfile | null> {
    const document = await this.documents.findById(id).populate(relations).lean().exec();
    return this.toDomain(document);
  }
}
