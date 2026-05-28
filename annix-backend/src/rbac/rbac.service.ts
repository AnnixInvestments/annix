import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EmailService } from "../email/email.service";
import { StockControlRole } from "../stock-control/entities/stock-control-user.entity";
import { StockControlUserRepository } from "../stock-control/repositories/stock-control-user.repository";
import { UserRepository } from "../user/user.repository";
import { UserSyncService } from "../user-sync/user-sync.service";
import {
  AssignUserAccessDto,
  UpdateUserAccessDto,
  UserAccessResponseDto,
} from "./dto/assign-user-access.dto";
import { InviteUserDto, InviteUserResponseDto } from "./dto/invite-user.dto";
import {
  CreateRoleDto,
  RoleProductsResponseDto,
  RoleResponseDto,
  UpdateRoleDto,
} from "./dto/role-management.dto";
import { UserWithAccessSummaryDto } from "./dto/user-with-access-summary.dto";
import { App, AppPermission, AppRole } from "./entities";
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

export const STOCK_CONTROL_ROLE_NAMES: Record<string, string> = {
  storeman: "Storeman",
  "receiving-clerk": "Receiving Clerk",
  accounts: "Accounts",
  quality: "Quality Inspector",
  manager: "Manager",
  admin: "Administrator",
};

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);
  private allActiveAppsCache: App[] | null = null;
  private appByCodeCache = new Map<string, App | null>();

  constructor(
    private readonly appRepo: AppRepository,
    private readonly permissionRepo: AppPermissionRepository,
    private readonly roleRepo: AppRoleRepository,
    private readonly rolePermissionRepo: AppRolePermissionRepository,
    private readonly roleProductRepo: AppRoleProductRepository,
    private readonly accessRepo: UserAppAccessRepository,
    private readonly userPermissionRepo: UserAppPermissionRepository,
    private readonly userProductRepo: UserAccessProductRepository,
    private readonly userRepo: UserRepository,
    private readonly stockControlUserRepo: StockControlUserRepository,
    private readonly userSyncService: UserSyncService,
    private readonly emailService: EmailService,
  ) {}

  private invalidateAppCaches(): void {
    this.allActiveAppsCache = null;
    this.appByCodeCache.clear();
  }

  private async appByCode(code: string): Promise<App | null> {
    if (this.appByCodeCache.has(code)) {
      return this.appByCodeCache.get(code) ?? null;
    }
    const app = await this.appRepo.findByCode(code);
    this.appByCodeCache.set(code, app);
    return app;
  }

  async allApps(): Promise<App[]> {
    if (this.allActiveAppsCache) {
      return this.allActiveAppsCache;
    }
    const apps = await this.appRepo.findAllActive();
    this.allActiveAppsCache = apps;
    return apps;
  }

  async appWithDetails(
    code: string,
  ): Promise<App & { permissions: AppPermission[]; roles: AppRole[] }> {
    const app = await this.appRepo.findWithDetails(code);
    if (!app) {
      throw new NotFoundException(`App '${code}' not found`);
    }
    return app;
  }

  async usersWithAccess(appCode: string): Promise<UserAccessResponseDto[]> {
    const app = await this.appByCode(appCode);
    if (!app) {
      throw new NotFoundException(`App '${appCode}' not found`);
    }

    const accessRecords = await this.accessRepo.findManyWithRelationsForApp(app.id);

    return accessRecords.map((access) => ({
      id: access.id,
      userId: access.userId,
      email: access.user.email,
      firstName: access.user.firstName ?? null,
      lastName: access.user.lastName ?? null,
      appCode,
      roleCode: access.role?.code ?? null,
      roleName: access.role?.name ?? null,
      useCustomPermissions: access.useCustomPermissions,
      permissionCodes: access.useCustomPermissions
        ? access.customPermissions.map((p) => p.permission.code)
        : null,
      permissionCount: access.useCustomPermissions ? access.customPermissions.length : null,
      grantedAt: access.grantedAt,
      expiresAt: access.expiresAt,
      grantedById: access.grantedById,
      productKeys: access.userProducts?.length
        ? access.userProducts.map((p) => p.productKey)
        : null,
    }));
  }

  async allUsersWithAccessSummary(): Promise<UserWithAccessSummaryDto[]> {
    const users = await this.userRepo.findAllOrderedByEmail();
    const allApps = await this.appRepo.findAllActive();
    const allAccessRecords = await this.accessRepo.findAllWithRelations();

    const accessByUserId = allAccessRecords.reduce(
      (acc, record) => {
        if (!acc[record.userId]) {
          acc[record.userId] = [];
        }
        acc[record.userId].push(record);
        return acc;
      },
      {} as Record<number, typeof allAccessRecords>,
    );

    const mainUsers: UserWithAccessSummaryDto[] = users.map((user) => {
      const userAccessRecords = accessByUserId[user.id] ?? [];

      const appAccess = userAccessRecords
        .filter((access) => allApps.some((a) => a.id === access.appId))
        .map((access) => {
          const app = allApps.find((a) => a.id === access.appId)!;
          return {
            appCode: app.code,
            appName: app.name,
            roleCode: access.role?.code ?? null,
            roleName: access.role?.name ?? null,
            useCustomPermissions: access.useCustomPermissions,
            permissionCodes: access.useCustomPermissions
              ? access.customPermissions.map((p) => p.permission.code)
              : null,
            permissionCount: access.useCustomPermissions ? access.customPermissions.length : null,
            expiresAt: access.expiresAt,
            accessId: access.id,
            productKeys: access.userProducts?.length
              ? access.userProducts.map((p) => p.productKey)
              : null,
          };
        });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        status: user.status,
        lastLoginAt: user.lastLoginAt ?? null,
        createdAt: user.createdAt,
        appAccess,
      };
    });

    const stockControlUsers = await this.stockControlUserRepo.findAllOrderedByEmailWithCompany();

    const stockControlApp = allApps.find((a) => a.code === "stock-control");

    const stockControlUserDtos: UserWithAccessSummaryDto[] = stockControlUsers.map((scUser) => {
      const nameParts = scUser.name.split(" ");
      const firstName = nameParts[0] ?? null;
      const lastName = nameParts.slice(1).join(" ") || null;

      return {
        id: -scUser.id,
        email: scUser.email,
        firstName,
        lastName,
        status: scUser.emailVerified ? "active" : "pending",
        lastLoginAt: null,
        createdAt: scUser.createdAt,
        appAccess: stockControlApp
          ? [
              {
                appCode: "stock-control",
                appName: `Stock Control (${scUser.company?.name ?? "Unknown"})`,
                roleCode: scUser.role,
                roleName: STOCK_CONTROL_ROLE_NAMES[scUser.role] ?? scUser.role,
                useCustomPermissions: false,
                permissionCodes: null,
                permissionCount: null,
                expiresAt: null,
                accessId: -scUser.id,
                productKeys: null,
              },
            ]
          : [],
      };
    });

    return [...mainUsers, ...stockControlUserDtos].sort((a, b) => a.email.localeCompare(b.email));
  }

  async searchUsers(
    query: string,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    const users = await this.userRepo.searchByEmailOrName(query, 20);

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
    }));
  }

  async assignAccess(
    userId: number,
    dto: AssignUserAccessDto,
    grantedById: number,
  ): Promise<UserAccessResponseDto> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const app = await this.appByCode(dto.appCode);
    if (!app) {
      throw new NotFoundException(`App '${dto.appCode}' not found`);
    }

    const existingAccess = await this.accessRepo.findOneWhere({ userId, appId: app.id });
    if (existingAccess) {
      throw new ConflictException(
        `User already has access to '${dto.appCode}'. Use update endpoint instead.`,
      );
    }

    let role: AppRole | null = null;
    if (dto.roleCode && !dto.useCustomPermissions) {
      role = await this.roleRepo.findOneWhere({ appId: app.id, code: dto.roleCode });
      if (!role) {
        throw new NotFoundException(`Role '${dto.roleCode}' not found for app '${dto.appCode}'`);
      }
    }

    const savedAccess = await this.accessRepo.create({
      userId,
      appId: app.id,
      roleId: role?.id ?? null,
      useCustomPermissions: dto.useCustomPermissions ?? false,
      grantedById,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    if (dto.useCustomPermissions && dto.permissionCodes?.length) {
      await this.setCustomPermissions(savedAccess.id, app.id, dto.permissionCodes);
    }

    if (dto.productKeys) {
      await this.setUserProducts(savedAccess.id, dto.productKeys);
    }

    return this.accessResponseDto(savedAccess.id);
  }

  async updateAccess(accessId: number, dto: UpdateUserAccessDto): Promise<UserAccessResponseDto> {
    if (accessId < 0) {
      return this.updateStockControlUserAccess(-accessId, dto);
    }

    const access = await this.accessRepo.findWithRelations(accessId);
    if (!access) {
      throw new NotFoundException(`Access record ${accessId} not found`);
    }

    if (dto.roleCode !== undefined) {
      if (dto.roleCode === null) {
        access.roleId = null;
      } else {
        const role = await this.roleRepo.findOneWhere({ appId: access.appId, code: dto.roleCode });
        if (!role) {
          throw new NotFoundException(
            `Role '${dto.roleCode}' not found for app '${access.app?.code ?? access.appId}'`,
          );
        }
        access.roleId = role.id;
      }
    }

    if (dto.useCustomPermissions !== undefined) {
      access.useCustomPermissions = dto.useCustomPermissions;
    }

    if (dto.expiresAt !== undefined) {
      access.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    await this.accessRepo.save(access);

    if (dto.useCustomPermissions && dto.permissionCodes !== undefined) {
      await this.setCustomPermissions(accessId, access.appId, dto.permissionCodes ?? []);
    } else if (dto.useCustomPermissions === false) {
      await this.userPermissionRepo.deleteByUserAccessId(accessId);
    }

    if (dto.productKeys !== undefined) {
      await this.setUserProducts(accessId, dto.productKeys ?? []);
    }

    return this.accessResponseDto(accessId);
  }

  private async updateStockControlUserAccess(
    scUserId: number,
    dto: UpdateUserAccessDto,
  ): Promise<UserAccessResponseDto> {
    const scUser = await this.stockControlUserRepo.findOneByIdWithCompany(scUserId);

    if (!scUser) {
      throw new NotFoundException(`Stock control user ${scUserId} not found`);
    }

    if (dto.roleCode) {
      const roleCodeToEnum: Record<string, StockControlRole> = {
        storeman: StockControlRole.STOREMAN,
        accounts: StockControlRole.ACCOUNTS,
        manager: StockControlRole.MANAGER,
        admin: StockControlRole.ADMIN,
      };
      const newRole = roleCodeToEnum[dto.roleCode];
      if (newRole) {
        scUser.role = newRole;
        await this.stockControlUserRepo.save(scUser);
      }
    }

    const nameParts = scUser.name.split(" ");
    const firstName = nameParts[0] ?? null;
    const lastName = nameParts.slice(1).join(" ") || null;

    return {
      id: -scUserId,
      userId: -scUserId,
      email: scUser.email,
      firstName,
      lastName,
      appCode: "stock-control",
      roleCode: scUser.role,
      roleName: STOCK_CONTROL_ROLE_NAMES[scUser.role] ?? scUser.role,
      useCustomPermissions: false,
      permissionCodes: null,
      permissionCount: null,
      expiresAt: null,
      grantedAt: scUser.createdAt,
      grantedById: null,
      productKeys: null,
    };
  }

  async revokeAccess(accessId: number): Promise<void> {
    const access = await this.accessRepo.findById(accessId);
    if (!access) {
      throw new NotFoundException(`Access record ${accessId} not found`);
    }
    await this.accessRepo.remove(access);
  }

  async inviteUser(dto: InviteUserDto, grantedById: number): Promise<InviteUserResponseDto> {
    const app = await this.appByCode(dto.appCode);
    if (!app) {
      throw new NotFoundException(`App '${dto.appCode}' not found`);
    }

    let user = await this.userRepo.findOneByEmail(dto.email);
    const isNewUser = !user;

    if (!user) {
      user = await this.userRepo.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: "invited",
      });

      this.userSyncService
        .syncUserToPeer({
          email: dto.email,
          firstName: dto.firstName ?? null,
          lastName: dto.lastName ?? null,
          username: dto.email,
          status: "active",
        })
        .catch((error) => this.logger.error(`Peer sync failed for ${dto.email}: ${error.message}`));
    }

    const existingAccess = await this.accessRepo.findOneWhere({ userId: user.id, appId: app.id });
    if (existingAccess) {
      throw new ConflictException(`User '${dto.email}' already has access to '${dto.appCode}'`);
    }

    const accessDto: AssignUserAccessDto = {
      appCode: dto.appCode,
      roleCode: dto.roleCode,
      useCustomPermissions: dto.useCustomPermissions,
      permissionCodes: dto.permissionCodes,
      expiresAt: dto.expiresAt,
    };

    const accessResponse = await this.assignAccess(user.id, accessDto, grantedById);

    return {
      userId: user.id,
      email: user.email,
      accessId: accessResponse.id,
      isNewUser,
      message: isNewUser
        ? `User invited and granted access to ${app.name}`
        : `Existing user granted access to ${app.name}`,
    };
  }

  async userHasPermission(
    userId: number,
    appCode: string,
    permissionCode: string,
  ): Promise<boolean> {
    const app = await this.appByCode(appCode);
    if (!app) {
      return false;
    }

    const access = await this.accessRepo.findWithPermissionsAndRole(userId, app.id);
    if (!access) {
      return false;
    }

    if (access.expiresAt && access.expiresAt < new Date()) {
      return false;
    }

    if (access.useCustomPermissions) {
      return access.customPermissions.some((cp) => cp.permission.code === permissionCode);
    }

    if (access.role) {
      return access.role.rolePermissions.some((rp) => rp.permission.code === permissionCode);
    }

    return false;
  }

  async userPermissions(userId: number, appCode: string): Promise<string[]> {
    const app = await this.appByCode(appCode);
    if (!app) {
      return [];
    }

    const access = await this.accessRepo.findWithPermissionsAndRole(userId, app.id);
    if (!access) {
      return [];
    }

    if (access.expiresAt && access.expiresAt < new Date()) {
      return [];
    }

    if (access.useCustomPermissions) {
      return access.customPermissions.map((cp) => cp.permission.code);
    }

    if (access.role) {
      return access.role.rolePermissions.map((rp) => rp.permission.code);
    }

    return [];
  }

  async userAccessDetails(
    userId: number,
    appCode: string,
  ): Promise<{
    roleCode: string | null;
    roleName: string | null;
    permissions: string[];
    isAdmin: boolean;
  }> {
    const permissions = await this.userPermissions(userId, appCode);

    const app = await this.appByCode(appCode);
    const access = app ? await this.accessRepo.findWithPermissionsAndRole(userId, app.id) : null;
    if (!app || !access) {
      return { roleCode: null, roleName: null, permissions: [], isAdmin: false };
    }

    const roleCode = access.role?.code ?? null;
    const roleName = access.role?.name ?? null;
    const isAdmin = roleCode === "administrator" || permissions.includes("settings:manage");

    return { roleCode, roleName, permissions, isAdmin };
  }

  async appPermissions(appCode: string): Promise<AppPermission[]> {
    const app = await this.appByCode(appCode);
    if (!app) {
      return [];
    }
    const permissions = await this.permissionRepo.findManyWhere({ appId: app.id });
    return permissions.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async setRolePermissions(roleId: number, permissionCodes: string[]): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    await this.rolePermissionRepo.deleteByRoleId(roleId);

    if (permissionCodes.length === 0) {
      return;
    }

    const permissions = await this.permissionRepo.findManyWhere({ appId: role.appId });
    const matchedPermissions = permissions.filter((p) => permissionCodes.includes(p.code));

    const foundCodes = matchedPermissions.map((p) => p.code);
    const missingCodes = permissionCodes.filter((c) => !foundCodes.includes(c));
    if (missingCodes.length > 0) {
      throw new NotFoundException(`Permissions not found: ${missingCodes.join(", ")}`);
    }

    await Promise.all(
      matchedPermissions.map((p) => this.rolePermissionRepo.create({ roleId, permissionId: p.id })),
    );
  }

  async roleWithPermissions(roleId: number): Promise<RoleResponseDto & { permissions: string[] }> {
    const role = await this.roleRepo.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return {
      id: role.id,
      appId: role.appId,
      code: role.code,
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      displayOrder: role.displayOrder,
      targetType: role.targetType,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
    };
  }

  async rolesWithPermissions(
    appCode: string,
  ): Promise<(RoleResponseDto & { permissions: string[]; userCount: number })[]> {
    const app = await this.appByCode(appCode);
    if (!app) {
      throw new NotFoundException(`App '${appCode}' not found`);
    }

    const roles = await this.roleRepo.findAllWithPermissionsForApp(app.id);

    const userCounts = await Promise.all(
      roles.map(async (role) => {
        const count = await this.accessRepo.count({ roleId: role.id });
        return { roleId: role.id, count };
      }),
    );

    const countMap = new Map(userCounts.map((uc) => [uc.roleId, uc.count]));

    return roles.map((role) => ({
      id: role.id,
      appId: role.appId,
      code: role.code,
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      displayOrder: role.displayOrder,
      targetType: role.targetType,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp) => rp.permission.code),
      userCount: countMap.get(role.id) ?? 0,
    }));
  }

  async sendAccessLink(userId: number): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const accessRecords = await this.accessRepo.findWithApp(userId);
    const appNames = accessRecords.filter((a) => a.app.isActive).map((a) => a.app.name);
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    const sent = await this.emailService.sendPlatformAccessEmail(
      user.email,
      userName,
      appNames.length > 0 ? appNames : ["Annix Platform"],
    );

    if (!sent) {
      throw new Error("Failed to send access link email");
    }

    return { message: `Access link sent to ${user.email}` };
  }

  private async setCustomPermissions(
    accessId: number,
    appId: number,
    permissionCodes: string[],
  ): Promise<void> {
    await this.userPermissionRepo.deleteByUserAccessId(accessId);

    if (permissionCodes.length === 0) {
      return;
    }

    const permissions = await this.permissionRepo.findManyWhere({ appId });
    const matchedPermissions = permissions.filter((p) => permissionCodes.includes(p.code));

    const foundCodes = matchedPermissions.map((p) => p.code);
    const missingCodes = permissionCodes.filter((c) => !foundCodes.includes(c));
    if (missingCodes.length > 0) {
      throw new NotFoundException(`Permissions not found: ${missingCodes.join(", ")}`);
    }

    await Promise.all(
      matchedPermissions.map((p) =>
        this.userPermissionRepo.create({ userAccessId: accessId, permissionId: p.id }),
      ),
    );
  }

  private async setUserProducts(accessId: number, productKeys: string[]): Promise<void> {
    await this.userProductRepo.deleteByUserAccessId(accessId);

    if (productKeys.length === 0) {
      return;
    }

    const uniqueKeys = [...new Set(productKeys)];
    await Promise.all(
      uniqueKeys.map((productKey) =>
        this.userProductRepo.create({ userAccessId: accessId, productKey }),
      ),
    );
  }

  private async accessResponseDto(accessId: number): Promise<UserAccessResponseDto> {
    const access = await this.accessRepo.findWithRelations(accessId);
    if (!access) {
      throw new NotFoundException(`Access record ${accessId} not found`);
    }

    return {
      id: access.id,
      userId: access.userId,
      email: access.user.email,
      firstName: access.user.firstName ?? null,
      lastName: access.user.lastName ?? null,
      appCode: access.app?.code ?? String(access.appId),
      roleCode: access.role?.code ?? null,
      roleName: access.role?.name ?? null,
      useCustomPermissions: access.useCustomPermissions,
      permissionCodes: access.useCustomPermissions
        ? access.customPermissions.map((p) => p.permission.code)
        : null,
      permissionCount: access.useCustomPermissions ? access.customPermissions.length : null,
      grantedAt: access.grantedAt,
      expiresAt: access.expiresAt,
      grantedById: access.grantedById,
      productKeys: access.userProducts?.length
        ? access.userProducts.map((p) => p.productKey)
        : null,
    };
  }

  async createRole(appCode: string, dto: CreateRoleDto): Promise<RoleResponseDto> {
    const app = await this.appByCode(appCode);
    if (!app) {
      throw new NotFoundException(`App '${appCode}' not found`);
    }

    const existingRole = await this.roleRepo.findOneWhere({ appId: app.id, code: dto.code });
    if (existingRole) {
      throw new ConflictException(`Role with code '${dto.code}' already exists for this app`);
    }

    const maxDisplayOrder = await this.roleRepo.maxDisplayOrderForApp(app.id);
    const displayOrder = maxDisplayOrder + 1;

    if (dto.isDefault) {
      const existingDefaults = await this.roleRepo.findManyWhere({
        appId: app.id,
        isDefault: true,
      });
      await Promise.all(
        existingDefaults.map((r) => {
          r.isDefault = false;
          return this.roleRepo.save(r);
        }),
      );
    }

    const role = await this.roleRepo.create({
      appId: app.id,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isDefault: dto.isDefault ?? false,
      displayOrder,
      targetType: dto.targetType ?? null,
    });

    return this.roleToResponseDto(role);
  }

  async updateRole(roleId: number, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    if (dto.name !== undefined) {
      role.name = dto.name;
    }
    if (dto.description !== undefined) {
      role.description = dto.description;
    }
    if (dto.displayOrder !== undefined) {
      role.displayOrder = dto.displayOrder;
    }
    if (dto.isDefault !== undefined) {
      if (dto.isDefault) {
        const existingDefaults = await this.roleRepo.findManyWhere({
          appId: role.appId,
          isDefault: true,
        });
        await Promise.all(
          existingDefaults.map((r) => {
            r.isDefault = false;
            return this.roleRepo.save(r);
          }),
        );
      }
      role.isDefault = dto.isDefault;
    }
    if (dto.targetType !== undefined) {
      role.targetType = dto.targetType;
    }

    const updatedRole = await this.roleRepo.save(role);
    return this.roleToResponseDto(updatedRole);
  }

  async deleteRole(roleId: number): Promise<{ message: string; reassignedUsers: number }> {
    const role = await this.roleRepo.findWithPermissions(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const defaultRole = await this.roleRepo.findOneWhere({ appId: role.appId, isDefault: true });
    const usersWithRole = await this.accessRepo.count({ roleId });
    let reassignedUsers = 0;

    if (usersWithRole > 0) {
      if (defaultRole && defaultRole.id !== roleId) {
        const accessRecords = await this.accessRepo.findManyWhere({ roleId });
        await Promise.all(
          accessRecords.map((a) => {
            a.roleId = defaultRole.id;
            return this.accessRepo.save(a);
          }),
        );
        reassignedUsers = usersWithRole;
      } else {
        const accessRecords = await this.accessRepo.findManyWhere({ roleId });
        await Promise.all(
          accessRecords.map((a) => {
            a.roleId = null;
            a.useCustomPermissions = true;
            return this.accessRepo.save(a);
          }),
        );
        reassignedUsers = usersWithRole;
      }
    }

    await this.roleRepo.remove(role);

    return {
      message: `Role '${role.name}' deleted successfully`,
      reassignedUsers,
    };
  }

  async roleProducts(roleId: number): Promise<RoleProductsResponseDto> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const products = await this.roleProductRepo.findManyWhere({ roleId });
    products.sort((a, b) => a.productKey.localeCompare(b.productKey));

    return {
      roleId,
      productKeys: products.map((p) => p.productKey),
    };
  }

  async setRoleProducts(roleId: number, productKeys: string[]): Promise<RoleProductsResponseDto> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    await this.roleProductRepo.deleteByRoleId(roleId);

    if (productKeys.length > 0) {
      const uniqueKeys = [...new Set(productKeys)];
      await Promise.all(
        uniqueKeys.map((productKey) => this.roleProductRepo.create({ roleId, productKey })),
      );
    }

    return {
      roleId,
      productKeys: productKeys.sort(),
    };
  }

  async roleById(roleId: number): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
    return this.roleToResponseDto(role);
  }

  private roleToResponseDto(role: AppRole): RoleResponseDto {
    return {
      id: role.id,
      appId: role.appId,
      code: role.code,
      name: role.name,
      description: role.description,
      isDefault: role.isDefault,
      displayOrder: role.displayOrder,
      targetType: role.targetType,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
