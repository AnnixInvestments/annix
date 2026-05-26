import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { DispatchScan } from "../entities/dispatch-scan.entity";
import { DispatchScanRepository } from "./dispatch-scan.repository";

@Injectable()
export class MongoDispatchScanRepository
  extends MongoCrudRepository<DispatchScan>
  implements DispatchScanRepository
{
  constructor(@InjectModel("DispatchScan") model: Model<DispatchScan>) {
    super(model);
  }

  async findForJobCardItem(jobCardId: number, stockItemId: number): Promise<DispatchScan[]> {
    const docs = await this.documents.find({ jobCardId, stockItemId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]> {
    const docs = await this.documents.find({ jobCardId, companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findHistoryForJobCard(jobCardId: number, companyId: number): Promise<DispatchScan[]> {
    const docs = await this.documents
      .find({ jobCardId, companyId })
      .populate("stockItem")
      .populate("scannedBy")
      .sort({ scannedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompanyWithJobCard(
    scanId: number,
    companyId: number,
  ): Promise<DispatchScan | null> {
    const doc = await this.documents
      .findOne({ _id: scanId, companyId })
      .populate("jobCard")
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
