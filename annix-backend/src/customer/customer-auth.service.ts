import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import {
  CustomerCompany,
  CustomerProfile,
  CustomerDeviceBinding,
  CustomerLoginAttempt,
  CustomerSession,
  CustomerAccountStatus,
} from './entities';
import { LoginFailureReason } from './entities/customer-login-attempt.entity';
import { SessionInvalidationReason } from './entities/customer-session.entity';
import {
  CreateCustomerRegistrationDto,
  CustomerLoginDto,
  CustomerLoginResponseDto,
  RefreshTokenDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;
const SESSION_EXPIRY_HOURS = 1;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(CustomerCompany)
    private readonly companyRepo: Repository<CustomerCompany>,
    @InjectRepository(CustomerProfile)
    private readonly profileRepo: Repository<CustomerProfile>,
    @InjectRepository(CustomerDeviceBinding)
    private readonly deviceBindingRepo: Repository<CustomerDeviceBinding>,
    @InjectRepository(CustomerLoginAttempt)
    private readonly loginAttemptRepo: Repository<CustomerLoginAttempt>,
    @InjectRepository(CustomerSession)
    private readonly sessionRepo: Repository<CustomerSession>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new customer (company + user + device binding)
   */
  async register(dto: CreateCustomerRegistrationDto, clientIp: string): Promise<{ success: boolean; message: string }> {
    // Validate acceptance of terms and security policy
    if (!dto.security.termsAccepted) {
      throw new BadRequestException('Terms and conditions must be accepted');
    }
    if (!dto.security.securityPolicyAccepted) {
      throw new BadRequestException('Security policy must be accepted (account locked to this device)');
    }

    // Check if email already exists
    const existingUser = await this.userRepo.findOne({ where: { email: dto.user.email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Check if company registration number already exists
    const existingCompany = await this.companyRepo.findOne({
      where: { registrationNumber: dto.company.registrationNumber },
    });
    if (existingCompany) {
      throw new ConflictException('A company with this registration number already exists');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create the company
      const company = this.companyRepo.create({
        ...dto.company,
        country: dto.company.country || 'South Africa',
      });
      const savedCompany = await queryRunner.manager.save(company);

      // 2. Create the user with 'customer' role
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(dto.user.password, salt);

      // Get or create customer role
      let customerRole = await this.userRoleRepo.findOne({ where: { name: 'customer' } });
      if (!customerRole) {
        customerRole = this.userRoleRepo.create({ name: 'customer' });
        customerRole = await queryRunner.manager.save(customerRole);
      }

      const user = this.userRepo.create({
        username: dto.user.email, // Use email as username
        email: dto.user.email,
        password: hashedPassword,
        salt: salt,
        roles: [customerRole],
      });
      const savedUser = await queryRunner.manager.save(user);

      // 3. Create the customer profile
      const profile = this.profileRepo.create({
        userId: savedUser.id,
        companyId: savedCompany.id,
        firstName: dto.user.firstName,
        lastName: dto.user.lastName,
        jobTitle: dto.user.jobTitle,
        directPhone: dto.user.directPhone,
        mobilePhone: dto.user.mobilePhone,
        accountStatus: CustomerAccountStatus.ACTIVE, // Auto-activate for now
        termsAcceptedAt: new Date(),
        securityPolicyAcceptedAt: new Date(),
      });
      const savedProfile = await queryRunner.manager.save(profile);

      // 4. Create the device binding
      const deviceBinding = this.deviceBindingRepo.create({
        customerProfileId: savedProfile.id,
        deviceFingerprint: dto.security.deviceFingerprint,
        registeredIp: dto.security.ipAddress || clientIp,
        browserInfo: dto.security.browserInfo,
        isPrimary: true,
        isActive: true,
      });
      await queryRunner.manager.save(deviceBinding);

      await queryRunner.commitTransaction();

      // Log the registration
      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: savedProfile.id,
        action: AuditAction.CREATE,
        newValues: {
          email: dto.user.email,
          companyName: dto.company.legalName,
          deviceFingerprint: dto.security.deviceFingerprint.substring(0, 20) + '...',
        },
        ipAddress: clientIp,
        userAgent: dto.security.browserInfo?.userAgent,
      });

      return {
        success: true,
        message: 'Registration successful. You can now log in.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Login with email, password, and device fingerprint verification
   */
  async login(dto: CustomerLoginDto, clientIp: string, userAgent: string): Promise<CustomerLoginResponseDto> {
    // Check for too many failed attempts (rate limiting)
    await this.checkLoginAttempts(dto.email, clientIp);

    // Find user by email
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['roles'],
    });

    if (!user) {
      await this.logLoginAttempt(null, dto.email, false, LoginFailureReason.INVALID_CREDENTIALS, dto.deviceFingerprint, clientIp, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.logLoginAttempt(null, dto.email, false, LoginFailureReason.INVALID_CREDENTIALS, dto.deviceFingerprint, clientIp, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get customer profile
    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
      relations: ['company', 'deviceBindings'],
    });

    if (!profile) {
      throw new UnauthorizedException('Customer profile not found');
    }

    // Check account status
    if (profile.accountStatus === CustomerAccountStatus.PENDING) {
      await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.ACCOUNT_PENDING, dto.deviceFingerprint, clientIp, userAgent);
      throw new ForbiddenException('Account is pending activation');
    }

    if (profile.accountStatus === CustomerAccountStatus.SUSPENDED) {
      await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.ACCOUNT_SUSPENDED, dto.deviceFingerprint, clientIp, userAgent);
      throw new ForbiddenException('Account has been suspended. Please contact support.');
    }

    if (profile.accountStatus === CustomerAccountStatus.DEACTIVATED) {
      await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.ACCOUNT_DEACTIVATED, dto.deviceFingerprint, clientIp, userAgent);
      throw new ForbiddenException('Account has been deactivated');
    }

    // Verify device fingerprint (PRIMARY CHECK)
    const activeBinding = profile.deviceBindings.find(
      (b) => b.isActive && b.isPrimary,
    );

    if (!activeBinding) {
      throw new UnauthorizedException('No active device binding found. Please contact support.');
    }

    if (activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
      await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.DEVICE_MISMATCH, dto.deviceFingerprint, clientIp, userAgent);

      // Log this as a security event
      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: profile.id,
        action: AuditAction.REJECT,
        newValues: {
          reason: 'device_mismatch',
          attemptedFingerprint: dto.deviceFingerprint.substring(0, 20) + '...',
          registeredFingerprint: activeBinding.deviceFingerprint.substring(0, 20) + '...',
        },
        ipAddress: clientIp,
        userAgent,
      });

      throw new UnauthorizedException(
        'Device not recognized. This account is locked to a specific device. Please contact support if you need to change devices.',
      );
    }

    // Check IP mismatch (WARNING ONLY - not blocking)
    const ipMismatchWarning = activeBinding.registeredIp !== clientIp;

    // Invalidate any existing active sessions (single session enforcement)
    await this.invalidateAllSessions(profile.id, SessionInvalidationReason.NEW_LOGIN);

    // Create new session
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    const session = this.sessionRepo.create({
      customerProfileId: profile.id,
      sessionToken,
      refreshToken,
      deviceFingerprint: dto.deviceFingerprint,
      ipAddress: clientIp,
      userAgent,
      isActive: true,
      expiresAt,
      lastActivity: new Date(),
    });
    await this.sessionRepo.save(session);

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      customerId: profile.id,
      email: user.email,
      type: 'customer',
      sessionToken,
    };

    const [accessToken, jwtRefreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '1h' }),
      this.jwtService.signAsync(payload, { expiresIn: '7d' }),
    ]);

    // Log successful login
    await this.logLoginAttempt(profile.id, dto.email, true, null, dto.deviceFingerprint, clientIp, userAgent, ipMismatchWarning);

    // Log audit
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: 'login',
        ipMismatchWarning,
        currentIp: clientIp,
        registeredIp: activeBinding.registeredIp,
      },
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: jwtRefreshToken,
      expiresIn: 3600,
      customerId: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      companyName: profile.company.tradingName || profile.company.legalName,
      ipMismatchWarning,
      registeredIp: ipMismatchWarning ? activeBinding.registeredIp : undefined,
    };
  }

  /**
   * Logout - invalidate current session
   */
  async logout(sessionToken: string, clientIp: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken, isActive: true },
    });

    if (session) {
      session.isActive = false;
      session.invalidatedAt = new Date();
      session.invalidationReason = SessionInvalidationReason.LOGOUT;
      await this.sessionRepo.save(session);

      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: session.customerProfileId,
        action: AuditAction.UPDATE,
        newValues: { event: 'logout' },
        ipAddress: clientIp,
      });
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(dto: RefreshTokenDto, clientIp: string): Promise<CustomerLoginResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken);

      // Verify device fingerprint
      const profile = await this.profileRepo.findOne({
        where: { id: payload.customerId },
        relations: ['company', 'deviceBindings', 'user'],
      });

      if (!profile) {
        throw new UnauthorizedException('Customer not found');
      }

      const activeBinding = profile.deviceBindings.find((b) => b.isActive && b.isPrimary);
      if (!activeBinding || activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
        throw new UnauthorizedException('Device mismatch');
      }

      // Check account status
      if (profile.accountStatus !== CustomerAccountStatus.ACTIVE) {
        throw new ForbiddenException('Account is not active');
      }

      // Generate new tokens
      const sessionToken = uuidv4();
      const newPayload = {
        sub: profile.userId,
        customerId: profile.id,
        email: profile.user.email,
        type: 'customer',
        sessionToken,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, { expiresIn: '1h' }),
        this.jwtService.signAsync(newPayload, { expiresIn: '7d' }),
      ]);

      // Update session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

      await this.sessionRepo.update(
        { customerProfileId: profile.id, isActive: true },
        { sessionToken, lastActivity: new Date(), expiresAt },
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        customerId: profile.id,
        name: `${profile.firstName} ${profile.lastName}`,
        companyName: profile.company.tradingName || profile.company.legalName,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify device binding for a customer
   */
  async verifyDeviceBinding(customerId: number, deviceFingerprint: string): Promise<CustomerDeviceBinding | null> {
    return this.deviceBindingRepo.findOne({
      where: {
        customerProfileId: customerId,
        deviceFingerprint,
        isActive: true,
        isPrimary: true,
      },
    });
  }

  /**
   * Verify session is valid
   */
  async verifySession(sessionToken: string): Promise<CustomerSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken, isActive: true },
      relations: ['customerProfile'],
    });

    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      session.invalidatedAt = new Date();
      session.invalidationReason = SessionInvalidationReason.EXPIRED;
      await this.sessionRepo.save(session);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    await this.sessionRepo.save(session);

    return session;
  }

  // Private helper methods

  private async checkLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const lockoutTime = new Date();
    lockoutTime.setMinutes(lockoutTime.getMinutes() - LOGIN_LOCKOUT_MINUTES);

    const recentAttempts = await this.loginAttemptRepo.count({
      where: {
        email,
        success: false,
        attemptTime: { $gte: lockoutTime } as any,
      },
    });

    if (recentAttempts >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        `Too many failed login attempts. Please try again in ${LOGIN_LOCKOUT_MINUTES} minutes.`,
      );
    }
  }

  private async logLoginAttempt(
    customerProfileId: number | null,
    email: string,
    success: boolean,
    failureReason: LoginFailureReason | null,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string,
    ipMismatchWarning: boolean = false,
  ): Promise<void> {
    const attempt = new CustomerLoginAttempt();
    if (customerProfileId) {
      attempt.customerProfileId = customerProfileId;
    }
    attempt.email = email;
    attempt.success = success;
    if (failureReason) {
      attempt.failureReason = failureReason;
    }
    attempt.deviceFingerprint = deviceFingerprint;
    attempt.ipAddress = ipAddress;
    attempt.userAgent = userAgent;
    attempt.ipMismatchWarning = ipMismatchWarning;
    await this.loginAttemptRepo.save(attempt);
  }

  private async invalidateAllSessions(
    customerProfileId: number,
    reason: SessionInvalidationReason,
  ): Promise<void> {
    await this.sessionRepo.update(
      { customerProfileId, isActive: true },
      {
        isActive: false,
        invalidatedAt: new Date(),
        invalidationReason: reason,
      },
    );
  }
}
