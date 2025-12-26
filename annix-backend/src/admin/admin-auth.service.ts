import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { AdminSession } from './entities/admin-session.entity';
import { User } from '../user/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AdminLoginDto, AdminLoginResponseDto, TokenResponseDto } from './dto/admin-auth.dto';

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
        userId: null,
        userType: 'admin',
        action: 'admin_login_failed',
        entityType: 'auth',
        entityId: null,
        metadata: { email: loginDto.email, reason: 'user_not_found' },
        ipAddress: clientIp,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        userId: user.id,
        userType: 'admin',
        action: 'admin_login_failed',
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: loginDto.email, reason: 'invalid_password' },
        ipAddress: clientIp,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has admin or employee role
    const roleNames = user.roles?.map((r) => r.name) || [];
    const hasAdminAccess = roleNames.includes('admin') || roleNames.includes('employee');

    if (!hasAdminAccess) {
      await this.auditService.log({
        userId: user.id,
        userType: 'admin',
        action: 'admin_login_failed',
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: loginDto.email, reason: 'insufficient_permissions' },
        ipAddress: clientIp,
      });
      throw new ForbiddenException('You do not have permission to access the admin portal');
    }

    // Check if user is active
    if (user.status !== 'active') {
      await this.auditService.log({
        userId: user.id,
        userType: 'admin',
        action: 'admin_login_failed',
        entityType: 'auth',
        entityId: user.id,
        metadata: { email: loginDto.email, reason: 'account_inactive', status: user.status },
        ipAddress: clientIp,
      });
      throw new ForbiddenException(`Your account is ${user.status}. Please contact your administrator.`);
    }

    // Create session token
    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

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
      userId: user.id,
      userType: 'admin',
      action: 'admin_login_success',
      entityType: 'auth',
      entityId: user.id,
      metadata: { email: user.email, sessionToken },
      ipAddress: clientIp,
    });

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: roleNames,
      },
    };
  }

  async logout(userId: number, sessionToken: string, clientIp: string): Promise<void> {
    const session = await this.adminSessionRepository.findOne({
      where: { userId, sessionToken, isRevoked: false },
    });

    if (session) {
      session.isRevoked = true;
      session.revokedAt = new Date();
      await this.adminSessionRepository.save(session);

      await this.auditService.log({
        userId,
        userType: 'admin',
        action: 'admin_logout',
        entityType: 'auth',
        entityId: userId,
        metadata: { sessionToken },
        ipAddress: clientIp,
      });
    }
  }

  async validateSession(sessionToken: string): Promise<User> {
    const session = await this.adminSessionRepository.findOne({
      where: {
        sessionToken,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'user.roles'],
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Update last active time
    session.lastActiveAt = new Date();
    await this.adminSessionRepository.save(session);

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
