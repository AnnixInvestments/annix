import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../user/entities/user.entity";
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
import {
  App,
  AppPermission,
  AppRole,
  AppRolePermission,
  AppRoleProduct,
  UserAppAccess,
  UserAppPermission,
} from "./entities";

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(AppPermission)
    private readonly permissionRepo: Repository<AppPermission>,
    @InjectRepository(AppRole)
    private readonly roleRepo: Repository<AppRole>,
    @InjectRepository(AppRolePermission)
    private readonly rolePermissionRepo: Repository<AppRolePermission>,
    @InjectRepository(AppRoleProduct)
    private readonly roleProductRepo: Repository<AppRoleProduct>,
    @InjectRepository(UserAppAccess)
    private readonly accessRepo: Repository<UserAppAccess>,
    @InjectRepository(UserAppPermission)
    private readonly userPermissionRepo: Repository<UserAppPermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async allApps(): Promise<App[]> {
    return this.appRepo.find({
      where: { isActive: true },
      order: { displayOrder: "ASC" },
    });
  }

  async appWithDetails(
    code: string,
  ): Promise<App & { permissions: AppPermission[]; roles: AppRole[] }> {
    const app = await this.appRepo.findOne({
      where: { code, isActive: true },
      relations: [
        "permissions",
        "roles",
        "roles.rolePermissions",
        "roles.rolePermissions.permission",
      ],
    });

    if (!app) {
      throw new NotFoundException(`App '${code}' not found`);
    }

    app.permissions.sort((a, b) => a.displayOrder - b.displayOrder);
    app.roles.sort((a, b) => a.displayOrder - b.displayOrder);

    return app as App & { permissions: AppPermission[]; roles: AppRole[] };
  }

  async usersWithAccess(appCode: string): Promise<UserAccessResponseDto[]> {
    const app = await this.appRepo.findOne({ where: { code: appCode } });
    if (!app) {
      throw new NotFoundException(`App '${appCode}' not found`);
    }

    const accessRecords = await this.accessRepo.find({
      where: { appId: app.id },
      relations: ["user", "role", "customPermissions", "customPermissions.permission"],
      order: { grantedAt: "DESC" },
    });

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
    }));
  }

  async allUsersWithAccessSummary(): Promise<UserWithAccessSummaryDto[]> {
    const users = await this.userRepo.find({
      order: { email: "ASC" },
    });

    const allApps = await this.appRepo.find({
      where: { isActive: true },
      order: { displayOrder: "ASC" },
    });

    const allAccessRecords = await this.accessRepo.find({
      relations: ["app", "role", "customPermissions"],
    });

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

    return users.map((user) => {
      const userAccessRecords = accessByUserId[user.id] ?? [];

      const appAccess = userAccessRecords
        .filter((access) => {
          const app = allApps.find((a) => a.id === access.appId);
          return app !== undefined;
        })
        .map((access) => {
          const app = allApps.find((a) => a.id === access.appId)!;
          return {
            appCode: app.code,
            appName: app.name,
            roleCode: access.role?.code ?? null,
            roleName: access.role?.name ?? null,
            useCustomPermissions: access.useCustomPermissions,
            permissionCount: access.useCustomPermissions ? access.customPermissions.length : null,
            expiresAt: access.expiresAt,
            accessId: access.id,
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
  }

  async searchUsers(
    query: string,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    const normalizedQuery = `%${query.toLowerCase()}%`;

    const users = await this.userRepo
      .createQueryBuilder("user")
      .where("LOWER(user.email) LIKE :query", { query: normalizedQuery })
      .orWhere("LOWER(user.firstName) LIKE :query", { query: normalizedQuery })
      .orWhere("LOWER(user.lastName) LIKE :query", { query: normalizedQuery })
      .orderBy("user.email", "ASC")
      .limit(20)
      .getMany();

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
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const app = await this.appRepo.findOne({ where: { code: dto.appCode } });
    if (!app) {
      throw new NotFoundException(`App '${dto.appCode}' not found`);
    }

    const existingAccess = await this.accessRepo.findOne({
      where: { userId, appId: app.id },
    });
    if (existingAccess) {
      throw new ConflictException(
        `User already has access to '${dto.appCode}'. Use update endpoint instead.`,
      );
    }

    let role: AppRole | null = null;
    if (dto.roleCode && !dto.useCustomPermissions) {
      role = await this.roleRepo.findOne({
        where: { appId: app.id, code: dto.roleCode },
      });
      if (!role) {
        throw new NotFoundException(`Role '${dto.roleCode}' not found for app '${dto.appCode}'`);
      }
    }

    const access = this.accessRepo.create({
      userId,
      appId: app.id,
      roleId: role?.id ?? null,
      useCustomPermissions: dto.useCustomPermissions ?? false,
      grantedById,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const savedAccess = await this.accessRepo.save(access);

    if (dto.useCustomPermissions && dto.permissionCodes?.length) {
      await this.setCustomPermissions(savedAccess.id, app.id, dto.permissionCodes);
    }

    return this.accessResponseDto(savedAccess.id);
  }

  async updateAccess(accessId: number, dto: UpdateUserAccessDto): Promise<UserAccessResponseDto> {
    const access = await this.accessRepo.findOne({
      where: { id: accessId },
      relations: ["app", "user"],
    });

    if (!access) {
      throw new NotFoundException(`Access record ${accessId} not found`);
    }

    if (dto.roleCode !== undefined) {
      if (dto.roleCode === null) {
        access.roleId = null;
      } else {
        const role = await this.roleRepo.findOne({
          where: { appId: access.appId, code: dto.roleCode },
        });
        if (!role) {
          throw new NotFoundException(
            `Role '${dto.roleCode}' not found for app '${access.app.code}'`,
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
      await this.userPermissionRepo.delete({ userAccessId: accessId });
    }

    return this.accessResponseDto(accessId);
  }

  async revokeAccess(accessId: number): Promise<void> {
    const access = await this.accessRepo.findOne({ where: { id: accessId } });
    if (!access) {
      throw new NotFoundException(`Access record ${accessId} not found`);
    }

    await this.accessRepo.remove(access);
  }

  async inviteUser(dto: InviteUserDto, grantedById: number): Promise<InviteUserResponseDto> {
    const app = await this.appRepo.findOne({ where: { code: dto.appCode } });
    if (!app) {
      throw new NotFoundException(`App '${dto.appCode}' not found`);
    }

    let user = await this.userRepo.findOne({ where: { email: dto.email } });
    const isNewUser = !user;

    if (!user) {
      user = this.userRepo.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: "invited",
      });
      user = await this.userRepo.save(user);
    }

    const existingAccess = await this.accessRepo.findOne({
      where: { userId: user.id, appId: app.id },
    });
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
    const app = await this.appRepo.findOne({ where: { code: appCode } });
    if (!app) {
      return false;
    }

    const access = await this.accessRepo.findOne({
      where: { userId, appId: app.id },
      relations: [
        "role",
        "role.rolePermissions",
        "role.rolePermissions.permission",
        "customPermissions",
        "customPermissions.permission",
      ],
    });

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
    const app = await this.appRepo.findOne({ where: { code: appCode } });
    if (!app) {
      return [];
    }

    const access = await this.accessRepo.findOne({
      where: { userId, appId: app.id },
      relations: [
        "role",
        "role.rolePermissions",
        "role.rolePermissions.permission",
        "customPermissions",
        "customPermissions.permission",
      ],
    });

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

  private async setCustomPermissions(
    accessId: number,
    appId: number,
    permissionCodes: string[],
  ): Promise<void> {
    await this.userPermissionRepo.delete({ userAccessId: accessId });

    if (permissionCodes.length === 0) {
      return;
    }

    const permissions = await this.permissionRepo.find({
      where: { appId, code: In(permissionCodes) },
    });

    const foundCodes = permissions.map((p) => p.code);
    const missingCodes = permissionCodes.filter((c) => !foundCodes.includes(c));
    if (missingCodes.length > 0) {
      throw new NotFoundException(`Permissions not found: ${missingCodes.join(", ")}`);
    }

    const userPermissions = permissions.map((p) =>
      this.userPermissionRepo.create({
        userAccessId: accessId,
        permissionId: p.id,
      }),
    );

    await this.userPermissionRepo.save(userPermissions);
  }

  private async accessResponseDto(accessId: number): Promise<UserAccessResponseDto> {
    const access = await this.accessRepo.findOne({
      where: { id: accessId },
      relations: ["user", "app", "role", "customPermissions", "customPermissions.permission"],
    });

    if (!access) {
      throw new NotFoundException(`Access record ${accessId} not found`);
    }

    return {
      id: access.id,
      userId: access.userId,
      email: access.user.email,
      firstName: access.user.firstName ?? null,
      lastName: access.user.lastName ?? null,
      appCode: access.app.code,
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
    };
  }

  async createRole(appCode: string, dto: CreateRoleDto): Promise<RoleResponseDto> {
    const app = await this.appRepo.findOne({ where: { code: appCode } });
    if (!app) {
      throw new NotFoundException(`App '${appCode}' not found`);
    }

    const existingRole = await this.roleRepo.findOne({
      where: { appId: app.id, code: dto.code },
    });
    if (existingRole) {
      throw new ConflictException(`Role with code '${dto.code}' already exists for this app`);
    }

    const maxDisplayOrder = await this.roleRepo
      .createQueryBuilder("role")
      .select("MAX(role.displayOrder)", "max")
      .where("role.appId = :appId", { appId: app.id })
      .getRawOne();

    const displayOrder = (maxDisplayOrder?.max ?? 0) + 1;

    if (dto.isDefault) {
      await this.roleRepo.update({ appId: app.id, isDefault: true }, { isDefault: false });
    }

    const role = this.roleRepo.create({
      appId: app.id,
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      isDefault: dto.isDefault ?? false,
      displayOrder,
    });

    const savedRole = await this.roleRepo.save(role);
    return this.roleToResponseDto(savedRole);
  }

  async updateRole(roleId: number, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
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
        await this.roleRepo.update({ appId: role.appId, isDefault: true }, { isDefault: false });
      }
      role.isDefault = dto.isDefault;
    }

    const updatedRole = await this.roleRepo.save(role);
    return this.roleToResponseDto(updatedRole);
  }

  async deleteRole(roleId: number): Promise<{ message: string; reassignedUsers: number }> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId },
      relations: ["app"],
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const defaultRole = await this.roleRepo.findOne({
      where: { appId: role.appId, isDefault: true },
    });

    const usersWithRole = await this.accessRepo.count({ where: { roleId } });
    let reassignedUsers = 0;

    if (usersWithRole > 0) {
      if (defaultRole && defaultRole.id !== roleId) {
        await this.accessRepo.update({ roleId }, { roleId: defaultRole.id });
        reassignedUsers = usersWithRole;
      } else {
        await this.accessRepo.update({ roleId }, { roleId: null, useCustomPermissions: true });
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
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const products = await this.roleProductRepo.find({
      where: { roleId },
      order: { productKey: "ASC" },
    });

    return {
      roleId,
      productKeys: products.map((p) => p.productKey),
    };
  }

  async setRoleProducts(roleId: number, productKeys: string[]): Promise<RoleProductsResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    await this.roleProductRepo.delete({ roleId });

    if (productKeys.length > 0) {
      const uniqueKeys = [...new Set(productKeys)];
      const newProducts = uniqueKeys.map((productKey) =>
        this.roleProductRepo.create({ roleId, productKey }),
      );
      await this.roleProductRepo.save(newProducts);
    }

    return {
      roleId,
      productKeys: productKeys.sort(),
    };
  }

  async roleById(roleId: number): Promise<RoleResponseDto> {
    const role = await this.roleRepo.findOne({ where: { id: roleId } });
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
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
