import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AdminSession } from "../entities/admin-session.entity";
import { AdminSessionRepository } from "./admin-session.repository";

type UserRoleLink = { userId: number; userRoleId: number };
type UserRoleRow = { _id: number; name: string };
type UserRow = Record<string, unknown> & { _id: number };

@Injectable()
export class MongoAdminSessionRepository
  extends MongoCrudRepository<AdminSession>
  implements AdminSessionRepository
{
  constructor(@InjectModel("AdminSession") model: Model<AdminSession>) {
    super(model);
  }

  async findActiveByUserAndToken(
    userId: number,
    sessionToken: string,
  ): Promise<AdminSession | null> {
    const doc = await this.documents
      .findOne({ userId, sessionToken, isRevoked: false })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findActiveByTokenWithUser(sessionToken: string, now: Date): Promise<AdminSession | null> {
    const doc = await this.documents
      .findOne({ sessionToken, isRevoked: false, expiresAt: { $gt: now } })
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    const user = await this.loadUserWithRoles(doc.userId as number);
    return this.toDomain({ ...doc, user });
  }

  countActive(now: Date, recentActivityThreshold: Date): Promise<number> {
    return this.documents
      .countDocuments({
        isRevoked: false,
        expiresAt: { $gt: now },
        lastActiveAt: { $gt: recentActivityThreshold },
      })
      .exec();
  }

  async findLatestByUser(userId: number): Promise<AdminSession | null> {
    const doc = await this.documents.findOne({ userId }).sort({ createdAt: -1 }).lean().exec();
    return this.toDomain(doc);
  }

  async findRecentByUser(userId: number, limit: number): Promise<AdminSession[]> {
    const docs = await this.documents
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async revokeAllForUser(userId: number, revokedAt: Date): Promise<void> {
    await this.documents
      .updateMany({ userId, isRevoked: false }, { $set: { isRevoked: true, revokedAt } })
      .exec();
  }

  private async loadUserWithRoles(userId: number): Promise<Record<string, unknown> | null> {
    const userDoc = await this.model.db.collection<UserRow>("user").findOne({ _id: userId });
    if (!userDoc) {
      return null;
    }
    const links = await this.model.db
      .collection<UserRoleLink>("user_roles_user_role")
      .find({ userId })
      .toArray();
    const roleIds = Array.from(new Set(links.map((link) => link.userRoleId)));
    const roleRows = roleIds.length
      ? await this.model.db
          .collection<UserRoleRow>("user_role")
          .find({ _id: { $in: roleIds } })
          .toArray()
      : [];
    const roles = roleRows.map((row) => ({ id: row._id, name: row.name }));
    const { _id, ...rest } = userDoc;
    return { id: _id, ...rest, roles };
  }
}
