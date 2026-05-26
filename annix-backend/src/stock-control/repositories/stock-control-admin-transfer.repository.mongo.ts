import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  AdminTransferStatus,
  StockControlAdminTransfer,
} from "../entities/stock-control-admin-transfer.entity";
import { StockControlAdminTransferRepository } from "./stock-control-admin-transfer.repository";

@Injectable()
export class MongoStockControlAdminTransferRepository
  extends MongoCrudRepository<StockControlAdminTransfer>
  implements StockControlAdminTransferRepository
{
  constructor(
    @InjectModel("StockControlAdminTransfer")
    model: Model<StockControlAdminTransfer>,
  ) {
    super(model);
  }

  async findPendingForCompany(companyId: number): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents
      .findOne({ companyId, status: AdminTransferStatus.PENDING })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingForCompanyWithInitiator(
    companyId: number,
  ): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents
      .findOne({ companyId, status: AdminTransferStatus.PENDING })
      .populate(["initiatedBy", "initiatedBy.company"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId, status: AdminTransferStatus.PENDING })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByStatusToken(
    token: string,
    status: AdminTransferStatus,
  ): Promise<StockControlAdminTransfer | null> {
    const doc = await this.documents.findOne({ token, status }).lean().exec();
    return this.toDomain(doc);
  }
}
