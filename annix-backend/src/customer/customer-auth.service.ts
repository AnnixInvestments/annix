import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { now, nowMillis } from '../lib/datetime';
import * as path from 'path';
import * as fs from 'fs';

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
import {
  CustomerDocumentType,
  CustomerDocumentValidationStatus,
} from './entities/customer-document.entity';
import {
  CreateCustomerRegistrationDto,
  CustomerLoginDto,
  CustomerLoginResponseDto,
  CustomerRefreshTokenDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';
import { DocumentOcrService } from './document-ocr.service';
import {
  AUTH_CONSTANTS,
  PasswordService,
  TokenService,
  RateLimitingService,
  SessionService,
  DeviceBindingService,
  AuthConfigService,
  JwtTokenPayload,
} from '../shared/auth';

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
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly documentOcrService: DocumentOcrService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly sessionService: SessionService,
    private readonly deviceBindingService: DeviceBindingService,
    private readonly authConfigService: AuthConfigService,
  ) {
    this.uploadDir = this.authConfigService.uploadDir();
  }

  async register(
    dto: CreateCustomerRegistrationDto,
    clientIp: string,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
  ): Promise<CustomerLoginResponseDto> {
    if (!dto.security.termsAccepted) {
      throw new BadRequestException('Terms and conditions must be accepted');
    }
    if (!dto.security.securityPolicyAccepted) {
      throw new BadRequestException(
        'Security policy must be accepted (account locked to this device)',
      );
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.user.email },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const existingCompany = await this.companyRepo.findOne({
      where: { registrationNumber: dto.company.registrationNumber },
    });
    if (existingCompany) {
      throw new ConflictException(
        'A company with this registration number already exists',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const company = this.companyRepo.create({
        ...dto.company,
        country: dto.company.country || 'South Africa',
      });
      const savedCompany = await queryRunner.manager.save(company);

      const { hash: hashedPassword, salt } = await this.passwordService.hash(
        dto.user.password,
      );

      let customerRole = await this.userRoleRepo.findOne({
        where: { name: 'customer' },
      });
      if (!customerRole) {
        customerRole = this.userRoleRepo.create({ name: 'customer' });
        customerRole = await queryRunner.manager.save(customerRole);
      }

      const user = this.userRepo.create({
        username: dto.user.email,
        email: dto.user.email,
        password: hashedPassword,
        salt: salt,
        roles: [customerRole],
      });
      const savedUser = await queryRunner.manager.save(user);

      const emailVerificationToken = uuidv4();
      const emailVerificationExpires = now()
        .plus({ hours: AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS })
        .toJSDate();

      const profile = this.profileRepo.create({
        userId: savedUser.id,
        companyId: savedCompany.id,
        firstName: dto.user.firstName,
        lastName: dto.user.lastName,
        jobTitle: dto.user.jobTitle,
        directPhone: dto.user.directPhone,
        mobilePhone: dto.user.mobilePhone,
        role: CustomerRole.CUSTOMER_ADMIN,
        accountStatus: CustomerAccountStatus.PENDING,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
        termsAcceptedAt: now().toJSDate(),
        securityPolicyAcceptedAt: now().toJSDate(),
      });
      const savedProfile = await queryRunner.manager.save(profile);

      const documentsComplete = !!(vatDocument && companyRegDocument);
      const onboarding = this.onboardingRepo.create({
        customerId: savedProfile.id,
        status: CustomerOnboardingStatus.DRAFT,
        companyDetailsComplete: true,
        documentsComplete,
      });
      await queryRunner.manager.save(onboarding);

      if (vatDocument || companyRegDocument) {
        await this.saveRegistrationDocuments(
          queryRunner.manager,
          savedProfile.id,
          vatDocument,
          companyRegDocument,
        );
      }

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

      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: savedProfile.id,
        action: AuditAction.CREATE,
        newValues: {
          email: dto.user.email,
          companyName: dto.company.legalName,
          deviceFingerprint:
            dto.security.deviceFingerprint.substring(0, 20) + '...',
        },
        ipAddress: clientIp,
        userAgent: dto.security.browserInfo?.userAgent,
      });

      const { session, sessionToken } = this.sessionService.createSession(
        this.sessionRepo,
        {
          profileId: savedProfile.id,
          profileIdField: 'customerProfileId',
          deviceFingerprint: dto.security.deviceFingerprint,
          ipAddress: clientIp,
          userAgent: dto.security.browserInfo?.userAgent || 'unknown',
        },
      );
      await this.sessionRepo.save(session);

      const payload: JwtTokenPayload = {
        sub: savedUser.id,
        customerId: savedProfile.id,
        email: savedUser.email,
        type: 'customer',
        sessionToken,
      };

      const { accessToken, refreshToken } =
        await this.tokenService.generateTokenPair(payload);

      return {
        accessToken,
        refreshToken,
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

  private async saveRegistrationDocuments(
    manager: any,
    customerId: number,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
  ): Promise<void> {
    const customerDir = path.join(
      this.uploadDir,
      'customers',
      customerId.toString(),
    );

    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    if (vatDocument) {
      const fileName = `vat_${nowMillis()}_${vatDocument.originalname}`;
      const filePath = path.join(customerDir, fileName);

      fs.writeFileSync(filePath, vatDocument.buffer);

      const vatDocEntity = this.documentRepo.create({
        customerId,
        documentType: CustomerDocumentType.TAX_CLEARANCE,
        fileName: vatDocument.originalname,
        filePath,
        fileSize: vatDocument.size,
        mimeType: vatDocument.mimetype,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        isRequired: true,
      });

      await manager.save(vatDocEntity);
    }

    if (companyRegDocument) {
      const fileName = `company_reg_${nowMillis()}_${companyRegDocument.originalname}`;
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

  async login(
    dto: CustomerLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<CustomerLoginResponseDto> {
    await this.rateLimitingService.checkLoginAttempts(
      this.loginAttemptRepo,
      dto.email,
    );

    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['roles'],
    });

    if (!user) {
      await this.logLoginAttempt(
        null,
        dto.email,
        false,
        LoginFailureReason.INVALID_CREDENTIALS,
        dto.deviceFingerprint,
        clientIp,
        userAgent,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!this.authConfigService.isPasswordVerificationDisabled()) {
      const isPasswordValid = await this.passwordService.verify(
        dto.password,
        user.password,
      );
      if (!isPasswordValid) {
        await this.logLoginAttempt(
          null,
          dto.email,
          false,
          LoginFailureReason.INVALID_CREDENTIALS,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
      relations: ['company', 'deviceBindings'],
    });

    if (!profile) {
      const userRoles = user.roles?.map((r) => r.name) || [];
      this.logger.warn(
        `Customer login failed: User ${dto.email} (ID: ${user.id}) has no customer profile. Roles: ${userRoles.join(', ')}`,
      );

      if (userRoles.includes('supplier')) {
        throw new UnauthorizedException(
          'This account is registered as a supplier. Please use the supplier portal to login.',
        );
      }
      if (userRoles.includes('admin') || userRoles.includes('superadmin')) {
        throw new UnauthorizedException(
          'This account is registered as an administrator. Please use the admin portal to login.',
        );
      }

      throw new UnauthorizedException(
        'Customer profile not found. Your registration may not have completed. Please try registering again or contact support.',
      );
    }

    if (
      !this.authConfigService.isEmailVerificationDisabled() &&
      !profile.emailVerified
    ) {
      await this.logLoginAttempt(
        profile.id,
        dto.email,
        false,
        LoginFailureReason.EMAIL_NOT_VERIFIED,
        dto.deviceFingerprint,
        clientIp,
        userAgent,
      );
      throw new ForbiddenException(
        'Email not verified. Please check your email for the verification link.',
      );
    }

    if (!this.authConfigService.isAccountStatusCheckDisabled()) {
      if (profile.accountStatus === CustomerAccountStatus.PENDING) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          LoginFailureReason.ACCOUNT_PENDING,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );
        throw new ForbiddenException('Account is pending activation');
      }

      if (profile.accountStatus === CustomerAccountStatus.SUSPENDED) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          LoginFailureReason.ACCOUNT_SUSPENDED,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );
        throw new ForbiddenException(
          'Account has been suspended. Please contact support.',
        );
      }

      if (profile.accountStatus === CustomerAccountStatus.DEACTIVATED) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          LoginFailureReason.ACCOUNT_DEACTIVATED,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );
        throw new ForbiddenException('Account has been deactivated');
      }
    }

    let ipMismatchWarning = false;
    const activeBinding = this.deviceBindingService.findPrimaryActiveBinding(
      profile.deviceBindings,
    );

    if (!this.authConfigService.isDeviceFingerprintDisabled()) {
      if (!activeBinding) {
        throw new UnauthorizedException(
          'No active device binding found. Please contact support.',
        );
      }

      if (activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          LoginFailureReason.DEVICE_MISMATCH,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );

        await this.auditService.log({
          entityType: 'customer_profile',
          entityId: profile.id,
          action: AuditAction.REJECT,
          newValues: {
            reason: 'device_mismatch',
            attemptedFingerprint: dto.deviceFingerprint.substring(0, 20) + '...',
            registeredFingerprint:
              activeBinding.deviceFingerprint.substring(0, 20) + '...',
          },
          ipAddress: clientIp,
          userAgent,
        });

        throw new UnauthorizedException(
          'Device not recognized. This account is locked to a specific device. Please contact support if you need to change devices.',
        );
      }
    }

    if (
      !this.authConfigService.isIpMismatchCheckDisabled() &&
      activeBinding &&
      activeBinding.registeredIp !== clientIp
    ) {
      ipMismatchWarning = true;
    }

    await this.sessionService.invalidateAllSessions(
      this.sessionRepo,
      profile.id,
      'customerProfileId',
      SessionInvalidationReason.NEW_LOGIN,
    );

    const { session, sessionToken } = this.sessionService.createSession(
      this.sessionRepo,
      {
        profileId: profile.id,
        profileIdField: 'customerProfileId',
        deviceFingerprint: dto.deviceFingerprint,
        ipAddress: clientIp,
        userAgent,
      },
    );
    await this.sessionRepo.save(session);

    const payload: JwtTokenPayload = {
      sub: user.id,
      customerId: profile.id,
      email: user.email,
      type: 'customer',
      sessionToken,
    };

    const { accessToken, refreshToken } =
      await this.tokenService.generateTokenPair(payload);

    await this.logLoginAttempt(
      profile.id,
      dto.email,
      true,
      null,
      dto.deviceFingerprint,
      clientIp,
      userAgent,
      ipMismatchWarning,
    );

    await this.auditService.log({
      entityType: 'customer_profile',
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: 'login',
        ipMismatchWarning,
        currentIp: clientIp,
      },
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      customerId: profile.id,
      name: `${profile.firstName} ${profile.lastName}`,
      companyName: profile.company.tradingName || profile.company.legalName,
      ipMismatchWarning,
      registeredIp: undefined,
    };
  }

  async logout(sessionToken: string, clientIp: string): Promise<void> {
    const session = await this.sessionService.invalidateSession(
      this.sessionRepo,
      sessionToken,
      SessionInvalidationReason.LOGOUT,
    );

    if (session) {
      await this.auditService.log({
        entityType: 'customer_profile',
        entityId: session.customerProfileId,
        action: AuditAction.UPDATE,
        newValues: { event: 'logout' },
        ipAddress: clientIp,
      });
    }
  }

  async refreshSession(
    dto: CustomerRefreshTokenDto,
    clientIp: string,
  ): Promise<CustomerLoginResponseDto> {
    try {
      const payload = await this.tokenService.verifyToken<JwtTokenPayload>(
        dto.refreshToken,
      );

      const profile = await this.profileRepo.findOne({
        where: { id: payload.customerId },
        relations: ['company', 'deviceBindings', 'user'],
      });

      if (!profile) {
        throw new UnauthorizedException('Customer not found');
      }

      if (!this.authConfigService.isDeviceFingerprintDisabled()) {
        const activeBinding = this.deviceBindingService.findPrimaryActiveBinding(
          profile.deviceBindings,
        );
        if (
          !activeBinding ||
          activeBinding.deviceFingerprint !== dto.deviceFingerprint
        ) {
          throw new UnauthorizedException('Device mismatch');
        }
      }

      if (profile.accountStatus !== CustomerAccountStatus.ACTIVE) {
        throw new ForbiddenException('Account is not active');
      }

      const sessionToken = uuidv4();
      const newPayload: JwtTokenPayload = {
        sub: profile.userId,
        customerId: profile.id,
        email: profile.user.email,
        type: 'customer',
        sessionToken,
      };

      const { accessToken, refreshToken } =
        await this.tokenService.generateTokenPair(newPayload);

      await this.sessionService.updateSessionToken(
        this.sessionRepo,
        profile.id,
        'customerProfileId',
        sessionToken,
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

  async verifyDeviceBinding(
    customerId: number,
    deviceFingerprint: string,
  ): Promise<CustomerDeviceBinding | null> {
    return this.deviceBindingService.findBinding(
      this.deviceBindingRepo,
      customerId,
      'customerProfileId',
      deviceFingerprint,
    );
  }

  async verifySession(sessionToken: string): Promise<CustomerSession | null> {
    return this.sessionService.validateSession(
      this.sessionRepo,
      sessionToken,
      ['customerProfile'],
    );
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
    await this.rateLimitingService.logLoginAttempt(this.loginAttemptRepo, {
      profileId: customerProfileId,
      profileIdField: 'customerProfileId',
      email,
      success,
      failureReason,
      deviceFingerprint,
      ipAddress,
      userAgent,
      ipMismatchWarning,
    });
  }

  async verifyEmail(
    token: string,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const profile = await this.profileRepo.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(now().toJSDate()),
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

    profile.emailVerified = true;
    profile.emailVerificationToken = null;
    profile.emailVerificationExpires = null;
    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    await this.profileRepo.save(profile);

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

  async resendVerificationEmail(
    email: string,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      return {
        success: true,
        message:
          'If an account exists with this email, a verification link will be sent.',
      };
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
    });

    if (!profile) {
      return {
        success: true,
        message:
          'If an account exists with this email, a verification link will be sent.',
      };
    }

    if (profile.emailVerified) {
      throw new BadRequestException(
        'Email is already verified. You can log in.',
      );
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = now()
      .plus({ hours: AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS })
      .toJSDate();

    profile.emailVerificationToken = emailVerificationToken;
    profile.emailVerificationExpires = emailVerificationExpires;
    await this.profileRepo.save(profile);

    await this.emailService.sendCustomerVerificationEmail(
      email,
      emailVerificationToken,
    );

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

      const extractedData = await this.documentOcrService.extractDocumentData(
        file,
        documentType,
      );

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
        allowedToProceed: true,
      };

      this.logger.log('=== VALIDATION RESPONSE ===');
      this.logger.log(JSON.stringify(response, null, 2));
      this.logger.log('=== END RESPONSE ===');

      return response;
    } catch (error) {
      this.logger.error(
        `Document validation error: ${error.message}`,
        error.stack,
      );

      return {
        success: true,
        isValid: false,
        ocrFailed: true,
        requiresManualReview: true,
        allowedToProceed: true,
        mismatches: [],
        extractedData: { success: false, errors: [error.message] },
        message:
          'OCR processing failed. Document will be marked for manual review. You may proceed with registration.',
      };
    }
  }
}
