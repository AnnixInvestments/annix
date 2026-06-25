import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { User } from "./entities/user.entity";
import { UserRepository } from "./user.repository";

type UserRoleLink = { userId: number; userRoleId: number };
type UserRoleRow = { _id: number; name: string };

const NON_ORBIT_SCOPE_FILTER = { appScope: { $not: /^orbit:/ } };
const ORBIT_SCOPE_FILTER = { appScope: { $regex: /^orbit:/ } };

@Injectable()
export class MongoUserRepository extends MongoCrudRepository<User> implements UserRepository {
  constructor(@InjectModel("User") model: Model<User>) {
    super(model);
  }

  instantiate(data: DeepPartial<User>): User {
    return { ...data } as User;
  }

  private joinCollection() {
    return this.model.db.collection<UserRoleLink>("user_roles_user_role");
  }

  private rolesCollection() {
    return this.model.db.collection<UserRoleRow>("user_role");
  }

  private async withRolesAttached(doc: Record<string, unknown> | null): Promise<User | null> {
    if (!doc) {
      return null;
    }
    const [withRoles] = await this.attachRoles([doc]);
    return this.toDomain(withRoles);
  }

  private async withRolesAttachedList(docs: Record<string, unknown>[]): Promise<User[]> {
    const enriched = await this.attachRoles(docs);
    return this.toDomainList(enriched);
  }

  private async attachRoles(docs: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    if (docs.length === 0) {
      return docs;
    }
    const userIds = docs.map((doc) => doc._id as number);
    const links = await this.joinCollection()
      .find({ userId: { $in: userIds } })
      .toArray();
    if (links.length === 0) {
      return docs.map((doc) => ({ ...doc, roles: [] }));
    }
    const roleIds = Array.from(new Set(links.map((link) => link.userRoleId)));
    const roleRows = await this.rolesCollection()
      .find({ _id: { $in: roleIds } })
      .toArray();
    const roleById = roleRows.reduce(
      (map, row) => map.set(row._id, { id: row._id, name: row.name }),
      new Map<number, { id: number; name: string }>(),
    );
    const rolesByUser = links.reduce((map, link) => {
      const role = roleById.get(link.userRoleId);
      if (!role) {
        return map;
      }
      const existing = map.get(link.userId) ?? [];
      return map.set(link.userId, [...existing, role]);
    }, new Map<number, Array<{ id: number; name: string }>>());
    return docs.map((doc) => ({
      ...doc,
      roles: rolesByUser.get(doc._id as number) ?? [],
    }));
  }

  async findAllWithRoles(): Promise<User[]> {
    const docs = await this.documents.find().lean().exec();
    return this.withRolesAttachedList(docs);
  }

  async findByIdWithRoles(id: number): Promise<User | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.withRolesAttached(doc);
  }

  async findOrbitUserById(id: number): Promise<User | null> {
    const doc = await this.documents
      .findOne({ _id: id, ...ORBIT_SCOPE_FILTER })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOrbitUserByEmail(email: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({
        email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" },
        ...ORBIT_SCOPE_FILTER,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByEmailWithRoles(email: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({ email, ...NON_ORBIT_SCOPE_FILTER })
      .lean()
      .exec();
    return this.withRolesAttached(doc);
  }

  async findByEmailWithRolesAndScope(email: string, appScope: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({ email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" }, appScope })
      .lean()
      .exec();
    return this.withRolesAttached(doc);
  }

  async findByIds(ids: number[]): Promise<User[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdsWithRoles(ids: number[]): Promise<User[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.withRolesAttachedList(docs);
  }

  async deleteById(id: number): Promise<number> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount ?? 0;
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const doc = await this.documents.findOne({ emailVerificationToken: token }).lean().exec();
    return this.toDomain(doc);
  }

  async findByResetPasswordToken(token: string): Promise<User | null> {
    const doc = await this.documents.findOne({ resetPasswordToken: token }).lean().exec();
    return this.toDomain(doc);
  }

  countUnverifiedCreatedBefore(cutoff: Date): Promise<number> {
    return this.documents
      .countDocuments({ createdAt: { $lt: cutoff }, emailVerified: false })
      .exec();
  }

  async deleteUnverifiedCreatedBefore(cutoff: Date): Promise<number> {
    const result = await this.documents
      .deleteMany({ createdAt: { $lt: cutoff }, emailVerified: false })
      .exec();
    return result.deletedCount ?? 0;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({ email, ...NON_ORBIT_SCOPE_FILTER })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByEmailAndScope(email: string, appScope: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({ email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" }, appScope })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByValidEmailVerificationToken(
    token: string,
    notExpiredAfter: Date,
  ): Promise<User | null> {
    const doc = await this.documents
      .findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: notExpiredAfter },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByValidResetPasswordToken(token: string, notExpiredAfter: Date): Promise<User | null> {
    const doc = await this.documents
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: notExpiredAfter },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByEmailCaseInsensitive(email: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({
        email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" },
        ...NON_ORBIT_SCOPE_FILTER,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByEmailAnyScope(email: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({ email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" } })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneByEmailCaseInsensitiveWithRoles(email: string): Promise<User | null> {
    const doc = await this.documents
      .findOne({
        email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" },
        ...NON_ORBIT_SCOPE_FILTER,
      })
      .lean()
      .exec();
    return this.withRolesAttached(doc);
  }

  async updateByEmailCaseInsensitiveAndScope(
    email: string,
    appScope: string,
    changes: DeepPartial<User>,
  ): Promise<void> {
    await this.documents
      .updateOne(
        { email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" }, appScope },
        { $set: changes },
      )
      .exec();
  }

  async updateCompanyId(userId: number, companyId: number | null): Promise<void> {
    await this.documents.updateOne({ _id: userId }, { $set: { companyId } }).exec();
  }

  async findAllOrderedByEmail(): Promise<User[]> {
    const documents = await this.documents.find().sort({ email: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async searchByEmailOrName(query: string, limit: number): Promise<User[]> {
    const pattern = escapeRegExp(query);
    const documents = await this.documents
      .find({
        $or: [
          { email: { $regex: pattern, $options: "i" } },
          { firstName: { $regex: pattern, $options: "i" } },
          { lastName: { $regex: pattern, $options: "i" } },
        ],
      })
      .sort({ email: 1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findIdsByRoleName(roleName: string): Promise<number[]> {
    const role = await this.rolesCollection().findOne({ name: roleName });
    if (!role) {
      return [];
    }
    const links = await this.joinCollection().find({ userRoleId: role._id }).toArray();
    return links.map((link) => link.userId);
  }

  countByCompanyId(companyId: number): Promise<number> {
    return this.documents.countDocuments({ companyId }).exec();
  }

  async findWhatsAppCandidates(userIds: number[] | null): Promise<User[]> {
    const phonePresent = { whatsappPhone: { $nin: [null, ""] } };
    const filter = userIds === null ? phonePresent : { ...phonePresent, _id: { $in: userIds } };
    const documents = await this.documents.find(filter).sort({ email: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findByEmailsAnyScope(emails: string[]): Promise<User[]> {
    if (emails.length === 0) {
      return [];
    }
    const patterns = emails.map((email) => new RegExp(`^${escapeRegExp(email)}$`, "i"));
    const documents = await this.documents
      .find({ email: { $in: patterns } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findAllIdAndEmail(): Promise<Pick<User, "id" | "email">[]> {
    const documents = await this.documents.find().select("email").lean().exec();
    return documents.map((document) => ({
      id: document._id as number,
      email: document.email as string,
    }));
  }

  async findEmailsByIds(ids: number[]): Promise<Array<{ id: number; email: string }>> {
    if (ids.length === 0) {
      return [];
    }
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .select("email")
      .lean()
      .exec();
    return documents
      .filter((document) => typeof document.email === "string" && document.email !== "")
      .map((document) => ({ id: document._id as number, email: document.email as string }));
  }

  async setWhatsAppPhoneWhereMissingByEmail(email: string, phone: string): Promise<number> {
    const result = await this.documents
      .updateMany(
        {
          email: { $regex: `^${escapeRegExp(email)}$`, $options: "i" },
          $or: [
            { whatsappPhone: null },
            { whatsappPhone: "" },
            { whatsappPhone: { $exists: false } },
          ],
        },
        { $set: { whatsappPhone: phone } },
      )
      .exec();
    return result.modifiedCount ?? 0;
  }

  async findOneByWhatsAppPhone(waId: string): Promise<User | null> {
    const doc = await this.documents.findOne({ whatsappPhone: waId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByVerifiedWhatsAppPhone(waId: string): Promise<User | null> {
    const doc = await this.documents.findOne({ whatsappVerifiedPhone: waId }).lean().exec();
    return this.toDomain(doc);
  }

  countWithWhatsAppPhone(): Promise<number> {
    return this.documents.countDocuments({ whatsappPhone: { $nin: [null, ""] } }).exec();
  }

  async findAdminOrEmployeesPaginated(params: {
    search?: string;
    role?: string;
    skip: number;
    take: number;
  }): Promise<{ users: User[]; total: number }> {
    const roleNames = params.role ? [params.role] : ["admin", "employee"];
    const matchingRoles = await this.rolesCollection()
      .find({ name: { $in: roleNames } })
      .toArray();
    const roleIds = matchingRoles.map((row) => row._id);
    if (roleIds.length === 0) {
      return { users: [], total: 0 };
    }
    const links = await this.joinCollection()
      .find({ userRoleId: { $in: roleIds } })
      .toArray();
    const candidateUserIds = Array.from(new Set(links.map((link) => link.userId)));
    if (candidateUserIds.length === 0) {
      return { users: [], total: 0 };
    }

    const baseFilter: Record<string, unknown> = { _id: { $in: candidateUserIds } };
    const filter: Record<string, unknown> = params.search
      ? {
          ...baseFilter,
          $or: [
            { email: { $regex: escapeRegExp(params.search), $options: "i" } },
            { username: { $regex: escapeRegExp(params.search), $options: "i" } },
          ],
        }
      : baseFilter;

    const [documents, total] = await Promise.all([
      this.documents
        .find(filter)
        .sort({ _id: -1 })
        .skip(params.skip)
        .limit(params.take)
        .lean()
        .exec(),
      this.documents.countDocuments(filter).exec(),
    ]);
    const users = await this.withRolesAttachedList(documents);
    return { users, total };
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
