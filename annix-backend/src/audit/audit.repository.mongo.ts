import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { User } from "../user/entities/user.entity";
import { AuditLogQueryParams, AuditLogRepository } from "./audit.repository";
import { AuditLog } from "./entities/audit-log.entity";

@Injectable()
export class MongoAuditLogRepository
  extends MongoCrudRepository<AuditLog>
  implements AuditLogRepository
{
  constructor(@InjectModel("AuditLog") model: Model<AuditLog>) {
    super(model);
  }

  private get userModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("User");
  }

  async findUserById(userId: number): Promise<User | null> {
    const doc = await this.userModel.findById(userId).lean().exec();
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id as number, ...rest } as unknown as User;
  }

  async findByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    const docs = await this.documents
      .find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllPaginated(
    params: AuditLogQueryParams,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const filter: Record<string, unknown> = {};

    if (params.entityType) filter.entityType = params.entityType;
    if (params.entityId) filter.entityId = params.entityId;
    if (params.action) filter.action = params.action;
    if (params.performedByUserId) filter.performedById = params.performedByUserId;
    if (params.fromDate && params.toDate) {
      filter.timestamp = { $gte: params.fromDate, $lte: params.toDate };
    }

    const [docs, total] = await Promise.all([
      this.documents
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(params.offset ?? 0)
        .limit(params.limit ?? 50)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);

    return { data: this.toDomainList(docs), total };
  }

  async findEntityHistory(
    entityType: string,
    entityId: number,
    limit: number,
  ): Promise<AuditLog[]> {
    const docs = await this.documents
      .find({ entityType, entityId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findUserActivity(
    userId: number,
    fromDate: Date | null,
    toDate: Date | null,
    limit: number,
  ): Promise<AuditLog[]> {
    const filter: Record<string, unknown> = { performedById: userId };

    if (fromDate && toDate) {
      filter.timestamp = { $gte: fromDate, $lte: toDate };
    }

    const docs = await this.documents
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRecentWithPerformedBy(limit: number): Promise<AuditLog[]> {
    const docs = await this.documents
      .find()
      .populate("performedBy")
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
