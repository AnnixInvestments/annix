import { CrudRepository } from "../lib/persistence/crud-repository";
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

export abstract class AppRepository extends CrudRepository<App> {
  abstract findByCode(code: string): Promise<App | null>;
  abstract findActiveByCode(code: string): Promise<App | null>;
  abstract findAllActive(): Promise<App[]>;
  abstract findAllOrderedByDisplayOrder(): Promise<App[]>;
  abstract findWithDetails(
    code: string,
  ): Promise<(App & { permissions: AppPermission[]; roles: AppRole[] }) | null>;
}

export abstract class AppPermissionRepository extends CrudRepository<AppPermission> {}

export abstract class AppRoleRepository extends CrudRepository<AppRole> {
  abstract maxDisplayOrderForApp(appId: number): Promise<number>;
  abstract findByAppIdAndCode(appId: number, code: string): Promise<AppRole | null>;
  abstract findWithPermissions(
    roleId: number,
  ): Promise<
    (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] }) | null
  >;
  abstract findAllWithPermissionsForApp(
    appId: number,
  ): Promise<
    (AppRole & { rolePermissions: (AppRolePermission & { permission: AppPermission })[] })[]
  >;
}

export abstract class AppRolePermissionRepository extends CrudRepository<AppRolePermission> {
  abstract deleteByRoleId(roleId: number): Promise<void>;
}

export abstract class AppRoleProductRepository extends CrudRepository<AppRoleProduct> {
  abstract deleteByRoleId(roleId: number): Promise<void>;
}

export abstract class UserAccessProductRepository extends CrudRepository<UserAccessProduct> {
  abstract deleteByUserAccessId(userAccessId: number): Promise<void>;
}

export abstract class UserAppAccessRepository extends CrudRepository<UserAppAccess> {
  abstract findOneByUserAndApp(userId: number, appId: number): Promise<UserAppAccess | null>;
  abstract countByAppId(appId: number): Promise<number>;
  abstract findOneByUserAndAppWithRole(
    userId: number,
    appId: number,
  ): Promise<UserAppAccess | null>;
  abstract findByUserAndAppCodeWithRole(
    userId: number,
    appCode: string,
  ): Promise<UserAppAccess | null>;
  abstract findWithRelations(id: number): Promise<UserAppAccess | null>;
  abstract findManyWithRelationsForApp(appId: number): Promise<UserAppAccess[]>;
  abstract findAllWithRelations(): Promise<UserAppAccess[]>;
  abstract findWithPermissionsAndRole(userId: number, appId: number): Promise<UserAppAccess | null>;
  abstract findWithApp(userId: number): Promise<UserAppAccess[]>;
  abstract findManyByAppId(appId: number): Promise<UserAppAccess[]>;
  abstract findAllWithAppAndRole(): Promise<UserAppAccess[]>;
}

export abstract class UserAppPermissionRepository extends CrudRepository<UserAppPermission> {
  abstract deleteByUserAccessId(userAccessId: number): Promise<void>;
}
