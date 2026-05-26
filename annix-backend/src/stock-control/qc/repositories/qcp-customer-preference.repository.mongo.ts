import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { QcpCustomerPreference } from "../entities/qcp-customer-preference.entity";
import { QcpCustomerPreferenceRepository } from "./qcp-customer-preference.repository";

@Injectable()
export class MongoQcpCustomerPreferenceRepository
  extends MongoCrudRepository<QcpCustomerPreference>
  implements QcpCustomerPreferenceRepository
{
  constructor(@InjectModel("QcpCustomerPreference") model: Model<QcpCustomerPreference>) {
    super(model);
  }

  async findByCompanyCustomerAndType(
    companyId: number,
    customerName: string,
    planType: string,
  ): Promise<QcpCustomerPreference | null> {
    const doc = await this.documents.findOne({ companyId, customerName, planType }).lean().exec();
    return this.toDomain(doc);
  }

  async findByCompanyAndCustomer(
    companyId: number,
    customerName: string,
  ): Promise<QcpCustomerPreference | null> {
    const doc = await this.documents.findOne({ companyId, customerName }).lean().exec();
    return this.toDomain(doc);
  }

  async findForCompanyCustomer(
    companyId: number,
    customerName: string,
    planType: string | undefined,
  ): Promise<QcpCustomerPreference[]> {
    const filter: Record<string, unknown> = { companyId, customerName };
    if (planType) {
      filter.planType = planType;
    }
    const docs = await this.documents.find(filter).lean().exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, updates: Partial<QcpCustomerPreference>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }
}
