import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
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
  CustomerOnboarding,
  CustomerRole,
  CustomerDocument,
} from './entities';
import { CustomerOnboardingStatus } from './entities/customer-onboarding.entity';
import { LoginFailureReason } from './entities/customer-login-attempt.entity';
import { SessionInvalidationReason } from './entities/customer-session.entity';
import { CustomerDocumentType, CustomerDocumentValidationStatus } from './entities/customer-document.entity';
import * as path from 'path';
import * as fs from 'fs';
import {
  CreateCustomerRegistrationDto,
  CustomerLoginDto,
  CustomerLoginResponseDto,
  RefreshTokenDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import { DocumentOcrService } from './document-ocr.service';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;
const SESSION_EXPIRY_HOURS = 1;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);
  private readonly uploadDir: string;

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
    @InjectRepository(CustomerOnboarding)
    private readonly onboardingRepo: Repository<CustomerOnboarding>,
    @InjectRepository(CustomerDocument)
    private readonly documentRepo: Repository<CustomerDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly documentOcrService: DocumentOcrService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
  }

  /**
   * Register a new customer (company + user + device binding + documents)
   * Returns auth tokens for immediate login (email verification disabled for development)
   */
  async register(
    dto: CreateCustomerRegistrationDto,
    clientIp: string,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
  ): Promise<CustomerLoginResponseDto> {
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

      // 3. Generate email verification token
      const emailVerificationToken = uuidv4();
      const emailVerificationExpires = new Date();
      emailVerificationExpires.setHours(emailVerificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

      // 4. Create the customer profile (PENDING until email verified)
      const profile = this.profileRepo.create({
        userId: savedUser.id,
        companyId: savedCompany.id,
        firstName: dto.user.firstName,
        lastName: dto.user.lastName,
        jobTitle: dto.user.jobTitle,
        directPhone: dto.user.directPhone,
        mobilePhone: dto.user.mobilePhone,
        role: CustomerRole.CUSTOMER_ADMIN, // First user is admin
        accountStatus: CustomerAccountStatus.PENDING, // Pending until email verified
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
        termsAcceptedAt: new Date(),
        securityPolicyAcceptedAt: new Date(),
      });
      const savedProfile = await queryRunner.manager.save(profile);

      // 5. Create onboarding record
      const documentsComplete = !!(vatDocument && companyRegDocument);
      const onboarding = this.onboardingRepo.create({
        customerId: savedProfile.id,
        status: CustomerOnboardingStatus.DRAFT,
        companyDetailsComplete: true, // Company details captured at registration
        documentsComplete,
      });
      await queryRunner.manager.save(onboarding);

      // 5a. Save uploaded documents
      if (vatDocument || companyRegDocument) {
        await this.saveRegistrationDocuments(
          queryRunner.manager,
          savedProfile.id,
          vatDocument,
          companyRegDocument,
        );
      }

      // 6. Create the device binding
      const deviceBinding = this.deviceBindingRepo.create({
        customerProfileId: savedProfile.id,
        deviceFingerprint: dto.security.deviceFingerprint,
        registeredIp: clientIp,
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

      // DEVELOPMENT MODE: Skip email verification - auto-login the user
      // TODO: Re-enable email verification for production
      // await this.emailService.sendCustomerVerificationEmail(
      //   dto.user.email,
      //   emailVerificationToken,
      // );

      // Create session for immediate login
      const sessionToken = uuidv4();
      const refreshTokenValue = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

      const session = this.sessionRepo.create({
        customerProfileId: savedProfile.id,
        sessionToken,
        refreshToken: refreshTokenValue,
        deviceFingerprint: dto.security.deviceFingerprint,
        ipAddress: clientIp,
        userAgent: dto.security.browserInfo?.userAgent || 'unknown',
        isActive: true,
        expiresAt,
        lastActivity: new Date(),
      });
      await this.sessionRepo.save(session);

      // Generate JWT tokens
      const payload = {
        sub: savedUser.id,
        customerId: savedProfile.id,
        email: savedUser.email,
        type: 'customer',
        sessionToken,
      };

      const [accessToken, jwtRefreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, { expiresIn: '1h' }),
        this.jwtService.signAsync(payload, { expiresIn: '7d' }),
      ]);

      return {
        accessToken,
        refreshToken: jwtRefreshToken,
        expiresIn: 3600,
        customerId: savedProfile.id,
        name: `${savedProfile.firstName} ${savedProfile.lastName}`,
        companyName: savedCompany.tradingName || savedCompany.legalName,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Save registration documents (VAT and Company Registration)
   */
  private async saveRegistrationDocuments(
    manager: any,
    customerId: number,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
  ): Promise<void> {
    const customerDir = path.join(this.uploadDir, 'customers', customerId.toString());

    // Create directory if it doesn't exist
    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    // Save VAT document
    if (vatDocument) {
      const fileName = `vat_${Date.now()}_${vatDocument.originalname}`;
      const filePath = path.join(customerDir, fileName);

      fs.writeFileSync(filePath, vatDocument.buffer);

      const vatDocEntity = this.documentRepo.create({
        customerId,
        documentType: CustomerDocumentType.TAX_CLEARANCE, // Using tax clearance as closest match
        fileName: vatDocument.originalname,
        filePath,
        fileSize: vatDocument.size,
        mimeType: vatDocument.mimetype,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        isRequired: true,
      });

      await manager.save(vatDocEntity);
    }

    // Save company registration document
    if (companyRegDocument) {
      const fileName = `company_reg_${Date.now()}_${companyRegDocument.originalname}`;
      const filePath = path.join(customerDir, fileName);

      fs.writeFileSync(filePath, companyRegDocument.buffer);

      const companyRegEntity = this.documentRepo.create({
        customerId,
        documentType: CustomerDocumentType.REGISTRATION_CERT,
        fileName: companyRegDocument.originalname,
        filePath,
        fileSize: companyRegDocument.size,
        mimeType: companyRegDocument.mimetype,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        isRequired: true,
      });

      await manager.save(companyRegEntity);
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

    // DEVELOPMENT MODE: Skip password verification
    // TODO: Re-enable password verification for production
    // const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    // if (!isPasswordValid) {
    //   await this.logLoginAttempt(null, dto.email, false, LoginFailureReason.INVALID_CREDENTIALS, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new UnauthorizedException('Invalid credentials');
    // }

    // Get customer profile
    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
      relations: ['company', 'deviceBindings'],
    });

    if (!profile) {
      throw new UnauthorizedException('Customer profile not found');
    }

    // DEVELOPMENT MODE: Skip email verification check
    // TODO: Re-enable email verification for production
    // if (!profile.emailVerified) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.EMAIL_NOT_VERIFIED, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Email not verified. Please check your email for the verification link.');
    // }

    // DEVELOPMENT MODE: Skip account status check
    // TODO: Re-enable account status check for production
    // if (profile.accountStatus === CustomerAccountStatus.PENDING) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.ACCOUNT_PENDING, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Account is pending activation');
    // }
    //
    // if (profile.accountStatus === CustomerAccountStatus.SUSPENDED) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.ACCOUNT_SUSPENDED, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Account has been suspended. Please contact support.');
    // }
    //
    // if (profile.accountStatus === CustomerAccountStatus.DEACTIVATED) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.ACCOUNT_DEACTIVATED, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Account has been deactivated');
    // }

    // DEVELOPMENT MODE: Skip device fingerprint verification
    // TODO: Re-enable device fingerprint verification for production
    // const activeBinding = profile.deviceBindings.find(
    //   (b) => b.isActive && b.isPrimary,
    // );
    //
    // if (!activeBinding) {
    //   throw new UnauthorizedException('No active device binding found. Please contact support.');
    // }
    //
    // if (activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, LoginFailureReason.DEVICE_MISMATCH, dto.deviceFingerprint, clientIp, userAgent);
    //
    //   // Log this as a security event
    //   await this.auditService.log({
    //     entityType: 'customer_profile',
    //     entityId: profile.id,
    //     action: AuditAction.REJECT,
    //     newValues: {
    //       reason: 'device_mismatch',
    //       attemptedFingerprint: dto.deviceFingerprint.substring(0, 20) + '...',
    //       registeredFingerprint: activeBinding.deviceFingerprint.substring(0, 20) + '...',
    //     },
    //     ipAddress: clientIp,
    //     userAgent,
    //   });
    //
    //   throw new UnauthorizedException(
    //     'Device not recognized. This account is locked to a specific device. Please contact support if you need to change devices.',
    //   );
    // }

    // DEVELOPMENT MODE: Skip IP mismatch check
    // Check IP mismatch (WARNING ONLY - not blocking)
    // const ipMismatchWarning = activeBinding.registeredIp !== clientIp;

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
    try {
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
    } catch (error) {
      // Silently skip rate limiting if table doesn't exist (development mode)
      if (!error.message.includes('Too many failed login attempts')) {
        this.logger.warn('Failed to check login attempts (table may not exist): ' + error.message);
      } else {
        throw error; // Re-throw if it's the actual lockout error
      }
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
    try {
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
    } catch (error) {
      // Silently fail if login attempts table doesn't exist (development mode)
      this.logger.warn('Failed to log login attempt (table may not exist): ' + error.message);
    }
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

  /**
   * Verify email with token
   */
  async verifyEmail(token: string, clientIp: string): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(new Date()),
      },
      relations: ['user', 'company'],
    });

    if (!profile) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (profile.emailVerified) {
      return {
        success: true,
        message: 'Email already verified. You can log in.',
      };
    }

    // Update profile
    profile.emailVerified = true;
    profile.emailVerificationToken = null;
    profile.emailVerificationExpires = null;
    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    await this.profileRepo.save(profile);

    // Log the verification
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: 'email_verified',
        email: profile.user.email,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string, clientIp: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return {
        success: true,
        message: 'If an account exists with this email, a verification link will be sent.',
      };
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
    });

    if (!profile) {
      return {
        success: true,
        message: 'If an account exists with this email, a verification link will be sent.',
      };
    }

    if (profile.emailVerified) {
      throw new BadRequestException('Email is already verified. You can log in.');
    }

    // Generate new token
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

    profile.emailVerificationToken = emailVerificationToken;
    profile.emailVerificationExpires = emailVerificationExpires;
    await this.profileRepo.save(profile);

    // Send verification email
    await this.emailService.sendCustomerVerificationEmail(email, emailVerificationToken);

    // Log the resend
    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: 'verification_email_resent',
        email,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  }

  /**
   * Validate uploaded document against user input using OCR
   */
  async validateUploadedDocument(
    file: Express.Multer.File,
    documentType: 'vat' | 'registration',
    expectedData: {
      vatNumber?: string;
      registrationNumber?: string;
      companyName?: string;
      streetAddress?: string;
      city?: string;
      provinceState?: string;
      postalCode?: string;
    },
  ): Promise<{
    success: boolean;
    isValid: boolean;
    mismatches: Array<{
      field: string;
      expected: string;
      extracted: string;
      similarity?: number;
    }>;
    extractedData: any;
    ocrFailed: boolean;
    requiresManualReview: boolean;
    allowedToProceed: boolean;
    message?: string;
  }> {
    try {
      this.logger.log(
        `Validating ${documentType} document for company: ${expectedData.companyName}`,
      );

      // Extract data using OCR service
      const extractedData = await this.documentOcrService.extractDocumentData(
        file,
        documentType,
      );

      // Validate against expected data
      const validationResult = this.documentOcrService.validateDocument(
        extractedData,
        expectedData,
      );

      const response = {
        success: true,
        isValid: validationResult.isValid,
        mismatches: validationResult.mismatches.map((m) => ({
          field: m.field,
          expected: m.expected,
          extracted: m.extracted,
          similarity: m.similarity,
        })),
        extractedData: {
          vatNumber: extractedData.vatNumber,
          registrationNumber: extractedData.registrationNumber,
          companyName: extractedData.companyName,
          streetAddress: extractedData.streetAddress,
          city: extractedData.city,
          provinceState: extractedData.provinceState,
          postalCode: extractedData.postalCode,
          confidence: extractedData.confidence,
        },
        ocrFailed: validationResult.ocrFailed,
        requiresManualReview: validationResult.requiresManualReview,
        allowedToProceed: true, // Always allow to proceed per requirements
      };

      this.logger.log('=== VALIDATION RESPONSE ===');
      this.logger.log(JSON.stringify(response, null, 2));
      this.logger.log('=== END RESPONSE ===');

      return response;
    } catch (error) {
      this.logger.error(`Document validation error: ${error.message}`, error.stack);

      // OCR failed - allow to proceed but mark for manual review
      return {
        success: true,
        isValid: false,
        ocrFailed: true,
        requiresManualReview: true,
        allowedToProceed: true,
        mismatches: [],
        extractedData: { success: false, errors: [error.message] },
        message: 'OCR processing failed. Document will be marked for manual review. You may proceed with registration.',
      };
    }
  }
}
