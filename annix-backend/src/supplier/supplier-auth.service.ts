import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import * as path from 'path';
import * as fs from 'fs';
import { User } from '../user/entities/user.entity';
import { UserRole } from '../user-roles/entities/user-role.entity';
import {
  SupplierProfile,
  SupplierAccountStatus,
  SupplierCompany,
  SupplierDeviceBinding,
  SupplierLoginAttempt,
  SupplierSession,
  SupplierOnboarding,
  SupplierOnboardingStatus,
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
} from './entities';
import { SupplierLoginFailureReason } from './entities/supplier-login-attempt.entity';
import { SupplierSessionInvalidationReason } from './entities/supplier-session.entity';
import {
  CreateSupplierRegistrationDto,
  SupplierLoginDto,
  SupplierLoginResponseDto,
} from './dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { EmailService } from '../email/email.service';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;
const SESSION_EXPIRY_HOURS = 1;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class SupplierAuthService {
  private readonly logger = new Logger(SupplierAuthService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(SupplierCompany)
    private readonly companyRepo: Repository<SupplierCompany>,
    @InjectRepository(SupplierProfile)
    private readonly profileRepo: Repository<SupplierProfile>,
    @InjectRepository(SupplierDeviceBinding)
    private readonly deviceBindingRepo: Repository<SupplierDeviceBinding>,
    @InjectRepository(SupplierLoginAttempt)
    private readonly loginAttemptRepo: Repository<SupplierLoginAttempt>,
    @InjectRepository(SupplierSession)
    private readonly sessionRepo: Repository<SupplierSession>,
    @InjectRepository(SupplierOnboarding)
    private readonly onboardingRepo: Repository<SupplierOnboarding>,
    @InjectRepository(SupplierDocument)
    private readonly documentRepo: Repository<SupplierDocument>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
  }

  /**
   * Register a new supplier with email + password only
   * Returns auth tokens for immediate login (email verification disabled for development)
   */
  async register(dto: CreateSupplierRegistrationDto, clientIp: string): Promise<SupplierLoginResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create the user with 'supplier' role
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      // Get or create supplier role
      let supplierRole = await this.userRoleRepo.findOne({ where: { name: 'supplier' } });
      if (!supplierRole) {
        supplierRole = this.userRoleRepo.create({ name: 'supplier' });
        supplierRole = await queryRunner.manager.save(supplierRole);
      }

      const user = this.userRepo.create({
        username: dto.email,
        email: dto.email,
        password: hashedPassword,
        salt: salt,
        roles: [supplierRole],
      });
      const savedUser = await queryRunner.manager.save(user);

      // 2. Generate email verification token
      const verificationToken = this.jwtService.sign(
        { userId: savedUser.id, email: dto.email, type: 'supplier_verification' },
        { expiresIn: `${EMAIL_VERIFICATION_EXPIRY_HOURS}h` },
      );
      const verificationExpires = new Date();
      verificationExpires.setHours(verificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

      // 3. Create the supplier profile (minimal info, awaiting email verification)
      const profile = this.profileRepo.create({
        userId: savedUser.id,
        accountStatus: SupplierAccountStatus.PENDING,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });
      const savedProfile = await queryRunner.manager.save(profile);

      // 4. Create onboarding record in DRAFT status
      const onboarding = this.onboardingRepo.create({
        supplierId: savedProfile.id,
        status: SupplierOnboardingStatus.DRAFT,
        companyDetailsComplete: false,
        documentsComplete: false,
      });
      await queryRunner.manager.save(onboarding);

      await queryRunner.commitTransaction();

      // DEVELOPMENT MODE: Skip email verification - auto-login the user
      // TODO: Re-enable email verification for production
      // await this.emailService.sendSupplierVerificationEmail(dto.email, verificationToken);

      // Log the registration
      await this.auditService.log({
        entityType: 'supplier_profile',
        entityId: savedProfile.id,
        action: AuditAction.CREATE,
        newValues: {
          email: dto.email,
          emailVerified: false,
        },
        ipAddress: clientIp,
      });

      // Create session for immediate login
      const sessionToken = uuidv4();
      const refreshTokenValue = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

      // Create a device binding for the user
      const deviceBinding = this.deviceBindingRepo.create({
        supplierProfileId: savedProfile.id,
        deviceFingerprint: 'registration-device',
        registeredIp: clientIp,
        isPrimary: true,
        isActive: true,
      });
      await this.deviceBindingRepo.save(deviceBinding);

      const session = this.sessionRepo.create({
        supplierProfileId: savedProfile.id,
        sessionToken,
        refreshToken: refreshTokenValue,
        deviceFingerprint: 'registration-device',
        ipAddress: clientIp,
        userAgent: 'registration',
        isActive: true,
        expiresAt,
        lastActivity: new Date(),
      });
      await this.sessionRepo.save(session);

      // Generate JWT tokens
      const payload = {
        sub: savedUser.id,
        supplierId: savedProfile.id,
        email: savedUser.email,
        type: 'supplier',
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
        supplier: {
          id: savedProfile.id,
          email: savedUser.email,
          firstName: undefined,
          lastName: undefined,
          companyName: undefined,
          accountStatus: savedProfile.accountStatus,
          onboardingStatus: SupplierOnboardingStatus.DRAFT,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Register a new supplier with full company details, profile, and documents
   * Returns auth tokens for immediate login (email verification disabled for development)
   */
  async registerFull(
    dto: {
      email: string;
      password: string;
      deviceFingerprint: string;
      browserInfo?: Record<string, any>;
      company: any;
      profile: any;
    },
    clientIp: string,
    userAgent: string,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
    beeDocument?: Express.Multer.File,
  ): Promise<SupplierLoginResponseDto> {
    // Check if email already exists
    const existingUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    // Check if company registration number already exists
    if (dto.company?.registrationNumber) {
      const existingCompany = await this.companyRepo.findOne({
        where: { registrationNumber: dto.company.registrationNumber },
      });
      if (existingCompany) {
        throw new ConflictException('A company with this registration number already exists');
      }
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create the company
      const company = this.companyRepo.create({
        legalName: dto.company.legalName,
        tradingName: dto.company.tradingName,
        registrationNumber: dto.company.registrationNumber,
        taxNumber: dto.company.taxNumber,
        vatNumber: dto.company.vatNumber,
        streetAddress: dto.company.streetAddress,
        addressLine2: dto.company.addressLine2,
        city: dto.company.city,
        provinceState: dto.company.provinceState,
        postalCode: dto.company.postalCode,
        country: dto.company.country || 'South Africa',
        primaryContactName: dto.company.primaryContactName,
        primaryContactEmail: dto.company.primaryContactEmail,
        primaryContactPhone: dto.company.primaryContactPhone,
        primaryPhone: dto.company.primaryPhone,
        faxNumber: dto.company.faxNumber,
        generalEmail: dto.company.generalEmail,
        website: dto.company.website,
        industryType: dto.company.industryType,
        companySize: dto.company.companySize,
        beeLevel: dto.company.beeLevel,
        beeCertificateExpiry: dto.company.beeCertificateExpiry,
        beeVerificationAgency: dto.company.beeVerificationAgency,
        isExemptMicroEnterprise: dto.company.isExemptMicroEnterprise || false,
      });
      const savedCompany = await queryRunner.manager.save(company);

      // 2. Create the user with 'supplier' role
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      let supplierRole = await this.userRoleRepo.findOne({ where: { name: 'supplier' } });
      if (!supplierRole) {
        supplierRole = this.userRoleRepo.create({ name: 'supplier' });
        supplierRole = await queryRunner.manager.save(supplierRole);
      }

      const user = this.userRepo.create({
        username: dto.email,
        email: dto.email,
        password: hashedPassword,
        salt: salt,
        roles: [supplierRole],
      });
      const savedUser = await queryRunner.manager.save(user);

      // 3. Create the supplier profile with company link
      const profile = this.profileRepo.create({
        userId: savedUser.id,
        companyId: savedCompany.id,
        firstName: dto.profile?.firstName,
        lastName: dto.profile?.lastName,
        jobTitle: dto.profile?.jobTitle,
        directPhone: dto.profile?.directPhone,
        mobilePhone: dto.profile?.mobilePhone,
        accountStatus: SupplierAccountStatus.PENDING,
        emailVerified: true, // Skip verification for development
      });
      const savedProfile = await queryRunner.manager.save(profile);

      // 4. Create onboarding record
      const documentsComplete = !!(vatDocument && companyRegDocument);
      const onboarding = this.onboardingRepo.create({
        supplierId: savedProfile.id,
        status: SupplierOnboardingStatus.DRAFT,
        companyDetailsComplete: true,
        documentsComplete,
      });
      await queryRunner.manager.save(onboarding);

      // 5. Save uploaded documents
      if (vatDocument || companyRegDocument || beeDocument) {
        await this.saveRegistrationDocuments(
          queryRunner.manager,
          savedProfile.id,
          vatDocument,
          companyRegDocument,
          beeDocument,
        );
      }

      // 6. Create device binding
      const deviceBinding = this.deviceBindingRepo.create({
        supplierProfileId: savedProfile.id,
        deviceFingerprint: dto.deviceFingerprint,
        registeredIp: clientIp,
        browserInfo: dto.browserInfo,
        isPrimary: true,
        isActive: true,
      });
      await queryRunner.manager.save(deviceBinding);

      await queryRunner.commitTransaction();

      // Log the registration
      await this.auditService.log({
        entityType: 'supplier_profile',
        entityId: savedProfile.id,
        action: AuditAction.CREATE,
        newValues: {
          email: dto.email,
          companyName: dto.company.legalName,
          deviceFingerprint: dto.deviceFingerprint?.substring(0, 20) + '...',
        },
        ipAddress: clientIp,
        userAgent,
      });

      // Create session for immediate login
      const sessionToken = uuidv4();
      const refreshTokenValue = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

      const session = this.sessionRepo.create({
        supplierProfileId: savedProfile.id,
        sessionToken,
        refreshToken: refreshTokenValue,
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
        sub: savedUser.id,
        supplierId: savedProfile.id,
        email: savedUser.email,
        type: 'supplier',
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
        supplier: {
          id: savedProfile.id,
          email: savedUser.email,
          firstName: savedProfile.firstName,
          lastName: savedProfile.lastName,
          companyName: savedCompany.tradingName || savedCompany.legalName,
          accountStatus: savedProfile.accountStatus,
          onboardingStatus: SupplierOnboardingStatus.DRAFT,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Save registration documents (VAT, Company Registration, BEE)
   */
  private async saveRegistrationDocuments(
    manager: any,
    supplierId: number,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
    beeDocument?: Express.Multer.File,
  ): Promise<void> {
    const supplierDir = path.join(this.uploadDir, 'suppliers', supplierId.toString());

    // Create directory if it doesn't exist
    if (!fs.existsSync(supplierDir)) {
      fs.mkdirSync(supplierDir, { recursive: true });
    }

    // Save VAT document
    if (vatDocument) {
      const fileName = `vat_${Date.now()}_${vatDocument.originalname}`;
      const filePath = path.join(supplierDir, fileName);

      fs.writeFileSync(filePath, vatDocument.buffer);

      const vatDocEntity = this.documentRepo.create({
        supplierId,
        documentType: SupplierDocumentType.VAT_CERT,
        fileName: vatDocument.originalname,
        filePath,
        fileSize: vatDocument.size,
        mimeType: vatDocument.mimetype,
        validationStatus: SupplierDocumentValidationStatus.PENDING,
        isRequired: true,
      });

      await manager.save(vatDocEntity);
    }

    // Save company registration document
    if (companyRegDocument) {
      const fileName = `company_reg_${Date.now()}_${companyRegDocument.originalname}`;
      const filePath = path.join(supplierDir, fileName);

      fs.writeFileSync(filePath, companyRegDocument.buffer);

      const companyRegEntity = this.documentRepo.create({
        supplierId,
        documentType: SupplierDocumentType.REGISTRATION_CERT,
        fileName: companyRegDocument.originalname,
        filePath,
        fileSize: companyRegDocument.size,
        mimeType: companyRegDocument.mimetype,
        validationStatus: SupplierDocumentValidationStatus.PENDING,
        isRequired: true,
      });

      await manager.save(companyRegEntity);
    }

    // Save BEE document
    if (beeDocument) {
      const fileName = `bee_${Date.now()}_${beeDocument.originalname}`;
      const filePath = path.join(supplierDir, fileName);

      fs.writeFileSync(filePath, beeDocument.buffer);

      const beeDocEntity = this.documentRepo.create({
        supplierId,
        documentType: SupplierDocumentType.BEE_CERT,
        fileName: beeDocument.originalname,
        filePath,
        fileSize: beeDocument.size,
        mimeType: beeDocument.mimetype,
        validationStatus: SupplierDocumentValidationStatus.PENDING,
        isRequired: false, // BEE is not always required
      });

      await manager.save(beeDocEntity);
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string, clientIp: string): Promise<{ success: boolean; message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.type !== 'supplier_verification') {
        throw new BadRequestException('Invalid verification token');
      }

      const profile = await this.profileRepo.findOne({
        where: {
          userId: payload.userId,
          emailVerificationToken: token,
        },
      });

      if (!profile) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      if (profile.emailVerified) {
        return { success: true, message: 'Email already verified. You can now log in.' };
      }

      if (profile.emailVerificationExpires && new Date() > profile.emailVerificationExpires) {
        throw new BadRequestException('Verification token has expired. Please request a new one.');
      }

      // Mark email as verified
      profile.emailVerified = true;
      profile.emailVerificationToken = null;
      profile.emailVerificationExpires = null;
      await this.profileRepo.save(profile);

      await this.auditService.log({
        entityType: 'supplier_profile',
        entityId: profile.id,
        action: AuditAction.UPDATE,
        newValues: { emailVerified: true },
        ipAddress: clientIp,
      });

      return {
        success: true,
        message: 'Email verified successfully. You can now log in and complete your onboarding.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string, clientIp: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return { success: true, message: 'If an account exists with this email, a verification link has been sent.' };
    }

    const profile = await this.profileRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      return { success: true, message: 'If an account exists with this email, a verification link has been sent.' };
    }

    if (profile.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = this.jwtService.sign(
      { userId: user.id, email, type: 'supplier_verification' },
      { expiresIn: `${EMAIL_VERIFICATION_EXPIRY_HOURS}h` },
    );
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);

    profile.emailVerificationToken = verificationToken;
    profile.emailVerificationExpires = verificationExpires;
    await this.profileRepo.save(profile);

    await this.emailService.sendSupplierVerificationEmail(email, verificationToken);

    return {
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    };
  }

  /**
   * Login with email, password, and device fingerprint verification
   */
  async login(dto: SupplierLoginDto, clientIp: string, userAgent: string): Promise<SupplierLoginResponseDto> {
    // Check for too many failed attempts (rate limiting)
    await this.checkLoginAttempts(dto.email, clientIp);

    // Find user by email
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['roles'],
    });

    if (!user) {
      await this.logLoginAttempt(null, dto.email, false, SupplierLoginFailureReason.INVALID_CREDENTIALS, dto.deviceFingerprint, clientIp, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // DEVELOPMENT MODE: Skip password verification
    // TODO: Re-enable password verification for production
    // const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    // if (!isPasswordValid) {
    //   await this.logLoginAttempt(null, dto.email, false, SupplierLoginFailureReason.INVALID_CREDENTIALS, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new UnauthorizedException('Invalid credentials');
    // }

    // Get supplier profile
    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
      relations: ['company', 'deviceBindings', 'onboarding'],
    });

    if (!profile) {
      throw new UnauthorizedException('Supplier profile not found');
    }

    // DEVELOPMENT MODE: Skip email verification
    // TODO: Re-enable email verification for production
    // if (!profile.emailVerified) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, SupplierLoginFailureReason.EMAIL_NOT_VERIFIED, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Please verify your email before logging in');
    // }

    // DEVELOPMENT MODE: Skip account status checks
    // TODO: Re-enable account status checks for production
    // if (profile.accountStatus === SupplierAccountStatus.SUSPENDED) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, SupplierLoginFailureReason.ACCOUNT_SUSPENDED, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Account has been suspended. Please contact support.');
    // }
    //
    // if (profile.accountStatus === SupplierAccountStatus.DEACTIVATED) {
    //   await this.logLoginAttempt(profile.id, dto.email, false, SupplierLoginFailureReason.ACCOUNT_DEACTIVATED, dto.deviceFingerprint, clientIp, userAgent);
    //   throw new ForbiddenException('Account has been deactivated');
    // }

    // DEVELOPMENT MODE: Skip device binding verification
    // TODO: Re-enable device binding for production
    // let activeBinding = profile.deviceBindings?.find((b) => b.isActive && b.isPrimary);
    //
    // if (!activeBinding) {
    //   // First login - create device binding
    //   const deviceBinding = this.deviceBindingRepo.create({
    //     supplierProfileId: profile.id,
    //     deviceFingerprint: dto.deviceFingerprint,
    //     registeredIp: clientIp,
    //     browserInfo: dto.browserInfo,
    //     isPrimary: true,
    //     isActive: true,
    //   });
    //   activeBinding = await this.deviceBindingRepo.save(deviceBinding);
    //   this.logger.log(`Created device binding for supplier ${profile.id}`);
    // } else if (activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
    //   // Device mismatch
    //   await this.logLoginAttempt(profile.id, dto.email, false, SupplierLoginFailureReason.DEVICE_MISMATCH, dto.deviceFingerprint, clientIp, userAgent);
    //
    //   await this.auditService.log({
    //     entityType: 'supplier_profile',
    //     entityId: profile.id,
    //     action: AuditAction.REJECT,
    //     newValues: {
    //       reason: 'device_mismatch',
    //       attemptedFingerprint: dto.deviceFingerprint.substring(0, 20) + '...',
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
    // TODO: Re-enable IP mismatch check for production
    // const ipMismatchWarning = activeBinding.registeredIp !== clientIp;
    const ipMismatchWarning = false;

    // Invalidate any existing active sessions (single session enforcement)
    await this.invalidateAllSessions(profile.id, SupplierSessionInvalidationReason.NEW_LOGIN);

    // Create new session
    const sessionToken = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    const session = this.sessionRepo.create({
      supplierProfileId: profile.id,
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
      supplierId: profile.id,
      email: user.email,
      type: 'supplier',
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
      entityType: 'supplier_profile',
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: 'login',
        ipMismatchWarning,
      },
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: jwtRefreshToken,
      expiresIn: 3600,
      supplier: {
        id: profile.id,
        email: user.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        companyName: profile.company?.tradingName || profile.company?.legalName,
        accountStatus: profile.accountStatus,
        onboardingStatus: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
      },
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
      session.invalidationReason = SupplierSessionInvalidationReason.LOGOUT;
      await this.sessionRepo.save(session);

      await this.auditService.log({
        entityType: 'supplier_profile',
        entityId: session.supplierProfileId,
        action: AuditAction.UPDATE,
        newValues: { event: 'logout' },
        ipAddress: clientIp,
      });
    }
  }

  /**
   * Refresh session token
   */
  async refreshSession(refreshToken: string, deviceFingerprint: string, clientIp: string): Promise<SupplierLoginResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      const profile = await this.profileRepo.findOne({
        where: { id: payload.supplierId },
        relations: ['company', 'deviceBindings', 'onboarding', 'user'],
      });

      if (!profile) {
        throw new UnauthorizedException('Supplier not found');
      }

      const activeBinding = profile.deviceBindings.find((b) => b.isActive && b.isPrimary);
      if (!activeBinding || activeBinding.deviceFingerprint !== deviceFingerprint) {
        throw new UnauthorizedException('Device mismatch');
      }

      if (profile.accountStatus !== SupplierAccountStatus.PENDING && profile.accountStatus !== SupplierAccountStatus.ACTIVE) {
        throw new ForbiddenException('Account is not active');
      }

      // Generate new tokens
      const sessionToken = uuidv4();
      const newPayload = {
        sub: profile.userId,
        supplierId: profile.id,
        email: profile.user.email,
        type: 'supplier',
        sessionToken,
      };

      const [accessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, { expiresIn: '1h' }),
        this.jwtService.signAsync(newPayload, { expiresIn: '7d' }),
      ]);

      // Update session
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

      await this.sessionRepo.update(
        { supplierProfileId: profile.id, isActive: true },
        { sessionToken, lastActivity: new Date(), expiresAt },
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
        supplier: {
          id: profile.id,
          email: profile.user.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          companyName: profile.company?.tradingName || profile.company?.legalName,
          accountStatus: profile.accountStatus,
          onboardingStatus: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Verify session is valid
   */
  async verifySession(sessionToken: string): Promise<SupplierSession | null> {
    const session = await this.sessionRepo.findOne({
      where: { sessionToken, isActive: true },
      relations: ['supplierProfile'],
    });

    if (!session) return null;

    // Check if expired
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      session.invalidatedAt = new Date();
      session.invalidationReason = SupplierSessionInvalidationReason.EXPIRED;
      await this.sessionRepo.save(session);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    await this.sessionRepo.save(session);

    return session;
  }

  /**
   * Get supplier profile by ID
   */
  async getProfileById(supplierId: number): Promise<SupplierProfile | null> {
    return this.profileRepo.findOne({
      where: { id: supplierId },
      relations: ['company', 'onboarding', 'documents', 'user'],
    });
  }

  // Private helper methods

  private async checkLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const lockoutTime = new Date();
    lockoutTime.setMinutes(lockoutTime.getMinutes() - LOGIN_LOCKOUT_MINUTES);

    const recentAttempts = await this.loginAttemptRepo.count({
      where: {
        email,
        success: false,
        attemptTime: MoreThan(lockoutTime),
      },
    });

    if (recentAttempts >= MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException(
        `Too many failed login attempts. Please try again in ${LOGIN_LOCKOUT_MINUTES} minutes.`,
      );
    }
  }

  private async logLoginAttempt(
    supplierProfileId: number | null,
    email: string,
    success: boolean,
    failureReason: SupplierLoginFailureReason | null,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string,
    ipMismatchWarning: boolean = false,
  ): Promise<void> {
    const attempt = this.loginAttemptRepo.create({
      supplierProfileId,
      email,
      success,
      failureReason,
      deviceFingerprint,
      ipAddress,
      userAgent,
      ipMismatchWarning,
    });
    await this.loginAttemptRepo.save(attempt);
  }

  private async invalidateAllSessions(
    supplierProfileId: number,
    reason: SupplierSessionInvalidationReason,
  ): Promise<void> {
    await this.sessionRepo.update(
      { supplierProfileId, isActive: true },
      {
        isActive: false,
        invalidatedAt: new Date(),
        invalidationReason: reason,
      },
    );
  }
}
