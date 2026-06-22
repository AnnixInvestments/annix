import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { UserLocationAssignment } from "../entities/user-location-assignment.entity";
import { UserLocationAssignmentRepository } from "./user-location-assignment.repository";

@Injectable()
export class MongoUserLocationAssignmentRepository
  extends MongoTenantScopedRepository<UserLocationAssignment>
  implements UserLocationAssignmentRepository
{
  constructor(
    @InjectModel("UserLocationAssignment") model: Model<UserLocationAssignment>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoUserLocationAssignmentRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoUserLocationAssignmentRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoUserLocationAssignmentRepository {
    return new MongoUserLocationAssignmentRepository(this.model, session);
  }

  async saveForCompany(
    companyId: number,
    entity: UserLocationAssignment,
  ): Promise<UserLocationAssignment> {
    if (entity.companyId !== companyId) {
      throw new Error("User location assignment does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: UserLocationAssignment): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("User location assignment does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  buildMany(rows: DeepPartial<UserLocationAssignment>[]): UserLocationAssignment[] {
    return rows as UserLocationAssignment[];
  }

  async saveMany(entities: UserLocationAssignment[]): Promise<UserLocationAssignment[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async findForCompanyWithRelations(companyId: number): Promise<UserLocationAssignment[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate(["user", "location"])
      .sort({ userId: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForUser(companyId: number, userId: number): Promise<UserLocationAssignment[]> {
    const docs = await this.documents
      .find({ companyId, userId })
      .select("locationId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteForUser(companyId: number, userId: number): Promise<void> {
    await this.documents.deleteMany({ companyId, userId }).exec();
  }
}
