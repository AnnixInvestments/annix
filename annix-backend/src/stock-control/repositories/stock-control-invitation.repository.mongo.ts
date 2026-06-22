import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";
import { StockControlInvitationRepository } from "./stock-control-invitation.repository";

@Injectable()
export class MongoStockControlInvitationRepository
  extends MongoTenantScopedRepository<StockControlInvitation>
  implements StockControlInvitationRepository
{
  constructor(
    @InjectModel("StockControlInvitation") model: Model<StockControlInvitation>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlInvitationRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlInvitationRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlInvitationRepository {
    return new MongoStockControlInvitationRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: StockControlInvitation,
  ): Promise<StockControlInvitation> {
    if (entity.companyId !== companyId) {
      throw new Error("Invitation does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlInvitation): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Invitation does not belong to the requesting company");
    }
    await this.remove(entity);
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
