import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { AdminSession } from './entities/admin-session.entity';
import { User } from '../user/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
  TokenResponseDto,
} from './dto/admin-auth.dto';
import { now, fromJSDate } from '../lib/datetime';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(AdminSession)
    private readonly adminSessionRepository: Repository<AdminSession>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async login(
    loginDto: AdminLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      relations: ['roles'],
    });

    if (!user) {
      await this.auditService.log({
        action: AuditAction.ADMIN_LOGIN_FAILED,
        entityType: 'auth',
        entityId: undefined,
        newValues: { email: loginDto.email, reason: 'user_not_found' },
        ipAddress: clientIp,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // DEVELOPMENT MODE: Skip password verification
    // TODO: Re-enable password verification for production
    // const isPasswordValid = await bcrypt.compare(loginDto.password, user.password || '');
    // if (!isPasswordValid) {
    //   await this.auditService.log({
    //     userId: user.id,
    //     userType: 'admin',
    //     action: 'admin_login_failed',
    //     entityType: 'auth',
    //     entityId: user.id,
    //     metadata: { email: loginDto.email, reason: 'invalid_password' },
    //     ipAddress: clientIp,
    //   });
    //   throw new UnauthorizedException('Invalid credentials');
    // }

    // Check if user has admin or employee role
    const roleNames = user.roles?.map((r) => r.name) || [];
    const hasAdminAccess =
      roleNames.includes('admin') || roleNames.includes('employee');

    if (!hasAdminAccess) {
      await this.auditService.log({
        action: AuditAction.ADMIN_LOGIN_FAILED,
        entityType: 'auth',
        entityId: user.id,
        performedBy: user,
        newValues: {
          email: loginDto.email,
          reason: 'insufficient_permissions',
        },
        ipAddress: clientIp,
        userAgent,
      });
      throw new ForbiddenException(
        'You do not have permission to access the admin portal',
      );
    }

    // DEVELOPMENT MODE: Skip status check
    // TODO: Re-enable status check for production
    // if (user.status !== 'active') {
    //   await this.auditService.log({
    //     userId: user.id,
    //     userType: 'admin',
    //     action: 'admin_login_failed',
    //     entityType: 'auth',
    //     entityId: user.id,
    //     metadata: { email: loginDto.email, reason: 'account_inactive', status: user.status },
    //     ipAddress: clientIp,
    //   });
    //   throw new ForbiddenException(`Your account is ${user.status}. Please contact your administrator.`);
    // }

    const sessionToken = uuidv4();
    const expiresAt = now().plus({ days: 7 }).toJSDate();

    // Save session
    const session = this.adminSessionRepository.create({
      userId: user.id,
      sessionToken,
      clientIp,
      userAgent,
      expiresAt,
      isRevoked: false,
    });
    await this.adminSessionRepository.save(session);

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      email: user.email,
      roles: roleNames,
      type: 'admin',
      sessionToken,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '4h' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id, sessionToken, type: 'admin_refresh' },
      { expiresIn: '7d' },
    );

    // Log successful login
    await this.auditService.log({
      action: AuditAction.ADMIN_LOGIN_SUCCESS,
      entityType: 'auth',
      entityId: user.id,
      performedBy: user,
      newValues: { email: user.email, sessionToken },
      ipAddress: clientIp,
      userAgent,
    });

    user.lastLoginAt = now().toJSDate();
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        roles: roleNames,
      },
    };
  }

  async logout(
    userId: number,
    sessionToken: string,
    clientIp: string,
    userAgent?: string,
  ): Promise<void> {
    const session = await this.adminSessionRepository.findOne({
      where: { userId, sessionToken, isRevoked: false },
    });

    if (session) {
      session.isRevoked = true;
      session.revokedAt = now().toJSDate();
      await this.adminSessionRepository.save(session);

      const user = await this.userRepository.findOne({ where: { id: userId } });

      await this.auditService.log({
        action: AuditAction.ADMIN_LOGOUT,
        entityType: 'auth',
        entityId: userId,
        performedBy: user || undefined,
        newValues: { sessionToken },
        ipAddress: clientIp,
        userAgent,
      });
    }
  }

  async validateSession(sessionToken: string): Promise<User> {
    const session = await this.adminSessionRepository.findOne({
      where: {
        sessionToken,
        isRevoked: false,
        expiresAt: MoreThan(now().toJSDate()),
      },
      relations: ['user', 'user.roles'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const lastActive = session.lastActiveAt
      ? now().diff(fromJSDate(session.lastActiveAt), 'minutes').minutes
      : Infinity;

    if (lastActive > 1) {
      session.lastActiveAt = now().toJSDate();
      await this.adminSessionRepository.save(session);
    }

    return session.user;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'admin_refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Validate session still exists and is valid
      const user = await this.validateSession(payload.sessionToken);

      const roleNames = user.roles?.map((r) => r.name) || [];

      // Generate new access token
      const newPayload = {
        sub: user.id,
        email: user.email,
        roles: roleNames,
        type: 'admin',
        sessionToken: payload.sessionToken,
      };

      const accessToken = this.jwtService.sign(newPayload, { expiresIn: '4h' });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getCurrentUser(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roleNames = user.roles?.map((r) => r.name) || [];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: roleNames,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
