import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { AdminSession } from './entities/admin-session.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import {
  AdminUserQueryDto,
  CreateAdminUserDto,
  UpdateAdminRoleDto,
  DeactivateAdminUserDto,
  AdminUserListItemDto,
  AdminUserListResponseDto,
  AdminUserDetailDto,
  AdminLoginHistoryItemDto,
  AdminAuditItemDto,
} from './dto/admin-user-management.dto';

@Injectable()
export class AdminUserManagementService {
  private readonly logger = new Logger(AdminUserManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    @InjectRepository(AdminSession)
    private readonly adminSessionRepo: Repository<AdminSession>,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * List all admin/employee users with pagination
   */
  async listAdminUsers(queryDto: AdminUserQueryDto): Promise<AdminUserListResponseDto> {
    const { search, role, page = 1, limit = 20 } = queryDto;

    const queryBuilder = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('(roles.name = :admin OR roles.name = :employee)', {
        admin: 'admin',
        employee: 'employee',
      });

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        '(user.email LIKE :search OR user.username LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply role filter
    if (role) {
      queryBuilder.andWhere('roles.name = :role', { role });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit).orderBy('user.id', 'DESC');

    // Execute query
    const users = await queryBuilder.getMany();

    // Get last login for each user
    const lastLogins = await Promise.all(
      users.map(async (user) => {
        const session = await this.adminSessionRepo.findOne({
          where: { userId: user.id },
          order: { createdAt: 'DESC' },
        });
        return { userId: user.id, lastLogin: session?.createdAt };
      }),
    );

    // Map to DTOs
    const items: AdminUserListItemDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.username || '', // Assuming firstName stored in username
      lastName: '',
      roles: user.roles.map((r) => r.name),
      createdAt: new Date(), // You might want to add this to User entity
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
  async createAdminUser(
    dto: CreateAdminUserDto,
    createdBy: number,
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Generate temporary password if not provided
    const temporaryPassword =
      dto.temporaryPassword || this.generateTemporaryPassword();

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    // Get or create the specified role
    let userRole = await this.userRoleRepo.findOne({ where: { name: dto.role } });
    if (!userRole) {
      userRole = this.userRoleRepo.create({ name: dto.role });
      userRole = await this.userRoleRepo.save(userRole);
    }

    // Create user
    const user = this.userRepo.create({
      email: dto.email,
      username: `${dto.firstName} ${dto.lastName}`,
      password: hashedPassword,
      salt: salt,
      roles: [userRole],
    });

    const savedUser = await this.userRepo.save(user);

    // Log audit
    await this.auditService.log({
      userId: createdBy,
      entityType: 'user',
      entityId: savedUser.id,
      action: AuditAction.CREATE,
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

    this.logger.log(
      `Admin user ${savedUser.id} (${dto.email}) created by user ${createdBy}`,
    );

    return savedUser;
  }

  /**
   * Update admin user role
   */
  async updateAdminRole(
    userId: number,
    dto: UpdateAdminRoleDto,
    updatedBy: number,
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if user is an admin/employee
    const roleNames = user.roles.map((r) => r.name);
    if (!roleNames.includes('admin') && !roleNames.includes('employee')) {
      throw new BadRequestException('User is not an admin or employee');
    }

    // Get the new role
    let newRole = await this.userRoleRepo.findOne({ where: { name: dto.role } });
    if (!newRole) {
      newRole = this.userRoleRepo.create({ name: dto.role });
      newRole = await this.userRoleRepo.save(newRole);
    }

    const oldRoles = user.roles.map((r) => r.name);

    // Update role
    user.roles = [newRole];
    const updatedUser = await this.userRepo.save(user);

    // Revoke all sessions since role changed
    await this.adminSessionRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    // Log audit
    await this.auditService.log({
      userId: updatedBy,
      entityType: 'user',
      entityId: userId,
      action: AuditAction.UPDATE,
      oldValues: { roles: oldRoles },
      newValues: { roles: [dto.role] },
    });

    this.logger.log(
      `User ${userId} role updated from ${oldRoles.join(',')} to ${dto.role} by user ${updatedBy}`,
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
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Prevent self-deactivation
    if (userId === deactivatedBy) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    // Revoke all sessions
    await this.adminSessionRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    // Log audit
    await this.auditService.log({
      userId: deactivatedBy,
      entityType: 'user',
      entityId: userId,
      action: AuditAction.DELETE,
      newValues: {
        event: 'admin_user_deactivated',
        reason: dto.reason,
      },
    });

    this.logger.log(
      `Admin user ${userId} deactivated by user ${deactivatedBy}. Reason: ${dto.reason}`,
    );
  }

  /**
   * Reactivate admin user
   */
  async reactivateAdminUser(
    userId: number,
    reactivatedBy: number,
  ): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Log audit
    await this.auditService.log({
      userId: reactivatedBy,
      entityType: 'user',
      entityId: userId,
      action: AuditAction.UPDATE,
      newValues: {
        event: 'admin_user_reactivated',
      },
    });

    this.logger.log(`Admin user ${userId} reactivated by user ${reactivatedBy}`);

    return user;
  }

  /**
   * Get admin user detail with login history and audit trail
   */
  async getAdminUserDetail(userId: number): Promise<AdminUserDetailDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get login history (last 20 sessions)
    const sessions = await this.adminSessionRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

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
      entityId: log.entityId,
      details: log.newValues ? JSON.stringify(log.newValues) : '',
      clientIp: log.ipAddress,
    }));

    return {
      id: user.id,
      email: user.email,
      firstName: user.username || '',
      lastName: '',
      roles: user.roles.map((r) => r.name),
      createdAt: new Date(),
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
    return crypto.randomBytes(12).toString('base64').slice(0, 16);
  }
}
