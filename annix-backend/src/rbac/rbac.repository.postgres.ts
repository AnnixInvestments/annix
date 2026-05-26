import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
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
export class PostgresAppRepository extends TypeOrmCrudRepository<App> implements AppRepository {
  constructor(@InjectRepository(App) repository: Repository<App>) {
    super(repository);
  }

  findByCode(code: string): Promise<App | null> {
    return this.repository.findOne({ where: { code } });
  }

  findActiveByCode(code: string): Promise<App | null> {
    return this.repository.findOne({ where: { code, isActive: true } });
  }

  findAllActive(): Promise<App[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { displayOrder: "ASC" },
    });
  }

  findAllOrderedByDisplayOrder(): Promise<App[]> {
    return this.repository.find({ order: { displayOrder: "ASC" } });
  }

  async findWithDetails(
    code: string,
  ): Promise<(App & { permissions: AppPermission[]; roles: AppRole[] }) | null> {
    const app = await this.repository.findOne({
      where: { code, isActive: true },
      relations: [
        "permissions",
        "roles",
        "roles.rolePermissions",
        "roles.rolePermissions.permission",
      ],
    });
    if (!app) {
      return null;
    }
    app.permissions.sort((a, b) => a.displayOrder - b.displayOrder);
    app.roles.sort((a, b) => a.displayOrder - b.displayOrder);
    return app as App & { permissions: AppPermission[]; roles: AppRole[] };
  }
}

@Injectable()
export class PostgresAppPermissionRepository
  extends TypeOrmCrudRepository<AppPermission>
  implements AppPermissionRepository
{
  constructor(@InjectRepository(AppPermission) repository: Repository<AppPermission>) {
    super(repository);
  }
}

@Injectable()
export class PostgresAppRoleRepository
  extends TypeOrmCrudRepository<AppRole>
  implements AppRoleRepository
{
  constructor(@InjectRepository(AppRole) repository: Repository<AppRole>) {
    super(repository);
  }

  async maxDisplayOrderForApp(appId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder("role")
      .select("MAX(role.displayOrder)", "max")
      .where("role.appId = :appId", { appId })
      .getRawOne();
    return result?.max ?? 0;
  }

  findByAppIdAndCode(appId: number, code: string): Promise<AppRole | null> {
    return this.repository.findOne({ where: { appId, code } });
  }

  findWithPermissions(
    roleId: number,
  ): Promise<
    (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] }) | null
  > {
    return this.repository.findOne({
      where: { id: roleId },
      relations: ["rolePermissions", "rolePermissions.permission"],
    }) as Promise<
      (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] }) | null
    >;
  }

  findAllWithPermissionsForApp(
    appId: number,
  ): Promise<
    (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] })[]
  > {
    return this.repository.find({
      where: { appId },
      relations: ["rolePermissions", "rolePermissions.permission"],
      order: { displayOrder: "ASC" },
    }) as Promise<
      (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] })[]
    >;
  }
}

@Injectable()
export class PostgresAppRolePermissionRepository
  extends TypeOrmCrudRepository<AppRolePermission>
  implements AppRolePermissionRepository
{
  constructor(@InjectRepository(AppRolePermission) repository: Repository<AppRolePermission>) {
    super(repository);
  }

  async deleteByRoleId(roleId: number): Promise<void> {
    await this.repository.delete({ roleId });
  }
}

@Injectable()
export class PostgresAppRoleProductRepository
  extends TypeOrmCrudRepository<AppRoleProduct>
  implements AppRoleProductRepository
{
  constructor(@InjectRepository(AppRoleProduct) repository: Repository<AppRoleProduct>) {
    super(repository);
  }

  async deleteByRoleId(roleId: number): Promise<void> {
    await this.repository.delete({ roleId });
  }
}

@Injectable()
export class PostgresUserAccessProductRepository
  extends TypeOrmCrudRepository<UserAccessProduct>
  implements UserAccessProductRepository
{
  constructor(@InjectRepository(UserAccessProduct) repository: Repository<UserAccessProduct>) {
    super(repository);
  }

  async deleteByUserAccessId(userAccessId: number): Promise<void> {
    await this.repository.delete({ userAccessId });
  }
}

@Injectable()
export class PostgresUserAppAccessRepository
  extends TypeOrmCrudRepository<UserAppAccess>
  implements UserAppAccessRepository
{
  constructor(@InjectRepository(UserAppAccess) repository: Repository<UserAppAccess>) {
    super(repository);
  }

  findOneByUserAndApp(userId: number, appId: number): Promise<UserAppAccess | null> {
    return this.repository.findOne({ where: { userId, appId } });
  }

  countByAppId(appId: number): Promise<number> {
    return this.repository.count({ where: { appId } });
  }

  findOneByUserAndAppWithRole(userId: number, appId: number): Promise<UserAppAccess | null> {
    return this.repository.findOne({
      where: { userId, appId },
      relations: ["role"],
    });
  }

  findByUserAndAppCodeWithRole(userId: number, appCode: string): Promise<UserAppAccess | null> {
    return this.repository.findOne({
      where: { userId, app: { code: appCode } },
      relations: ["role"],
    });
  }

  findWithRelations(id: number): Promise<UserAppAccess | null> {
    return this.repository.findOne({
      where: { id },
      relations: [
        "user",
        "app",
        "role",
        "customPermissions",
        "customPermissions.permission",
        "userProducts",
      ],
    });
  }

  findManyWithRelationsForApp(appId: number): Promise<UserAppAccess[]> {
    return this.repository.find({
      where: { appId },
      relations: [
        "user",
        "role",
        "customPermissions",
        "customPermissions.permission",
        "userProducts",
      ],
      order: { grantedAt: "DESC" },
    });
  }

  findAllWithRelations(): Promise<UserAppAccess[]> {
    return this.repository.find({
      relations: [
        "app",
        "role",
        "customPermissions",
        "customPermissions.permission",
        "userProducts",
      ],
    });
  }

  findWithPermissionsAndRole(userId: number, appId: number): Promise<UserAppAccess | null> {
    return this.repository.findOne({
      where: { userId, appId },
      relations: [
        "role",
        "role.rolePermissions",
        "role.rolePermissions.permission",
        "customPermissions",
        "customPermissions.permission",
      ],
    });
  }

  findWithApp(userId: number): Promise<UserAppAccess[]> {
    return this.repository.find({
      where: { userId },
      relations: ["app"],
    });
  }

  findManyByAppId(appId: number): Promise<UserAppAccess[]> {
    return this.repository.find({ where: { appId } });
  }

  findAllWithAppAndRole(): Promise<UserAppAccess[]> {
    return this.repository.find({ relations: ["app", "role"] });
  }
}

@Injectable()
export class PostgresUserAppPermissionRepository
  extends TypeOrmCrudRepository<UserAppPermission>
  implements UserAppPermissionRepository
{
  constructor(@InjectRepository(UserAppPermission) repository: Repository<UserAppPermission>) {
    super(repository);
  }

  async deleteByUserAccessId(userAccessId: number): Promise<void> {
    await this.repository.delete({ userAccessId });
  }
}
