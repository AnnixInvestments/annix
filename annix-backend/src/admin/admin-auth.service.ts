import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../user/entities/user.entity';
import { AdminSession } from './entities/admin-session.entity';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
  AdminRefreshTokenDto,
  AdminRefreshTokenResponseDto,
  AdminUserProfileDto,
} from './dto/admin-auth.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

// Constants
const SESSION_EXPIRY_DAYS = 7;
const ACCESS_TOKEN_EXPIRY = '4h';
const REFRESH_TOKEN_EXPIRY = '7d';

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(AdminSession)
    private readonly sessionRepo: Repository<AdminSession>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Admin login
   */
  async login(
    dto: AdminLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    // Find user by email with roles
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['roles'],
    });

    if (!user) {
      this.logger.warn(`Login attempt with non-existent email: ${dto.email} from IP ${clientIp}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt for user ${user.id} from IP ${clientIp}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has admin or employee role
    const roleNames = user.roles.map((r) => r.name);
    const hasAdminAccess = roleNames.includes('admin') || roleNames.includes('employee');

    if (!hasAdminAccess) {
      this.logger.warn(`Unauthorized login attempt by non-admin user ${user.id} from IP ${clientIp}`);
      throw new ForbiddenException('You do not have permission to access the admin portal');
    }

    // Invalidate any existing sessions for this user
    await this.sessionRepo.update(
      { userId: user.id, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    // Create new session
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

    const session = this.sessionRepo.create({
      userId: user.id,
      sessionToken,
      clientIp,
      userAgent,
      expiresAt,
    });
    await this.sessionRepo.save(session);

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      email: user.email,
      type: 'admin',
      roles: roleNames,
      sessionToken,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: ACCESS_TOKEN_EXPIRY }),
      this.jwtService.signAsync(payload, { expiresIn: REFRESH_TOKEN_EXPIRY }),
    ]);

    // Log audit
    await this.auditService.log({
      performedBy: user,
      entityType: 'admin_session',
      entityId: session.id,
      action: AuditAction.CREATE,
      newValues: {
        event: 'admin_login',
        sessionToken: sessionToken.substring(0, 8) + '...',
      },
      ipAddress: clientIp,
      userAgent,
    });

    this.logger.log(`Admin user ${user.id} (${user.email}) logged in successfully from IP ${clientIp}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.username || '', // Assuming firstName is stored in username or another field
        lastName: '',
        roles: roleNames,
      },
    };
  }

  /**
   * Admin logout
   */
  async logout(userId: number, sessionToken: string, clientIp: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { userId, sessionToken, isRevoked: false },
      relations: ['user'],
    });

    if (session) {
      session.isRevoked = true;
      session.revokedAt = new Date();
      await this.sessionRepo.save(session);

      // Log audit
      await this.auditService.log({
        performedBy: session.user,
        entityType: 'admin_session',
        entityId: session.id,
        action: AuditAction.DELETE,
        newValues: { event: 'admin_logout' },
        ipAddress: clientIp,
      });

      this.logger.log(`Admin user ${userId} logged out successfully from IP ${clientIp}`);
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionToken: string): Promise<User | null> {
    const session = await this.sessionRepo.findOne({
      where: {
        sessionToken,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'user.roles'],
    });

    if (!session) {
      return null;
    }

    // Update last active time
    session.lastActiveAt = new Date();
    await this.sessionRepo.save(session);

    return session.user;
  }

  /**
   * Refresh access token
   */
  async refreshToken(dto: AdminRefreshTokenDto): Promise<AdminRefreshTokenResponseDto> {
    try {
      // Verify the refresh token
      const payload = await this.jwtService.verifyAsync(dto.refreshToken);

      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Validate session still exists and is active
      const session = await this.sessionRepo.findOne({
        where: {
          sessionToken: payload.sessionToken,
          isRevoked: false,
          expiresAt: MoreThan(new Date()),
        },
        relations: ['user', 'user.roles'],
      });

      if (!session) {
        throw new UnauthorizedException('Session expired or invalid');
      }

      // Generate new access token with same session
      const newPayload = {
        sub: session.user.id,
        email: session.user.email,
        type: 'admin',
        roles: session.user.roles.map((r) => r.name),
        sessionToken: session.sessionToken,
      };

      const accessToken = await this.jwtService.signAsync(newPayload, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });

      // Update session last active time
      session.lastActiveAt = new Date();
      await this.sessionRepo.save(session);

      return { accessToken };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Get current admin user profile
   */
  async getCurrentUser(userId: number): Promise<AdminUserProfileDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roleNames = user.roles.map((r) => r.name);
    const hasAdminAccess = roleNames.includes('admin') || roleNames.includes('employee');

    if (!hasAdminAccess) {
      throw new ForbiddenException('User does not have admin access');
    }

    const session = await this.sessionRepo.findOne({
      where: { userId: user.id, isRevoked: false },
      order: { lastActiveAt: 'DESC' },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.username || '',
      lastName: '',
      roles: roleNames,
      createdAt: new Date(), // You might want to add this to User entity
      lastActiveAt: session?.lastActiveAt,
    };
  }

  /**
   * Revoke all sessions for a user (used when password changes, account suspended, etc.)
   */
  async revokeAllSessions(userId: number, reason: string): Promise<void> {
    await this.sessionRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    const user = await this.userRepo.findOne({ where: { id: userId } });

    await this.auditService.log({
      performedBy: user,
      entityType: 'admin_session',
      action: AuditAction.DELETE,
      newValues: {
        event: 'revoke_all_sessions',
        reason,
      },
    });

    this.logger.log(`All sessions revoked for admin user ${userId}. Reason: ${reason}`);
  }
}
