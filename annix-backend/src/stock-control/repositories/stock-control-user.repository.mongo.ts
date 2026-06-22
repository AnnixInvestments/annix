import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { StockControlUserRepository } from "./stock-control-user.repository";

function caseInsensitiveExact(value: string): RegExp {
  return new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
}

@Injectable()
export class MongoStockControlUserRepository
  extends MongoTenantScopedRepository<StockControlUser>
  implements StockControlUserRepository
{
  constructor(
    @InjectModel("StockControlUser") model: Model<StockControlUser>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockControlUserRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockControlUserRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockControlUserRepository {
    return new MongoStockControlUserRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: StockControlUser): Promise<StockControlUser> {
    if (entity.companyId !== companyId) {
      throw new Error("User does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockControlUser): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("User does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findOneByEmail(email: string): Promise<StockControlUser | null> {
    const doc = await this.documents.findOne({ email }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByEmailCaseInsensitive(email: string): Promise<StockControlUser | null> {
    const doc = await this.documents
      .findOne({ email: caseInsensitiveExact(email) })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByEmailAndCompany(
    email: string,
    companyId: number,
  ): Promise<StockControlUser | null> {
    const doc = await this.documents.findOne({ email, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByEmailVerificationToken(token: string): Promise<StockControlUser | null> {
    const doc = await this.documents.findOne({ emailVerificationToken: token }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByResetToken(token: string): Promise<StockControlUser | null> {
    const doc = await this.documents.findOne({ resetPasswordToken: token }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockControlUser | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithCompany(
    id: number,
    companyId: number,
  ): Promise<StockControlUser | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(["company"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByIdWithCompany(id: number): Promise<StockControlUser | null> {
    const doc = await this.documents.findById(id).populate(["company"]).lean().exec();
    return this.toDomain(doc);
  }

  async findForCompanyOrderedByCreated(companyId: number): Promise<StockControlUser[]> {
    const docs = await this.documents.find({ companyId }).sort({ createdAt: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllForCompany(companyId: number): Promise<StockControlUser[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  countAdminsForCompany(companyId: number): Promise<number> {
    return this.documents.countDocuments({ companyId, role: StockControlRole.ADMIN }).exec();
  }

  countForCompany(companyId: number): Promise<number> {
    return this.documents.countDocuments({ companyId }).exec();
  }

  async findIdsByIdsForCompany(ids: number[], companyId: number): Promise<StockControlUser[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids.length > 0 ? ids : [0] }, companyId })
      .select("_id")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCompanyByRoles(companyId: number, roles: string[]): Promise<StockControlUser[]> {
    const docs = await this.documents
      .find({ companyId, role: { $in: roles } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForCompanyByRolesOrdered(
    companyId: number,
    roles: string[],
  ): Promise<StockControlUser[]> {
    const docs = await this.documents
      .find({ companyId, role: { $in: roles } })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllOrderedByEmailWithCompany(): Promise<StockControlUser[]> {
    const docs = await this.documents.find().sort({ email: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllOrderedById(): Promise<StockControlUser[]> {
    const docs = await this.documents.find().sort({ _id: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
