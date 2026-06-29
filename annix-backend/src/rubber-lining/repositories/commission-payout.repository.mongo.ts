import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { CommissionPayout, PayoutStatus } from "../entities/commission-payout.entity";
import { CommissionPayoutRepository } from "./commission-payout.repository";

@Injectable()
export class MongoCommissionPayoutRepository
  extends MongoCrudRepository<CommissionPayout>
  implements CommissionPayoutRepository
{
  constructor(
    @InjectModel("CommissionPayout")
    model: Model<CommissionPayout>,
  ) {
    super(model);
  }

  build(data: Partial<CommissionPayout>): CommissionPayout {
    return data as CommissionPayout;
  }

  async findByCompanyId(companyId: number): Promise<CommissionPayout[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findPendingByCompanyId(companyId: number): Promise<CommissionPayout[]> {
    const docs = await this.documents
      .find({ companyId, status: PayoutStatus.PENDING })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByInvoiceId(invoiceId: number): Promise<CommissionPayout[]> {
    const docs = await this.documents.find({ invoiceId }).lean().exec();
    return this.toDomainList(docs);
  }
}
