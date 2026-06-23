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
import { now } from "../lib/datetime";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { TransactionRunner } from "../lib/persistence/transaction-runner";
import { DocumentVerificationService } from "../nix/services/document-verification.service";
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
import { S3StorageService } from "../storage/s3-storage.service";
import { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { UserRoleRepository } from "../user-roles/user-roles.repository";
import { CreateSupplierRegistrationDto, SupplierLoginDto, SupplierLoginResponseDto } from "./dto";
import {
  SupplierAccountStatus,
  SupplierDocument,
  SupplierDocumentType,
  SupplierDocumentValidationStatus,
  SupplierOnboardingStatus,
  SupplierSession,
} from "./entities";
import { SupplierLoginFailureReason } from "./entities/supplier-login-attempt.entity";
import { SupplierSessionInvalidationReason } from "./entities/supplier-session.entity";
import { SupplierDeviceBindingRepository } from "./supplier-device-binding.repository";
import { SupplierDocumentRepository } from "./supplier-document.repository";
import { SupplierLoginAttemptRepository } from "./supplier-login-attempt.repository";
import { SupplierOnboardingRepository } from "./supplier-onboarding.repository";
import { SupplierProfileRepository } from "./supplier-profile.repository";
import { SupplierSessionRepository } from "./supplier-session.repository";

@Injectable()
export class SupplierAuthService {
  private readonly logger = new Logger(SupplierAuthService.name);
  private readonly uploadDir: string;

  constructor(
    private readonly companyRepo: CompanyRepository,
    private readonly profileRepository: SupplierProfileRepository,
    private readonly deviceBindingRepository: SupplierDeviceBindingRepository,
    private readonly loginAttemptRepository: SupplierLoginAttemptRepository,
    private readonly sessionRepository: SupplierSessionRepository,
    private readonly onboardingRepository: SupplierOnboardingRepository,
    private readonly documentRepository: SupplierDocumentRepository,
    private readonly userRepo: UserRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly txRunner: TransactionRunner,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly storageService: S3StorageService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly rateLimitingService: RateLimitingService,
    private readonly sessionService: SessionService,
    private readonly deviceBindingService: DeviceBindingService,
    private readonly authConfigService: AuthConfigService,
    private readonly documentVerificationService: DocumentVerificationService,
    private readonly secureDocumentsService: SecureDocumentsService,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {
    this.uploadDir = this.authConfigService.uploadDir();
  }

  private triggerDocumentVerifications(supplierId: number, documentIds: number[]): void {
    for (const documentId of documentIds) {
      setImmediate(async () => {
        try {
          this.logger.log(`Triggering verification for registration document ${documentId}`);
          await this.documentVerificationService.verifyDocument({
            entityType: "supplier",
            entityId: supplierId,
            documentId,
          });
          this.logger.log(`Verification completed for registration document ${documentId}`);
        } catch (error: any) {
          this.logger.error(
            `Verification failed for registration document ${documentId}: ${error.message}`,
          );
        }
      });
    }
  }

  async register(
    dto: CreateSupplierRegistrationDto,
    clientIp: string,
  ): Promise<SupplierLoginResponseDto> {
    const existingUser = await this.userRepo.findOneByEmailAndScope(
      dto.email,
      AppScope.FORGE_SUPPLIER,
    );
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    const { savedUser, savedProfile } = await this.txRunner.run(async (ctx) => {
      const profileRepo = this.profileRepository.withTransaction(ctx);
      const onboardingRepo = this.onboardingRepository.withTransaction(ctx);
      const userRepo = this.userRepo.withTransaction(ctx);
      const userRoleRepo = this.userRoleRepo.withTransaction(ctx);

      const { passwordHash } = await this.passwordService.hash(dto.password);

      const existingRole = await this.userRoleRepo.findByName("supplier");
      const supplierRole = existingRole ?? (await userRoleRepo.create({ name: "supplier" }));

      const savedUser = await userRepo.create({
        username: dto.email,
        email: dto.email,
        passwordHash,
        appScope: AppScope.FORGE_SUPPLIER,
        roles: [supplierRole],
      });

      const verificationToken = this.tokenService.generateVerificationToken(
        {
          userId: savedUser.id,
          email: dto.email,
          type: "supplier_verification",
        },
        AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS,
      );
      const verificationExpires = now()
        .plus({ hours: AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS })
        .toJSDate();

      const savedProfile = await profileRepo.create({
        userId: savedUser.id,
        accountStatus: SupplierAccountStatus.PENDING,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      });

      await onboardingRepo.create({
        supplierId: savedProfile.id,
        status: SupplierOnboardingStatus.DRAFT,
        companyDetailsComplete: false,
        documentsComplete: false,
      });

      return { savedUser, savedProfile };
    });

    await this.auditService.log({
      entityType: "supplier_profile",
      entityId: savedProfile.id,
      action: AuditAction.CREATE,
      newValues: {
        email: dto.email,
        emailVerified: false,
      },
      ipAddress: clientIp,
    });

    const { sessionData, sessionToken } = this.sessionService.createSession<
      SupplierSession,
      "supplierProfileId"
    >({
      profileId: savedProfile.id,
      profileIdField: "supplierProfileId",
      deviceFingerprint: "registration-device",
      ipAddress: clientIp,
      userAgent: "registration",
    });

    await this.deviceBindingRepository.create({
      supplierProfileId: savedProfile.id,
      deviceFingerprint: "registration-device",
      registeredIp: clientIp,
      isPrimary: true,
      isActive: true,
    });
    await this.sessionRepository.create(sessionData);

    const payload: JwtTokenPayload = {
      sub: savedUser.id,
      supplierId: savedProfile.id,
      email: savedUser.email,
      type: "supplier",
      sessionToken,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    return {
      accessToken,
      refreshToken,
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
  }

  async registerFull(
    dto: {
      email: string;
      password: string;
      deviceFingerprint: string;
      browserInfo?: Record<string, any>;
      termsAccepted?: boolean;
      securityPolicyAccepted?: boolean;
      documentStorageAccepted?: boolean;
      company: any;
      profile: any;
      documentVerificationResults?: {
        vat?: any;
        registration?: any;
        bee?: any;
      };
    },
    clientIp: string,
    userAgent: string,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
    beeDocument?: Express.Multer.File,
  ): Promise<SupplierLoginResponseDto> {
    const existingUser = await this.userRepo.findOneByEmailAndScope(
      dto.email,
      AppScope.FORGE_SUPPLIER,
    );
    if (existingUser) {
      throw new ConflictException("An account with this email already exists");
    }

    if (dto.company?.registrationNumber) {
      const existingCompany = await this.companyRepo.findByRegistrationNumber(
        dto.company.registrationNumber,
      );
      if (existingCompany) {
        throw new ConflictException("A company with this registration number already exists");
      }
    }

    const { savedCompany, savedProfile, savedUser, documentIdsNeedingVerification } =
      await this.txRunner.run(async (ctx) => {
        const profileRepo = this.profileRepository.withTransaction(ctx);
        const onboardingRepo = this.onboardingRepository.withTransaction(ctx);
        const deviceBindingRepo = this.deviceBindingRepository.withTransaction(ctx);
        const userRepo = this.userRepo.withTransaction(ctx);
        const userRoleRepo = this.userRoleRepo.withTransaction(ctx);
        const companyRepo = this.companyRepo.withTransaction(ctx);

        const savedCompany = await companyRepo.create({
          name: dto.company.legalName,
          companyType: CompanyType.SUPPLIER,
          legalName: dto.company.legalName,
          tradingName: dto.company.tradingName,
          registrationNumber: dto.company.registrationNumber,
          vatNumber: dto.company.vatNumber,
          streetAddress: dto.company.streetAddress,
          city: dto.company.city,
          province: dto.company.provinceState,
          postalCode: dto.company.postalCode,
          country: dto.company.country || "South Africa",
          phone: dto.company.primaryPhone || dto.company.primaryContactPhone,
          contactPerson: dto.company.primaryContactName,
          email: dto.company.generalEmail || dto.company.primaryContactEmail,
          websiteUrl: dto.company.website,
          industry: dto.company.industryType,
          companySize: dto.company.companySize,
          beeLevel: dto.company.beeLevel,
          beeCertificateExpiry: dto.company.beeCertificateExpiry,
          beeVerificationAgency: dto.company.beeVerificationAgency,
          isExemptMicroEnterprise: dto.company.isExemptMicroEnterprise || false,
        });

        const { passwordHash } = await this.passwordService.hash(dto.password);

        const existingRole = await this.userRoleRepo.findByName("supplier");
        const supplierRole = existingRole ?? (await userRoleRepo.create({ name: "supplier" }));

        const savedUser = await userRepo.create({
          username: dto.email,
          email: dto.email,
          passwordHash,
          appScope: AppScope.FORGE_SUPPLIER,
          roles: [supplierRole],
        });

        const savedProfile = await profileRepo.create({
          userId: savedUser.id,
          companyId: savedCompany.id,
          firstName: dto.profile?.firstName,
          lastName: dto.profile?.lastName,
          jobTitle: dto.profile?.jobTitle,
          directPhone: dto.profile?.directPhone,
          mobilePhone: dto.profile?.mobilePhone,
          accountStatus: SupplierAccountStatus.PENDING,
          emailVerified: true,
          termsAcceptedAt: dto.termsAccepted ? now().toJSDate() : null,
          securityPolicyAcceptedAt: dto.securityPolicyAccepted ? now().toJSDate() : null,
          documentStorageAcceptedAt: dto.documentStorageAccepted ? now().toJSDate() : null,
        });

        const documentsComplete = !!(vatDocument && companyRegDocument);
        const documentsNeedReview = this.documentsNeedManualReview(dto.documentVerificationResults);
        await onboardingRepo.create({
          supplierId: savedProfile.id,
          status: SupplierOnboardingStatus.DRAFT,
          companyDetailsComplete: true,
          documentsComplete,
          documentsNeedReview,
        });

        let documentIdsNeedingVerification: number[] = [];
        if (vatDocument || companyRegDocument || beeDocument) {
          documentIdsNeedingVerification = await this.saveRegistrationDocuments(
            ctx,
            savedProfile.id,
            vatDocument,
            companyRegDocument,
            beeDocument,
            dto.documentVerificationResults,
          );
        }

        await deviceBindingRepo.create({
          supplierProfileId: savedProfile.id,
          deviceFingerprint: dto.deviceFingerprint,
          registeredIp: clientIp,
          browserInfo: dto.browserInfo,
          isPrimary: true,
          isActive: true,
        });

        return { savedCompany, savedProfile, savedUser, documentIdsNeedingVerification };
      });

    await this.auditService.log({
      entityType: "supplier_profile",
      entityId: savedProfile.id,
      action: AuditAction.CREATE,
      newValues: {
        email: dto.email,
        companyName: dto.company.legalName,
        deviceFingerprint: `${dto.deviceFingerprint?.substring(0, 20)}...`,
      },
      ipAddress: clientIp,
      userAgent,
    });

    await this.secureDocumentsService.createEntityFolder(
      "supplier",
      savedProfile.id,
      savedCompany.tradingName || savedCompany.legalName || "",
    );

    if (documentIdsNeedingVerification.length > 0) {
      this.triggerDocumentVerifications(savedProfile.id, documentIdsNeedingVerification);
    }

    const { sessionData, sessionToken } = this.sessionService.createSession<
      SupplierSession,
      "supplierProfileId"
    >({
      profileId: savedProfile.id,
      profileIdField: "supplierProfileId",
      deviceFingerprint: dto.deviceFingerprint,
      ipAddress: clientIp,
      userAgent,
    });
    await this.sessionRepository.create(sessionData);

    const payload: JwtTokenPayload = {
      sub: savedUser.id,
      supplierId: savedProfile.id,
      email: savedUser.email,
      type: "supplier",
      sessionToken,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      supplier: {
        id: savedProfile.id,
        email: savedUser.email,
        firstName: savedProfile.firstName,
        lastName: savedProfile.lastName,
        companyName: savedCompany.tradingName || savedCompany.legalName || undefined,
        accountStatus: savedProfile.accountStatus,
        onboardingStatus: SupplierOnboardingStatus.DRAFT,
      },
    };
  }

  private async saveRegistrationDocuments(
    ctx: TransactionContext,
    supplierId: number,
    vatDocument?: Express.Multer.File,
    companyRegDocument?: Express.Multer.File,
    beeDocument?: Express.Multer.File,
    verificationResults?: { vat?: any; registration?: any; bee?: any },
  ): Promise<number[]> {
    const documentRepo = this.documentRepository.withTransaction(ctx);
    const subPath = `suppliers/${supplierId}/documents`;
    const idsNeedingVerification: number[] = [];

    if (vatDocument) {
      const storageResult = await this.storageService.upload(vatDocument, subPath);

      const vatVerification = verificationResults?.vat;
      const saved = await documentRepo.create({
        supplierId,
        documentType: SupplierDocumentType.VAT_CERT,
        fileName: vatDocument.originalname,
        filePath: storageResult.path,
        fileSize: vatDocument.size,
        mimeType: vatDocument.mimetype,
        validationStatus: this.determineValidationStatus(vatVerification),
        isRequired: true,
        ...this.extractVerificationFields(vatVerification),
      });
      if (!vatVerification) {
        idsNeedingVerification.push(saved.id);
      }
    }

    if (companyRegDocument) {
      const storageResult = await this.storageService.upload(companyRegDocument, subPath);

      const regVerification = verificationResults?.registration;
      const saved = await documentRepo.create({
        supplierId,
        documentType: SupplierDocumentType.REGISTRATION_CERT,
        fileName: companyRegDocument.originalname,
        filePath: storageResult.path,
        fileSize: companyRegDocument.size,
        mimeType: companyRegDocument.mimetype,
        validationStatus: this.determineValidationStatus(regVerification),
        isRequired: true,
        ...this.extractVerificationFields(regVerification),
      });
      if (!regVerification) {
        idsNeedingVerification.push(saved.id);
      }
    }

    if (beeDocument) {
      const storageResult = await this.storageService.upload(beeDocument, subPath);

      const beeVerification = verificationResults?.bee;
      const saved = await documentRepo.create({
        supplierId,
        documentType: SupplierDocumentType.BEE_CERT,
        fileName: beeDocument.originalname,
        filePath: storageResult.path,
        fileSize: beeDocument.size,
        mimeType: beeDocument.mimetype,
        validationStatus: this.determineValidationStatus(beeVerification),
        isRequired: false,
        ...this.extractVerificationFields(beeVerification),
      });
      if (!beeVerification) {
        idsNeedingVerification.push(saved.id);
      }
    }

    return idsNeedingVerification;
  }

  private documentsNeedManualReview(verificationResults?: {
    vat?: any;
    registration?: any;
    bee?: any;
  }): boolean {
    if (!verificationResults) {
      return false;
    }
    return [verificationResults.vat, verificationResults.registration, verificationResults.bee]
      .filter(Boolean)
      .some(
        (result) =>
          this.determineValidationStatus(result) === SupplierDocumentValidationStatus.MANUAL_REVIEW,
      );
  }

  private determineValidationStatus(verificationResult: any): SupplierDocumentValidationStatus {
    if (!verificationResult) {
      return SupplierDocumentValidationStatus.PENDING;
    }
    if (verificationResult.allFieldsMatch && verificationResult.overallConfidence >= 0.7) {
      return SupplierDocumentValidationStatus.VALID;
    }
    return SupplierDocumentValidationStatus.MANUAL_REVIEW;
  }

  private extractVerificationFields(verificationResult: any): Partial<SupplierDocument> {
    if (!verificationResult) {
      return {};
    }

    return {
      ocrExtractedData: verificationResult.extractedData
        ? {
            vatNumber: verificationResult.extractedData.vatNumber,
            registrationNumber: verificationResult.extractedData.registrationNumber,
            companyName: verificationResult.extractedData.companyName,
            streetAddress: verificationResult.extractedData.streetAddress,
            city: verificationResult.extractedData.city,
            provinceState: verificationResult.extractedData.provinceState,
            postalCode: verificationResult.extractedData.postalCode,
            beeLevel: verificationResult.extractedData.beeLevel,
            beeExpiryDate: verificationResult.extractedData.beeExpiryDate,
            rawText: verificationResult.extractedData.rawText,
            confidence: String(verificationResult.overallConfidence ?? 0),
          }
        : null,
      ocrProcessedAt: now().toJSDate(),
      ocrFailed: !verificationResult.success,
      verificationConfidence: verificationResult.overallConfidence ?? 0,
      allFieldsMatch: verificationResult.allFieldsMatch ?? false,
      fieldResults:
        verificationResult.fieldResults?.map((fr: any) => ({
          fieldName: fr.field,
          expected: String(fr.expected ?? ""),
          extracted: String(fr.extracted ?? ""),
          matches: fr.match,
          similarity: fr.similarity ?? (fr.match ? 100 : 0),
        })) ?? null,
    };
  }

  async verifyEmail(
    token: string,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payload = await this.tokenService.verifyToken<{
        userId: number;
        email: string;
        type: string;
      }>(token);

      if (payload.type !== "supplier_verification") {
        throw new BadRequestException("Invalid verification token");
      }

      const profile = await this.profileRepository.findByUserIdAndVerificationToken(
        payload.userId,
        token,
      );

      if (!profile) {
        throw new BadRequestException("Invalid or expired verification token");
      }

      if (profile.emailVerified) {
        return {
          success: true,
          message: "Email already verified. You can now log in.",
        };
      }

      if (profile.emailVerificationExpires && now().toJSDate() > profile.emailVerificationExpires) {
        throw new BadRequestException("Verification token has expired. Please request a new one.");
      }

      profile.emailVerified = true;
      profile.emailVerificationToken = null;
      profile.emailVerificationExpires = null;
      await this.profileRepository.save(profile);

      await this.auditService.log({
        entityType: "supplier_profile",
        entityId: profile.id,
        action: AuditAction.UPDATE,
        newValues: { emailVerified: true },
        ipAddress: clientIp,
      });

      return {
        success: true,
        message: "Email verified successfully. You can now log in and complete your onboarding.",
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Invalid or expired verification token");
    }
  }

  async resendVerificationEmail(
    email: string,
    clientIp: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepo.findOneByEmailAndScope(email, AppScope.FORGE_SUPPLIER);
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
      };
    }

    const profile = await this.profileRepository.findByUserId(user.id);
    if (!profile) {
      return {
        success: true,
        message: "If an account exists with this email, a verification link has been sent.",
      };
    }

    if (profile.emailVerified) {
      throw new BadRequestException("Email is already verified");
    }

    const verificationToken = this.tokenService.generateVerificationToken(
      { userId: user.id, email, type: "supplier_verification" },
      AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS,
    );
    const verificationExpires = now()
      .plus({ hours: AUTH_CONSTANTS.EMAIL_VERIFICATION_EXPIRY_HOURS })
      .toJSDate();

    profile.emailVerificationToken = verificationToken;
    profile.emailVerificationExpires = verificationExpires;
    await this.profileRepository.save(profile);

    await this.emailService.sendSupplierVerificationEmail(email, verificationToken);

    return {
      success: true,
      message: "Verification email sent. Please check your inbox.",
    };
  }

  async login(
    dto: SupplierLoginDto,
    clientIp: string,
    userAgent: string,
  ): Promise<SupplierLoginResponseDto> {
    await this.rateLimitingService.checkLoginAttempts(this.loginAttemptRepository, dto.email);

    const user = await this.userRepo.findByEmailWithRolesAndScope(
      dto.email,
      AppScope.FORGE_SUPPLIER,
    );

    if (!user) {
      await this.logLoginAttempt(
        null,
        dto.email,
        false,
        SupplierLoginFailureReason.INVALID_CREDENTIALS,
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
          SupplierLoginFailureReason.INVALID_CREDENTIALS,
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
      "onboarding",
    ]);

    if (!profile) {
      const userRoles = user.roles?.map((r) => r.name) || [];
      this.logger.warn(
        `Supplier login failed: User ${dto.email} (ID: ${user.id}) has no supplier profile. Roles: ${userRoles.join(", ")}`,
      );

      if (userRoles.includes("customer")) {
        throw new UnauthorizedException(
          "This account is registered as a customer. Please use the customer portal to login.",
        );
      }
      if (userRoles.includes("admin") || userRoles.includes("superadmin")) {
        throw new UnauthorizedException(
          "This account is registered as an administrator. Please use the admin portal to login.",
        );
      }

      throw new UnauthorizedException(
        "Supplier profile not found. Your registration may not have completed. Please try registering again or contact support.",
      );
    }

    const requireVerification = await this.featureFlagsService.isEnabled(
      "REQUIRE_SUPPLIER_EMAIL_VERIFICATION",
    );
    const disabledByEnv = this.authConfigService.isEmailVerificationDisabled();
    if (!disabledByEnv && requireVerification && !profile.emailVerified) {
      await this.logLoginAttempt(
        profile.id,
        dto.email,
        false,
        SupplierLoginFailureReason.EMAIL_NOT_VERIFIED,
        dto.deviceFingerprint,
        clientIp,
        userAgent,
      );
      throw new ForbiddenException("Please verify your email before logging in");
    }

    if (!this.authConfigService.isAccountStatusCheckDisabled()) {
      if (profile.accountStatus === SupplierAccountStatus.SUSPENDED) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          SupplierLoginFailureReason.ACCOUNT_SUSPENDED,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );
        throw new ForbiddenException("Account has been suspended. Please contact support.");
      }

      if (profile.accountStatus === SupplierAccountStatus.DEACTIVATED) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          SupplierLoginFailureReason.ACCOUNT_DEACTIVATED,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );
        throw new ForbiddenException("Account has been deactivated");
      }
    }

    let ipMismatchWarning = false;
    let activeBinding = this.deviceBindingService.findPrimaryActiveBinding(profile.deviceBindings);

    if (!this.authConfigService.isDeviceFingerprintDisabled()) {
      if (!activeBinding) {
        activeBinding = await this.deviceBindingRepository.create({
          supplierProfileId: profile.id,
          deviceFingerprint: dto.deviceFingerprint,
          registeredIp: clientIp,
          browserInfo: dto.browserInfo,
          isPrimary: true,
          isActive: true,
        });
        this.logger.log(`Created device binding for supplier ${profile.id}`);
      } else if (activeBinding.deviceFingerprint !== dto.deviceFingerprint) {
        await this.logLoginAttempt(
          profile.id,
          dto.email,
          false,
          SupplierLoginFailureReason.DEVICE_MISMATCH,
          dto.deviceFingerprint,
          clientIp,
          userAgent,
        );

        await this.auditService.log({
          entityType: "supplier_profile",
          entityId: profile.id,
          action: AuditAction.REJECT,
          newValues: {
            reason: "device_mismatch",
            attemptedFingerprint: `${dto.deviceFingerprint.substring(0, 20)}...`,
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
      "supplierProfileId",
      SupplierSessionInvalidationReason.NEW_LOGIN,
    );

    const { sessionData, sessionToken } = this.sessionService.createSession<
      SupplierSession,
      "supplierProfileId"
    >({
      profileId: profile.id,
      profileIdField: "supplierProfileId",
      deviceFingerprint: dto.deviceFingerprint,
      ipAddress: clientIp,
      userAgent,
    });
    await this.sessionRepository.create(sessionData);

    const payload: JwtTokenPayload = {
      sub: user.id,
      supplierId: profile.id,
      email: user.email,
      type: "supplier",
      sessionToken,
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
      entityType: "supplier_profile",
      entityId: profile.id,
      action: AuditAction.UPDATE,
      newValues: {
        event: "login",
        ipMismatchWarning,
      },
      ipAddress: clientIp,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      supplier: {
        id: profile.id,
        email: user.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        companyName: profile.company?.tradingName || profile.company?.legalName || undefined,
        accountStatus: profile.accountStatus,
        onboardingStatus: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
      },
    };
  }

  async issueTokensForAuthenticatedUser(
    user: User,
    clientIp: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; supplierId: number }> {
    const profile = await this.profileRepository.findByUserId(user.id, ["company"]);

    if (!profile) {
      throw new UnauthorizedException("Supplier profile not found. Please register first.");
    }

    if (!this.authConfigService.isAccountStatusCheckDisabled()) {
      if (profile.accountStatus === SupplierAccountStatus.SUSPENDED) {
        throw new ForbiddenException("Account has been suspended. Please contact support.");
      }
      if (profile.accountStatus === SupplierAccountStatus.DEACTIVATED) {
        throw new ForbiddenException("Account has been deactivated");
      }
    }

    await this.sessionService.invalidateAllSessions(
      this.sessionRepository,
      profile.id,
      "supplierProfileId",
      SupplierSessionInvalidationReason.NEW_LOGIN,
    );

    const { sessionData, sessionToken } = this.sessionService.createSession<
      SupplierSession,
      "supplierProfileId"
    >({
      profileId: profile.id,
      profileIdField: "supplierProfileId",
      deviceFingerprint: "passkey",
      ipAddress: clientIp,
      userAgent,
    });
    await this.sessionRepository.create(sessionData);

    const payload: JwtTokenPayload = {
      sub: user.id,
      supplierId: profile.id,
      email: user.email,
      type: "supplier",
      sessionToken,
    };

    const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(payload);

    return { accessToken, refreshToken, supplierId: profile.id };
  }

  async logout(sessionToken: string, clientIp: string): Promise<void> {
    const session = await this.sessionService.invalidateSession(
      this.sessionRepository,
      sessionToken,
      SupplierSessionInvalidationReason.LOGOUT,
    );

    if (session) {
      await this.auditService.log({
        entityType: "supplier_profile",
        entityId: session.supplierProfileId,
        action: AuditAction.UPDATE,
        newValues: { event: "logout" },
        ipAddress: clientIp,
      });
    }
  }

  async refreshSession(
    refreshToken: string,
    deviceFingerprint: string,
    clientIp: string,
  ): Promise<SupplierLoginResponseDto> {
    try {
      const payload = await this.tokenService.verifyToken<JwtTokenPayload>(refreshToken);

      const profile = await this.profileRepository.findByIdForRefresh(payload.supplierId);

      if (!profile) {
        throw new UnauthorizedException("Supplier not found");
      }

      if (!this.authConfigService.isDeviceFingerprintDisabled()) {
        const activeBinding = this.deviceBindingService.findPrimaryActiveBinding(
          profile.deviceBindings,
        );
        if (!activeBinding || activeBinding.deviceFingerprint !== deviceFingerprint) {
          throw new UnauthorizedException("Device mismatch");
        }
      }

      if (
        profile.accountStatus !== SupplierAccountStatus.PENDING &&
        profile.accountStatus !== SupplierAccountStatus.ACTIVE
      ) {
        throw new ForbiddenException("Account is not active");
      }

      const sessionToken = uuidv4();
      const newPayload: JwtTokenPayload = {
        sub: profile.userId,
        supplierId: profile.id,
        email: profile.user.email,
        type: "supplier",
        sessionToken,
      };

      const { accessToken, refreshToken: newRefreshToken } =
        await this.tokenService.generateTokenPair(newPayload);

      await this.sessionService.updateSessionToken(
        this.sessionRepository,
        profile.id,
        "supplierProfileId",
        sessionToken,
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
          companyName: profile.company?.tradingName || profile.company?.legalName || undefined,
          accountStatus: profile.accountStatus,
          onboardingStatus: profile.onboarding?.status || SupplierOnboardingStatus.DRAFT,
        },
      };
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async verifySession(sessionToken: string): Promise<SupplierSession | null> {
    return this.sessionService.validateSession(this.sessionRepository, sessionToken, [
      "supplierProfile",
    ]);
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
    await this.rateLimitingService.logLoginAttempt(this.loginAttemptRepository, {
      profileId: supplierProfileId,
      profileIdField: "supplierProfileId",
      email,
      success,
      failureReason,
      deviceFingerprint,
      ipAddress,
      userAgent,
      ipMismatchWarning,
    });
  }
}
