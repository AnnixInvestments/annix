import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";
import { StockControlInvitationRepository } from "./stock-control-invitation.repository";

@Injectable()
export class MongoStockControlInvitationRepository
  extends MongoCrudRepository<StockControlInvitation>
  implements StockControlInvitationRepository
{
  constructor(@InjectModel("StockControlInvitation") model: Model<StockControlInvitation>) {
    super(model);
  }

  async findOneByTokenAndStatus(
    token: string,
    status: StockControlInvitationStatus,
  ): Promise<StockControlInvitation | null> {
    const doc = await this.documents.findOne({ token, status }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByEmailAndStatus(
    email: string,
    status: StockControlInvitationStatus,
  ): Promise<StockControlInvitation | null> {
    const doc = await this.documents.findOne({ email, status }).lean().exec();
    return this.toDomain(doc);
  }

  async findOnePendingForCompanyByEmail(
    companyId: number,
    email: string,
  ): Promise<StockControlInvitation | null> {
    const doc = await this.documents
      .findOne({ companyId, email, status: StockControlInvitationStatus.PENDING })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findPendingForCompanyWithInviter(companyId: number): Promise<StockControlInvitation[]> {
    const docs = await this.documents
      .find({ companyId, status: StockControlInvitationStatus.PENDING })
      .populate(["invitedBy"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByTokenWithCompany(token: string): Promise<StockControlInvitation | null> {
    const doc = await this.documents.findOne({ token }).populate(["company"]).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlInvitation | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithInviter(
    id: number,
    companyId: number,
  ): Promise<StockControlInvitation | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(["invitedBy"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
