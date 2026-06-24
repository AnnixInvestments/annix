import * as fs from "node:fs";
import * as path from "node:path";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "../audit/audit.service";
import { AuditAction } from "../audit/entities/audit-log.entity";
import { EmailService } from "../email/email.service";
import { FeatureFlagsService } from "../feature-flags/feature-flags.service";
import { now, nowMillis } from "../lib/datetime";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { TransactionRunner } from "../lib/persistence/transaction-runner";
import { Address, ContactDetails } from "../lib/value-objects";
import { CompanyRepository } from "../platform/company.repository";
import { CompanyType } from "../platform/entities/company.entity";
import { AppScope } from "../rbac/app-scope";
import { SecureDocumentsService } from "../secure-documents/secure-documents.service";
import {
  AUTH_CONSTANTS,
  AuthConfigService,
  DeviceBindingService,
  JwtTokenPayload,
  PasswordService,
  RateLimitingService,
  SessionService,
  TokenService,
} from "../shared/auth";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { CustomerDeviceBindingRepository } from "./customer-device-binding.repository";
import { CustomerDocumentRepository } from "./customer-document.repository";
import { CustomerLoginAttemptRepository } from "./customer-login-attempt.repository";
import { CustomerOnboardingRepository } from "./customer-onboarding.repository";
import { CustomerProfileRepository } from "./customer-profile.repository";
import { CustomerSessionRepository } from "./customer-session.repository";
import { DocumentOcrService } from "./document-ocr.service";
import {
  CreateCustomerRegistrationDto,
  CustomerLoginDto,
  CustomerLoginResponseDto,
  CustomerRefreshTokenDto,
} from "./dto";
import {
  CustomerAccountStatus,
  CustomerDeviceBinding,
  CustomerRole,
  CustomerSession,
} from "./entities";
import {
  CustomerDocumentType,
  CustomerDocumentValidationStatus,
} from "./entities/customer-document.entity";
import { LoginFailureReason } from "./entities/customer-login-attempt.entity";
import { CustomerOnboardingStatus } from "./entities/customer-onboarding.entity";
import { SessionInvalidationReason } from "./entities/customer-session.entity";

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly profileRepository: CustomerProfileRepository,
    private readonly deviceBindingRepository: CustomerDeviceBindingRepository,
    private readonly loginAttemptRepository: CustomerLoginAttemptRepository,
    private readonly sessionRepository: CustomerSessionRepository,
    private readonly onboardingRepository: CustomerOnboardingRepository,
    private readonly documentRepository: CustomerDocumentRepository,
    private readonly userRepo: UserRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly txRunner: TransactionRunner,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly documentOcrService: DocumentOcrService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly sessionService: SessionService,
    private readonly deviceBindingService: DeviceBindingService,
    private readonly authConfigService: AuthConfigService,
    private readonly secureDocumentsService: SecureDocumentsService,
    private readonly featureFlagsService: FeatureFlagsService,
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
      throw new BadRequestException("Terms and conditions must be accepted");
    }
    if (!dto.security.securityPolicyAccepted) {
      throw new BadRequestException(
        "Security policy must be accepted (account locked to this device)",
      );
    }

    const existingUser = await this.userRepo.findOneByEmailAndScope(
      dto.user.email,
      AppScope.FORGE_CUSTOMER,
    );
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const existingCompany = await this.companyRepo.findByRegistrationNumber(
      dto.company.registrationNumber,
    );
    if (existingCompany) {
      throw new ConflictException("A company with this registration number already exists");
    }

    const { savedProfile, savedUser, savedCompany } = await this.txRunner.run(async (ctx) => {
      const companyRepo = this.companyRepo.withTransaction(ctx);
      const userRoleRepo = this.userRoleRepo.withTransaction(ctx);
      const userRepo = this.userRepo.withTransaction(ctx);
      const deviceBindingRepo = this.deviceBindingRepository.withTransaction(ctx);

      const companyAddress = Address.fromParts({
        streetAddress: dto.company.streetAddress,
        city: dto.company.city,
        province: dto.company.provinceState,
        postalCode: dto.company.postalCode,
      });
      const companyContact = ContactDetails.fromParts({
        phone: dto.company.primaryPhone,
        email: dto.company.generalEmail,
      });

      const company_ = await companyRepo.create({
        name: dto.company.legalName,
        companyType: CompanyType.CUSTOMER,
        legalName: dto.company.legalName,
        tradingName: dto.company.tradingName,
        registrationNumber: dto.company.registrationNumber,
        vatNumber: dto.company.vatNumber,
        industry: dto.company.industry,
        companySize: dto.company.companySize,
        address: companyAddress,
        country: dto.company.country || "South Africa",
        contact: companyContact,
        websiteUrl: dto.company.website,
      });

      const { passwordHash } = await this.passwordService.hash(dto.user.password);

      const existingRole = await userRoleRepo.findOneWhere({ name: "customer" });
      const customerRole = existingRole ?? (await userRoleRepo.create({ name: "customer" }));

      const user_ = await userRepo.create({
        username: dto.user.email,
        email: dto.user.email,
        passwordHash,
        appScope: AppScope.FORGE_CUSTOMER,
        roles: [customerRole],
      });

      const emailVerificationToken = uuidv4();
      const emailVerificationExpires = now()
        .plus({ hours: AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS })
        .toJSDate();

      const profileRepo = this.profileRepository.withTransaction(ctx);
      const profile_ = await profileRepo.create({
        userId: user_.id,
        companyId: company_.id,
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
        documentStorageAcceptedAt: now().toJSDate(),
      });

      const documentsComplete = !!(vatDocument && companyRegDocument);
      const onboardingRepo = this.onboardingRepository.withTransaction(ctx);
      await onboardingRepo.create({
        customerId: profile_.id,
        status: CustomerOnboardingStatus.DRAFT,
        companyDetailsComplete: true,
        documentsComplete,
      });

      if (vatDocument || companyRegDocument) {
        await this.saveRegistrationDocuments(ctx, profile_.id, vatDocument, companyRegDocument);
      }

      await deviceBindingRepo.create({
        customerProfileId: profile_.id,
        deviceFingerprint: dto.security.deviceFingerprint,
        registeredIp: clientIp,
        browserInfo: dto.security.browserInfo,
        isPrimary: true,
        isActive: true,
      });

      return { savedProfile: profile_, savedUser: user_, savedCompany: company_ };
    });

    {
      await this.auditService.log({
        entityType: "customer_profile",
        entityId: savedProfile.id,
        action: AuditAction.CREATE,
        newValues: {
          email: dto.user.email,
          companyName: dto.company.legalName,
          deviceFingerprint: `${dto.security.deviceFingerprint.substring(0, 20)}...`,
        },
        ipAddress: clientIp,
        userAgent: dto.security.browserInfo?.userAgent,
      });

      await this.secureDocumentsService.createEntityFolder(
        "customer",
        savedProfile.id,
        savedCompany.tradingName || savedCompany.legalName || "",
      );

      const { sessionData, sessionToken } = this.sessionService.createSession<
        CustomerSession,
        "customerProfileId"
      >({
        profileId: savedProfile.id,
        profileIdField: "customerProfileId",
        deviceFingerprint: dto.security.deviceFingerprint,
        ipAddress: clientIp,
        userAgent: dto.security.browserInfo?.userAgent || "unknown",
      });
      await this.sessionRepository.create(sessionData);

      const payload: JwtTokenPayload = {
        sub: savedUser.id,
        customerId: savedProfile.id,
        email: savedUser.email,
        type: "customer",
        sessionToken,
        roles: ["customer"],
      };

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        customerId: savedProfile.id,
        name: `${savedProfile.firstName} ${savedProfile.lastName}`,
        companyName: savedCompany.tradingName || savedCompany.legalName || "",
      };
    }
  }

  private async saveRegistrationDocuments(
    context: TransactionContext,
    customerId: number,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
  ): Promise<void> {
    const documentRepo = this.documentRepository.withTransaction(context);
    const customerDir = path.join(this.uploadDir, "customers", customerId.toString());

    if (!fs.existsSync(customerDir)) {
      fs.mkdirSync(customerDir, { recursive: true });
    }

    if (vatDocument) {
      const fileName = `vat_${nowMillis()}_${vatDocument.originalname}`;
      const filePath = path.join(customerDir, fileName);

      fs.writeFileSync(filePath, vatDocument.buffer);

      await documentRepo.create({
        customerId,
        documentType: CustomerDocumentType.TAX_CLEARANCE,
        fileName: vatDocument.originalname,
        filePath,
        fileSize: vatDocument.size,
        mimeType: vatDocument.mimetype,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        isRequired: true,
      });
    }

    if (companyRegDocument) {
      const fileName = `company_reg_${nowMillis()}_${companyRegDocument.originalname}`;
      const filePath = path.join(customerDir, fileName);

      fs.writeFileSync(filePath, companyRegDocument.buffer);

      await documentRepo.create({
        customerId,
        documentType: CustomerDocumentType.REGISTRATION_CERT,
        fileName: companyRegDocument.originalname,
        filePath,
        fileSize: companyRegDocument.size,
        mimeType: companyRegDocument.mimetype,
        validationStatus: CustomerDocumentValidationStatus.PENDING,
        isRequired: true,
      });
    }
  }

  async login(
    dto: CustomerLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<CustomerLoginResponseDto> {
    await this.rateLimitingService.checkLoginAttempts(this.loginAttemptRepository, dto.email);

    const user = await this.userRepo.findByEmailWithRolesAndScope(
      dto.email,
      AppScope.FORGE_CUSTOMER,
    );

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
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!this.authConfigService.isPasswordVerificationDisabled()) {
      const isPasswordValid = await this.passwordService.verify(
        dto.password,
        user.passwordHash || "",
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
        throw new UnauthorizedException("Invalid credentials");
      }
    }

    const profile = await this.profileRepository.findByUserId(user.id, [
      "company",
      "deviceBindings",
    ]);

    if (!profile) {
      const userRoles = user.roles?.map((r) => r.name) || [];
      this.logger.warn(
        `Customer login failed: User ${dto.email} (ID: ${user.id}) has no customer profile. Roles: ${userRoles.join(", ")}`,
      );

      if (userRoles.includes("supplier")) {
        throw new UnauthorizedException(
          "This account is registered as a supplier. Please use the supplier portal to login.",
        );
      }
      if (userRoles.includes("admin") || userRoles.includes("superadmin")) {
        throw new UnauthorizedException(
          "This account is registered as an administrator. Please use the admin portal to login.",
        );
      }

      throw new UnauthorizedException(
        "Customer profile not found. Your registration may not have completed. Please try registering again or contact support.",
      );
    }

    const requireVerification = await this.featureFlagsService.isEnabled(
      "REQUIRE_CUSTOMER_EMAIL_VERIFICATION",
    );
    const disabledByEnv = this.authConfigService.isEmailVerificationDisabled();
    if (!disabledByEnv && requireVerification && !profile.emailVerified) {
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
        "Email not verified. Please check your email for the verification link.",
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
        throw new ForbiddenException("Account is pending activation");
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
        throw new ForbiddenException("Account has been suspended. Please contact support.");
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
        throw new ForbiddenException("Account has been deactivated");
      }
    }

    let ipMismatchWarning = false;
    const activeBinding = this.deviceBindingService.findPrimaryActiveBinding(
      profile.deviceBindings,
    );

    if (!this.authConfigService.isDeviceFingerprintDisabled()) {
      if (!activeBinding) {
        throw new UnauthorizedException("No active device binding found. Please contact support.");
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
          entityType: "customer_profile",
          entityId: profile.id,
          action: AuditAction.REJECT,
          newValues: {
            reason: "device_mismatch",
            attemptedFingerprint: `${dto.deviceFingerprint.substring(0, 20)}...`,
            registeredFingerprint: `${activeBinding.deviceFingerprint.substring(0, 20)}...`,
          },
          ipAddress: clientIp,
          userAgent,
        });

        throw new UnauthorizedException(
          "Device not recognized. This account is locked to a specific device. Please contact support if you need to change devices.",
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
      this.sessionRepository,
      profile.id,
      "customerProfileId",
      SessionInvalidationReason.NEW_LOGIN,
    );

    const { sessionData, sessionToken } = this.sessionService.createSession<
      CustomerSession,
      "customerProfileId"
    >({
      profileId: profile.id,
      profileIdField: "customerProfileId",
      deviceFingerprint: dto.deviceFingerprint,
      ipAddress: clientIp,
      userAgent,
    });
    await this.sessionRepository.create(sessionData);

    const payload: JwtTokenPayload = {
      sub: user.id,
      customerId: profile.id,
      email: user.email,
      type: "customer",
      sessionToken,
      // Populated so the default AuthGuard("jwt") + RolesGuard
      // chain on shared controllers (e.g. BoqController) sees the
      // customer's role. Without this, the customer JWT validates
      // but RolesGuard rejects every @Roles("customer") endpoint
      // with 403 because payload.roles is undefined.
      roles: ["customer"],
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

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
      entityType: "customer_profile",
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: "login",
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
      companyName: profile.company.tradingName || profile.company.legalName || "",
      ipMismatchWarning,
      registeredIp: undefined,
    };
  }

  async issueTokensForAuthenticatedUser(
    user: User,
    clientIp: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; customerId: number }> {
    const profile = await this.profileRepository.findByUserId(user.id, ["company"]);

    if (!profile) {
      throw new UnauthorizedException("Customer profile not found. Please register first.");
    }

    if (!this.authConfigService.isAccountStatusCheckDisabled()) {
      if (profile.accountStatus === CustomerAccountStatus.SUSPENDED) {
        throw new ForbiddenException("Account has been suspended. Please contact support.");
      }
      if (profile.accountStatus === CustomerAccountStatus.DEACTIVATED) {
        throw new ForbiddenException("Account has been deactivated");
      }
    }

    await this.sessionService.invalidateAllSessions(
      this.sessionRepository,
      profile.id,
      "customerProfileId",
      SessionInvalidationReason.NEW_LOGIN,
    );

    const { sessionData, sessionToken } = this.sessionService.createSession<
      CustomerSession,
      "customerProfileId"
    >({
      profileId: profile.id,
      profileIdField: "customerProfileId",
      deviceFingerprint: "passkey",
      ipAddress: clientIp,
      userAgent,
    });
    await this.sessionRepository.create(sessionData);

    const payload: JwtTokenPayload = {
      sub: user.id,
      customerId: profile.id,
      email: user.email,
      type: "customer",
      sessionToken,
      // Populated so the default AuthGuard("jwt") + RolesGuard
      // chain on shared controllers (e.g. BoqController) sees the
      // customer's role. Without this, the customer JWT validates
      // but RolesGuard rejects every @Roles("customer") endpoint
      // with 403 because payload.roles is undefined.
      roles: ["customer"],
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    return { accessToken, refreshToken, customerId: profile.id };
  }

  async logout(sessionToken: string, clientIp: string): Promise<void> {
    const session = await this.sessionService.invalidateSession(
      this.sessionRepository,
      sessionToken,
      SessionInvalidationReason.LOGOUT,
    );

    if (session) {
      await this.auditService.log({
        entityType: "customer_profile",
        entityId: session.customerProfileId,
        action: AuditAction.UPDATE,
        newValues: { event: "logout" },
        ipAddress: clientIp,
      });
    }
  }

  async refreshSession(
    dto: CustomerRefreshTokenDto,
    clientIp: string,
  ): Promise<CustomerLoginResponseDto> {
    try {
      const payload = await this.tokenService.verifyToken<JwtTokenPayload>(dto.refreshToken);

      const profile = await this.profileRepository.findById(payload.customerId as number, [
        "company",
        "deviceBindings",
        "user",
      ]);

      if (!profile) {
        throw new UnauthorizedException("Customer not found");
      }

      if (!this.authConfigService.isDeviceFingerprintDisabled()) {
        const activeBinding = this.deviceBindingService.findPrimaryActiveBinding(
          profile.deviceBindings,
        );
        if (!activeBinding || activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
          throw new UnauthorizedException("Device mismatch");
        }
      }

      if (profile.accountStatus !== CustomerAccountStatus.ACTIVE) {
        throw new ForbiddenException("Account is not active");
      }

      const sessionToken = uuidv4();
      const newPayload: JwtTokenPayload = {
        sub: profile.userId,
        customerId: profile.id,
        email: profile.user.email,
        type: "customer",
        sessionToken,
        roles: ["customer"],
      };

      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(newPayload);

      await this.sessionService.updateSessionToken(
        this.sessionRepository,
        profile.id,
        "customerProfileId",
        sessionToken,
      );

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        customerId: profile.id,
        name: `${profile.firstName} ${profile.lastName}`,
        companyName: profile.company.tradingName || profile.company.legalName || "",
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async verifyDeviceBinding(
    customerId: number,
    deviceFingerprint: string,
  ): Promise<CustomerDeviceBinding | null> {
    return this.deviceBindingService.findBinding(
      this.deviceBindingRepository,
      customerId,
      "customerProfileId",
      deviceFingerprint,
    );
  }

  async verifySession(sessionToken: string): Promise<CustomerSession | null> {
    return this.sessionService.validateSession(this.sessionRepository, sessionToken, [
      "customerProfile",
    ]);
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
    await this.rateLimitingService.logLoginAttempt(this.loginAttemptRepository, {
      profileId: customerProfileId,
      profileIdField: "customerProfileId",
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
    const profile = await this.profileRepository.findByValidEmailVerificationToken(
      token,
      now().toJSDate(),
    );

    if (!profile) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    if (profile.emailVerified) {
      return {
        success: true,
        message: "Email already verified. You can log in.",
      };
    }

    profile.emailVerified = true;
    profile.emailVerificationToken = null;
    profile.emailVerificationExpires = null;
    profile.accountStatus = CustomerAccountStatus.ACTIVE;
    await this.profileRepository.save(profile);

    await this.auditService.log({
      entityType: "customer_profile",
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: "email_verified",
        email: profile.user.email,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: "Email verified successfully. You can now log in.",
    };
  }

  async resendVerificationEmail(
    email: string,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOneByEmailAndScope(email, AppScope.FORGE_CUSTOMER);
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email, a verification link will be sent.",
      };
    }

    const profile = await this.profileRepository.findByUserId(user.id);

    if (!profile) {
      return {
        success: true,
        message: "If an account exists with this email, a verification link will be sent.",
      };
    }

    if (profile.emailVerified) {
      throw new BadRequestException("Email is already verified. You can log in.");
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = now()
      .plus({ hours: AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS })
      .toJSDate();

    profile.emailVerificationToken = emailVerificationToken;
    profile.emailVerificationExpires = emailVerificationExpires;
    await this.profileRepository.save(profile);

    await this.emailService.sendCustomerVerificationEmail(email, emailVerificationToken);

    await this.auditService.log({
      entityType: "customer_profile",
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: "verification_email_resent",
        email,
      },
      ipAddress: clientIp,
    });

    return {
      success: true,
      message: "Verification email sent. Please check your inbox.",
    };
  }

  async validateUploadedDocument(
    file: Express.Multer.File,
    documentType: "vat" | "registration",
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

      const extractedData = await this.documentOcrService.extractDocumentData(file, documentType);

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

      this.logger.log("=== VALIDATION RESPONSE ===");
      this.logger.log(JSON.stringify(response, null, 2));
      this.logger.log("=== END RESPONSE ===");

      return response;
    } catch (error) {
      this.logger.error(`Document validation error: ${error.message}`, error.stack);

      return {
        success: true,
        isValid: false,
        ocrFailed: true,
        requiresManualReview: true,
        allowedToProceed: true,
        mismatches: [],
        extractedData: { success: false, errors: [error.message] },
        message:
          "OCR processing failed. Document will be marked for manual review. You may proceed with registration.",
      };
    }
  }
}
