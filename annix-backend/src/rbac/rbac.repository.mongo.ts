import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  App,
  AppPermission,
  AppRole,
  AppRolePermission,
  AppRoleProduct,
  UserAccessProduct,
  UserAppAccess,
  UserAppPermission,
} from "./entities";
import {
  AppPermissionRepository,
  AppRepository,
  AppRolePermissionRepository,
  AppRoleProductRepository,
  AppRoleRepository,
  UserAccessProductRepository,
  UserAppAccessRepository,
  UserAppPermissionRepository,
} from "./rbac.repository";

@Injectable()
export class MongoAppRepository extends MongoCrudRepository<App> implements AppRepository {
  constructor(@InjectModel("App") model: Model<App>) {
    super(model);
  }

  async findByCode(code: string): Promise<App | null> {
    const document = await this.documents.findOne({ code }).lean().exec();
    return this.toDomain(document);
  }

  async findActiveByCode(code: string): Promise<App | null> {
    const document = await this.documents.findOne({ code, isActive: true }).lean().exec();
    return this.toDomain(document);
  }

  async findAllActive(): Promise<App[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findAllOrderedByDisplayOrder(): Promise<App[]> {
    const documents = await this.documents.find().sort({ displayOrder: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findWithDetails(
    code: string,
  ): Promise<(App & { permissions: AppPermission[]; roles: AppRole[] }) | null> {
    const document = await this.documents.findOne({ code, isActive: true }).lean().exec();
    if (!document) {
      return null;
    }
    const app = this.toDomain(document) as App & { permissions: AppPermission[]; roles: AppRole[] };
    app.permissions = [];
    app.roles = [];
    return app;
  }
}

@Injectable()
export class MongoAppPermissionRepository
  extends MongoCrudRepository<AppPermission>
  implements AppPermissionRepository
{
  constructor(@InjectModel("AppPermission") model: Model<AppPermission>) {
    super(model);
  }
}

@Injectable()
export class MongoAppRoleRepository
  extends MongoCrudRepository<AppRole>
  implements AppRoleRepository
{
  constructor(@InjectModel("AppRole") model: Model<AppRole>) {
    super(model);
  }

  async maxDisplayOrderForApp(appId: number): Promise<number> {
    const result = await this.documents
      .aggregate([{ $match: { appId } }, { $group: { _id: null, max: { $max: "$displayOrder" } } }])
      .exec();
    return (result[0] as { max?: number } | undefined)?.max ?? 0;
  }

  async findByAppIdAndCode(appId: number, code: string): Promise<AppRole | null> {
    const document = await this.documents.findOne({ appId, code }).lean().exec();
    return this.toDomain(document);
  }

  async findWithPermissions(
    roleId: number,
  ): Promise<
    (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] }) | null
  > {
    const document = await this.documents.findById(roleId).lean().exec();
    if (!document) {
      return null;
    }
    const role = this.toDomain(document) as AppRole & {
      rolePermissions: (AppRolePermission & { permission: AppPermission })[];
    };
    role.rolePermissions = [];
    return role;
  }

  async findAllWithPermissionsForApp(
    appId: number,
  ): Promise<
    (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] })[]
  > {
    const documents = await this.documents.find({ appId }).sort({ displayOrder: 1 }).lean().exec();
    return this.toDomainList(documents).map((role) => {
      const r = role as AppRole & {
        rolePermissions: (AppRolePermission & { permission: AppPermission })[];
      };
      r.rolePermissions = [];
      return r;
    });
  }
}

@Injectable()
export class MongoAppRolePermissionRepository
  extends MongoCrudRepository<AppRolePermission>
  implements AppRolePermissionRepository
{
  constructor(@InjectModel("AppRolePermission") model: Model<AppRolePermission>) {
    super(model);
  }

  async deleteByRoleId(roleId: number): Promise<void> {
    await this.documents.deleteMany({ roleId }).exec();
  }
}

@Injectable()
export class MongoAppRoleProductRepository
  extends MongoCrudRepository<AppRoleProduct>
  implements AppRoleProductRepository
{
  constructor(@InjectModel("AppRoleProduct") model: Model<AppRoleProduct>) {
    super(model);
  }

  async deleteByRoleId(roleId: number): Promise<void> {
    await this.documents.deleteMany({ roleId }).exec();
  }
}

@Injectable()
export class MongoUserAccessProductRepository
  extends MongoCrudRepository<UserAccessProduct>
  implements UserAccessProductRepository
{
  constructor(@InjectModel("UserAccessProduct") model: Model<UserAccessProduct>) {
    super(model);
  }

  async deleteByUserAccessId(userAccessId: number): Promise<void> {
    await this.documents.deleteMany({ userAccessId }).exec();
  }
}

@Injectable()
export class MongoUserAppAccessRepository
  extends MongoCrudRepository<UserAppAccess>
  implements UserAppAccessRepository
{
  constructor(@InjectModel("UserAppAccess") model: Model<UserAppAccess>) {
    super(model);
  }

  private get appModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("App");
  }

  private get appRoleModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("AppRole");
  }

  async findOneByUserAndApp(userId: number, appId: number): Promise<UserAppAccess | null> {
    const document = await this.documents.findOne({ userId, appId }).lean().exec();
    return this.toDomain(document);
  }

  countByAppId(appId: number): Promise<number> {
    return this.documents.countDocuments({ appId }).exec();
  }

  async findOneByUserAndAppWithRole(userId: number, appId: number): Promise<UserAppAccess | null> {
    const document = await this.documents.findOne({ userId, appId }).lean().exec();
    return this.toDomain(document);
  }

  async findByUserAndAppCodeWithRole(
    userId: number,
    appCode: string,
  ): Promise<UserAppAccess | null> {
    const app = await this.appModel.findOne({ code: appCode }).lean().exec();
    if (!app) {
      return null;
    }
    const document = await this.documents.findOne({ userId, appId: app._id }).lean().exec();
    return this.toDomain(document);
  }

  async findWithRelations(id: number): Promise<UserAppAccess | null> {
    const document = await this.documents.findById(id).lean().exec();
    return this.toDomain(document);
  }

  async findManyWithRelationsForApp(appId: number): Promise<UserAppAccess[]> {
    const documents = await this.documents.find({ appId }).sort({ grantedAt: -1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findAllWithRelations(): Promise<UserAppAccess[]> {
    const documents = await this.documents.find().lean().exec();
    return this.toDomainList(documents);
  }

  async findWithPermissionsAndRole(userId: number, appId: number): Promise<UserAppAccess | null> {
    const document = await this.documents.findOne({ userId, appId }).lean().exec();
    return this.toDomain(document);
  }

  async findWithApp(userId: number): Promise<UserAppAccess[]> {
    const documents = await this.documents.find({ userId }).lean().exec();
    return this.toDomainList(documents);
  }

  async findManyByAppId(appId: number): Promise<UserAppAccess[]> {
    const documents = await this.documents.find({ appId }).lean().exec();
    return this.toDomainList(documents);
  }

  async findAllWithAppAndRole(): Promise<UserAppAccess[]> {
    const documents = await this.documents.find().lean().exec();
    const appIds = Array.from(
      new Set(documents.map((document) => document.appId).filter((value) => value != null)),
    );
    const roleIds = Array.from(
      new Set(documents.map((document) => document.roleId).filter((value) => value != null)),
    );
    const apps = await this.appModel
      .find({ _id: { $in: appIds } })
      .lean()
      .exec();
    const roles = await this.appRoleModel
      .find({ _id: { $in: roleIds } })
      .lean()
      .exec();
    const appById = apps.reduce(
      (map, app) => map.set(app._id as number, { id: app._id, code: app.code }),
      new Map<number, { id: unknown; code: unknown }>(),
    );
    const roleById = roles.reduce(
      (map, role) => map.set(role._id as number, { id: role._id, code: role.code }),
      new Map<number, { id: unknown; code: unknown }>(),
    );
    const enriched = documents.map((document) => ({
      ...document,
      app: document.appId != null ? (appById.get(document.appId as number) ?? null) : null,
      role: document.roleId != null ? (roleById.get(document.roleId as number) ?? null) : null,
    }));
    return this.toDomainList(enriched);
  }
}

@Injectable()
export class MongoUserAppPermissionRepository
  extends MongoCrudRepository<UserAppPermission>
  implements UserAppPermissionRepository
{
  constructor(@InjectModel("UserAppPermission") model: Model<UserAppPermission>) {
    super(model);
  }

  async deleteByUserAccessId(userAccessId: number): Promise<void> {
    await this.documents.deleteMany({ userAccessId }).exec();
  }
}
