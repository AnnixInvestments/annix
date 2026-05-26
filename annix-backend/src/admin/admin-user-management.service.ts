import * as crypto from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { EmailService } from "../email/email.service";
import { now } from "../lib/datetime";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { UserSyncService } from "../user-sync/user-sync.service";
import {
  AdminAuditItemDto,
  AdminLoginHistoryItemDto,
  AdminUserDetailDto,
  AdminUserListItemDto,
  AdminUserListResponseDto,
  AdminUserQueryDto,
  CreateAdminUserDto,
  DeactivateAdminUserDto,
  UpdateAdminRoleDto,
} from "./dto/admin-user-management.dto";
import { AdminSessionRepository } from "./repositories/admin-session.repository";

@Injectable()
export class AdminUserManagementService {
  private readonly logger = new Logger(AdminUserManagementService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly adminSessionRepo: AdminSessionRepository,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly userSyncService: UserSyncService,
  ) {}

  /**
   * List all admin/employee users with pagination
   */
  async listAdminUsers(queryDto: AdminUserQueryDto): Promise<AdminUserListResponseDto> {
    const { search, role, page = 1, limit = 20 } = queryDto;

    const skip = (page - 1) * limit;
    const { users, total } = await this.userRepo.findAdminOrEmployeesPaginated({
      search,
      role,
      skip,
      take: limit,
    });

    // Get last login for each user
    const lastLogins = await Promise.all(
      users.map(async (user) => {
        const session = await this.adminSessionRepo.findLatestByUser(user.id);
        return { userId: user.id, lastLogin: session?.createdAt };
      }),
    );

    // Map to DTOs
    const items: AdminUserListItemDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.username || "", // Assuming firstName stored in username
      lastName: "",
      roles: user.roles.map((r) => r.name),
      createdAt: now().toJSDate(),
      lastLogin: lastLogins.find((ll) => ll.userId === user.id)?.lastLogin,
      isActive: true, // You might want to add this to User entity
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create a new admin or employee user
   */
  async createAdminUser(dto: CreateAdminUserDto, createdBy: number): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepo.findOneByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException("A user with this email already exists");
    }

    const temporaryPassword = dto.temporaryPassword || this.generateTemporaryPassword();

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    let userRole = await this.userRoleRepo.findByName(dto.role);
    if (!userRole) {
      userRole = await this.userRoleRepo.create({ name: dto.role });
    }

    const savedUser = await this.userRepo.create({
      email: dto.email,
      username: `${dto.firstName} ${dto.lastName}`,
      passwordHash: hashedPassword,
      roles: [userRole],
    });

    // Log audit
    const createdByUser = await this.userRepo.findById(createdBy);
    await this.auditService.log({
      entityType: "user",
      entityId: savedUser.id,
      action: AuditAction.USER_CREATED,
      newValues: {
        email: dto.email,
        role: dto.role,
        createdByAdmin: createdBy,
      },
    });

    // Send welcome email with temporary password
    try {
      await this.emailService.sendAdminWelcomeEmail(
        dto.email,
        `${dto.firstName} ${dto.lastName}`,
        temporaryPassword,
      );
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${dto.email}: ${error.message}`);
      // Don't fail the user creation if email fails
    }

    this.logger.log(`Admin user ${savedUser.id} (${dto.email}) created by user ${createdBy}`);

    this.userSyncService
      .syncUserToPeer({
        email: dto.email,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        username: `${dto.firstName} ${dto.lastName}`,
        status: "active",
      })
      .catch((error) => this.logger.error(`Peer sync failed for ${dto.email}: ${error.message}`));

    return savedUser;
  }

  /**
   * Update admin user role
   */
  async updateAdminRole(userId: number, dto: UpdateAdminRoleDto, updatedBy: number): Promise<User> {
    const user = await this.userRepo.findByIdWithRoles(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user is an admin/employee
    const roleNames = user.roles.map((r) => r.name);
    if (!roleNames.includes("admin") && !roleNames.includes("employee")) {
      throw new BadRequestException("User is not an admin or employee");
    }

    // Get the new role
    let newRole = await this.userRoleRepo.findByName(dto.role);
    if (!newRole) {
      newRole = await this.userRoleRepo.create({ name: dto.role });
    }

    const oldRoles = user.roles.map((r) => r.name);

    // Update role
    user.roles = [newRole];
    const updatedUser = await this.userRepo.save(user);

    // Revoke all sessions since role changed
    await this.adminSessionRepo.revokeAllForUser(userId, now().toJSDate());

    // Log audit
    const updatedByUser = await this.userRepo.findById(updatedBy);
    await this.auditService.log({
      entityType: "user",
      entityId: userId,
      action: AuditAction.USER_UPDATED,
      oldValues: { roles: oldRoles },
      newValues: { roles: [dto.role], updatedByAdmin: updatedBy },
    });

    this.logger.log(
      `User ${userId} role updated from ${oldRoles.join(",")} to ${dto.role} by user ${updatedBy}`,
    );

    return updatedUser;
  }

  /**
   * Deactivate admin user
   */
  async deactivateAdminUser(
    userId: number,
    dto: DeactivateAdminUserDto,
    deactivatedBy: number,
  ): Promise<void> {
    const user = await this.userRepo.findByIdWithRoles(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Prevent self-deactivation
    if (userId === deactivatedBy) {
      throw new ForbiddenException("You cannot deactivate your own account");
    }

    // Revoke all sessions
    await this.adminSessionRepo.revokeAllForUser(userId, now().toJSDate());

    // Log audit
    const deactivatedByUser = await this.userRepo.findById(deactivatedBy);
    await this.auditService.log({
      entityType: "user",
      entityId: userId,
      action: AuditAction.USER_DEACTIVATED,
      newValues: {
        event: "admin_user_deactivated",
        reason: dto.reason,
        deactivatedByAdmin: deactivatedBy,
      },
    });

    this.logger.log(
      `Admin user ${userId} deactivated by user ${deactivatedBy}. Reason: ${dto.reason}`,
    );
  }

  /**
   * Reactivate admin user
   */
  async reactivateAdminUser(userId: number, reactivatedBy: number): Promise<User> {
    const user = await this.userRepo.findByIdWithRoles(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Log audit
    const reactivatedByUser = await this.userRepo.findById(reactivatedBy);
    await this.auditService.log({
      entityType: "user",
      entityId: userId,
      action: AuditAction.USER_REACTIVATED,
      newValues: {
        event: "admin_user_reactivated",
        reactivatedByAdmin: reactivatedBy,
      },
    });

    this.logger.log(`Admin user ${userId} reactivated by user ${reactivatedBy}`);

    return user;
  }

  /**
   * Get admin user detail with login history and audit trail
   */
  async getAdminUserDetail(userId: number): Promise<AdminUserDetailDto> {
    const user = await this.userRepo.findByIdWithRoles(userId);

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get login history (last 20 sessions)
    const sessions = await this.adminSessionRepo.findRecentByUser(userId, 20);

    const loginHistory: AdminLoginHistoryItemDto[] = sessions.map((session) => ({
      id: session.id,
      timestamp: session.createdAt,
      clientIp: session.clientIp,
      userAgent: session.userAgent,
      success: !session.isRevoked,
    }));

    // Get audit trail (last 50 actions)
    const auditLogs = await this.auditService.getUserActivity(userId, undefined, undefined, 50);
    const auditTrail: AdminAuditItemDto[] = auditLogs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || 0,
      details: log.newValues ? JSON.stringify(log.newValues) : "",
      clientIp: log.ipAddress || "",
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.username || "",
      lastName: "",
      roles: user.roles.map((r) => r.name),
      createdAt: now().toJSDate(),
      lastLogin: sessions[0]?.createdAt,
      isActive: true,
      loginHistory,
      auditTrail,
    };
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    return crypto.randomBytes(12).toString("base64").slice(0, 16);
  }
}
