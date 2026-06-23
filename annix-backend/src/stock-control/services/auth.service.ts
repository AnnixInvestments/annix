import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { AppScope } from "../../rbac/app-scope";
import { AppRepository, UserAppAccessRepository } from "../../rbac/rbac.repository";
import { PasswordService } from "../../shared/auth/password.service";
import { S3StorageService } from "../../storage/s3-storage.service";
import { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import { CompleteOnboardingDto } from "../dto/complete-onboarding.dto";
import { UpdateCompanyDetailsDto } from "../dto/update-company-details.dto";
import { AdminTransferStatus } from "../entities/stock-control-admin-transfer.entity";
import { BrandingType } from "../entities/stock-control-company.entity";
import { StockControlInvitationStatus } from "../entities/stock-control-invitation.entity";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlRole } from "../entities/stock-control-user.entity";
import { PushSubscriptionRepository } from "../repositories/push-subscription.repository";
import { StaffMemberRepository } from "../repositories/staff-member.repository";
import { StockControlAdminTransferRepository } from "../repositories/stock-control-admin-transfer.repository";
import { StockControlCompanyRepository } from "../repositories/stock-control-company.repository";
import { StockControlInvitationRepository } from "../repositories/stock-control-invitation.repository";
import { StockControlProfileRepository } from "../repositories/stock-control-profile.repository";
import { StockControlUserRepository } from "../repositories/stock-control-user.repository";
import { UserLocationAssignmentRepository } from "../repositories/user-location-assignment.repository";
import { WorkflowNotificationRepository } from "../repositories/workflow-notification.repository";
import { WorkflowStepAssignmentRepository } from "../repositories/workflow-step-assignment.repository";
import { CompanyRoleService } from "./company-role.service";
import { PublicBrandingService } from "./public-branding.service";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class StockControlAuthService {
  private readonly logger = new Logger(StockControlAuthService.name);
  private readonly storageType: string;

  constructor(
    private readonly userRepo: StockControlUserRepository,
    private readonly companyRepo: StockControlCompanyRepository,
    private readonly invitationRepo: StockControlInvitationRepository,
    private readonly adminTransferRepo: StockControlAdminTransferRepository,
    private readonly staffRepo: StaffMemberRepository,
    private readonly pushSubscriptionRepo: PushSubscriptionRepository,
    private readonly unifiedUserRepo: UserRepository,
    private readonly profileRepo: StockControlProfileRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly s3StorageService: S3StorageService,
    private readonly configService: ConfigService,
    private readonly publicBrandingService: PublicBrandingService,
    private readonly companyRoleService: CompanyRoleService,
    private readonly passwordService: PasswordService,
    private readonly appRepo: AppRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly userLocationAssignmentRepo: UserLocationAssignmentRepository,
    private readonly workflowStepAssignmentRepo: WorkflowStepAssignmentRepository,
    private readonly workflowNotificationRepo: WorkflowNotificationRepository,
  ) {
    this.storageType = this.configService.get<string>("STORAGE_TYPE") || "local";
  }

  private async resolveStorageUrl(path: string | null): Promise<string | null> {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (this.storageType === "s3") {
      return await this.s3StorageService.presignedUrl(path, 86400);
    }
    return path;
  }

  async register(
    email: string,
    password: string,
    name: string,
    companyName?: string,
    invitationToken?: string,
  ) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.userRepo.findOneByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const { companyId, role, isInvitedUser } = await (async () => {
      if (invitationToken) {
        const invitation = await this.invitationRepo.findOneByTokenAndStatus(
          invitationToken,
          StockControlInvitationStatus.PENDING,
        );

        if (!invitation) {
          throw new BadRequestException("Invalid or expired invitation token");
        }

        if (now().toJSDate() > invitation.expiresAt) {
          invitation.status = StockControlInvitationStatus.EXPIRED;
          await this.invitationRepo.saveForCompany(invitation.companyId, invitation);
          throw new BadRequestException("Invitation has expired");
        }

        invitation.status = StockControlInvitationStatus.ACCEPTED;
        invitation.acceptedAt = now().toJSDate();
        await this.invitationRepo.saveForCompany(invitation.companyId, invitation);

        return {
          companyId: invitation.companyId,
          role: invitation.role as StockControlRole,
          isInvitedUser: true,
        };
      }

      const pendingInvitation = await this.invitationRepo.findOneByEmailAndStatus(
        normalizedEmail,
        StockControlInvitationStatus.PENDING,
      );

      if (pendingInvitation) {
        pendingInvitation.status = StockControlInvitationStatus.ACCEPTED;
        pendingInvitation.acceptedAt = now().toJSDate();
        await this.invitationRepo.saveForCompany(pendingInvitation.companyId, pendingInvitation);

        return {
          companyId: pendingInvitation.companyId,
          role: pendingInvitation.role as StockControlRole,
          isInvitedUser: true,
        };
      }

      const savedCompany = await this.companyRepo.create({
        name: companyName || `${name} Company`,
      });
      return {
        companyId: savedCompany.id,
        role: StockControlRole.ADMIN as StockControlRole,
        isInvitedUser: false,
      };
    })();

    const saved = await this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      name,
      role,
      companyId,
      emailVerified: true,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    await this.dualWriteUnifiedUser(
      normalizedEmail,
      passwordHash,
      name,
      verificationToken,
      verificationExpires,
    );

    await this.emailService.sendStockControlVerificationEmail(normalizedEmail, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        role: saved.role,
      },
      isInvitedUser,
    };
  }

  async verifyEmail(token: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findOneByEmailVerificationToken(token);

    if (!user) {
      throw new BadRequestException(
        "Invalid or expired verification link. Please request a new one.",
      );
    }

    const isInvitedUser = user.role !== StockControlRole.ADMIN;

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepo.saveForCompany(user.companyId, user);

    await this.unifiedUserRepo.updateByEmailCaseInsensitiveAndScope(
      user.email,
      AppScope.STOCK_CONTROL,
      {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: "active",
      },
    );

    const result: Record<string, unknown> = {
      message: "Email verified successfully. You can now sign in.",
      userId: user.id,
      email: user.email,
      needsBranding: !isInvitedUser,
    };

    if (!isInvitedUser) {
      // Issue unified JWT tokens for auto-login after verification
      const unifiedUser = await this.unifiedUserRepo.findOneByEmailAndScope(
        user.email,
        AppScope.STOCK_CONTROL,
      );
      const profile = unifiedUser ? await this.profileRepo.findOneByUserId(unifiedUser.id) : null;
      if (unifiedUser && profile) {
        const tokens = this.generateTokens(unifiedUser, profile, user.role);
        result.accessToken = tokens.accessToken;
        result.refreshToken = tokens.refreshToken;
      }
    }

    return result;
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOneByEmailCaseInsensitive(email.trim());

    if (!user) {
      throw new NotFoundException("No account found with this email address.");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified. Please sign in.");
    }

    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await this.userRepo.saveForCompany(user.companyId, user);

    await this.unifiedUserRepo.updateByEmailCaseInsensitiveAndScope(
      user.email,
      AppScope.STOCK_CONTROL,
      {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    );

    await this.emailService.sendStockControlVerificationEmail(email, verificationToken);

    return { message: "Verification email resent. Please check your inbox." };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOneByEmailCaseInsensitive(email.trim());

    if (user?.emailVerified) {
      const resetToken = uuidv4();
      const resetExpires = now().plus({ hours: 1 }).toJSDate();

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await this.userRepo.saveForCompany(user.companyId, user);

      await this.unifiedUserRepo.updateByEmailCaseInsensitiveAndScope(
        user.email,
        AppScope.STOCK_CONTROL,
        {
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        },
      );

      await this.emailService.sendStockControlPasswordResetEmail(email, resetToken);
    }

    return {
      message: "If an account exists with that email, a password reset link has been sent.",
    };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOneByResetToken(token);

    if (!user) {
      throw new BadRequestException("Invalid or expired reset link. Please request a new one.");
    }

    const newHash = await this.passwordService.hashSimple(password);
    user.passwordHash = newHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.saveForCompany(user.companyId, user);

    await this.unifiedUserRepo.updateByEmailCaseInsensitiveAndScope(
      user.email,
      AppScope.STOCK_CONTROL,
      {
        passwordHash: newHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    );

    return { message: "Password reset successfully. You can now sign in with your new password." };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Look up the unified User for password verification
    const unifiedUser = await this.unifiedUserRepo.findOneByEmailAndScope(
      normalizedEmail,
      AppScope.STOCK_CONTROL,
    );
    if (!unifiedUser) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await this.passwordService.verify(password, unifiedUser.passwordHash || "");
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Get the SC profile for company and role info
    const profile = await this.profileRepo.findOneByUserId(unifiedUser.id);
    if (!profile) {
      throw new UnauthorizedException("No Stock Control profile found");
    }

    // Resolve role from legacy SC user (until roles migrate to RBAC)
    const scUser = profile.legacyScUserId
      ? await this.userRepo.findOneForCompany(profile.legacyScUserId, profile.companyId)
      : null;
    const role = scUser?.role || StockControlRole.STOREMAN;

    unifiedUser.lastLoginAt = now().toJSDate();
    if (!unifiedUser.emailVerified) {
      unifiedUser.emailVerified = true;
    }
    await this.unifiedUserRepo.save(unifiedUser);

    const tokens = this.generateTokens(unifiedUser, profile, role);
    const name =
      [unifiedUser.firstName, unifiedUser.lastName].filter(Boolean).join(" ") || unifiedUser.email;
    return {
      ...tokens,
      user: {
        id: unifiedUser.id,
        email: unifiedUser.email,
        name,
        role,
      },
    };
  }

  async currentUser(unifiedUserId: number) {
    const profile = await this.profileRepo.findOneByUserIdWithRelations(unifiedUserId, [
      "user",
      "company",
    ]);
    if (!profile) {
      throw new UnauthorizedException("User not found");
    }

    const unifiedUser = profile.user;
    const company = profile.company;

    // Resolve role from legacy SC user (until roles migrate to RBAC)
    const scUser = profile.legacyScUserId
      ? await this.userRepo.findOneForCompany(profile.legacyScUserId, profile.companyId)
      : null;
    const role = scUser?.role || StockControlRole.STOREMAN;

    const [logoUrl, heroImageUrl] = await Promise.all([
      this.resolveStorageUrl(company?.logoUrl ?? null),
      this.resolveStorageUrl(company?.heroImageUrl ?? null),
    ]);

    const name =
      [unifiedUser.firstName, unifiedUser.lastName].filter(Boolean).join(" ") || unifiedUser.email;

    return {
      id: unifiedUser.id,
      email: unifiedUser.email,
      name,
      role,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      tradingName: company?.tradingName ?? null,
      legalName: company?.legalName ?? null,
      onboardingComplete: company?.onboardingComplete ?? true,
      brandingType: company?.brandingType ?? BrandingType.ANNIX,
      primaryColor: company?.primaryColor ?? null,
      accentColor: company?.accentColor ?? null,
      logoUrl,
      heroImageUrl,
      registrationNumber: company?.registrationNumber ?? null,
      vatNumber: company?.vatNumber ?? null,
      streetAddress: company?.streetAddress ?? null,
      city: company?.city ?? null,
      province: company?.province ?? null,
      postalCode: company?.postalCode ?? null,
      phone: company?.phone ?? null,
      companyEmail: company?.email ?? null,
      websiteUrl: company?.websiteUrl ?? null,
      pipingLossFactorPct: company?.pipingLossFactorPct ?? 45,
      flatPlateLossFactorPct: company?.flatPlateLossFactorPct ?? 20,
      structuralSteelLossFactorPct: company?.structuralSteelLossFactorPct ?? 30,
      qcEnabled: company?.qcEnabled ?? false,
      messagingEnabled: company?.messagingEnabled ?? false,
      staffLeaveEnabled: company?.staffLeaveEnabled ?? false,
      workflowEnabled: company?.workflowEnabled ?? true,
      notificationsEnabled: (company as any)?.notificationsEnabled ?? true,
      linkedStaffId: profile.linkedStaffId ?? null,
      createdAt: unifiedUser.createdAt,
      companyUpdatedAt: company?.updatedAt ?? null,
      hideTooltips: profile.hideTooltips ?? false,
      emailNotificationsEnabled: profile.emailNotificationsEnabled ?? true,
      pushNotificationsEnabled: profile.pushNotificationsEnabled ?? true,
    };
  }

  async updateLinkedStaff(
    unifiedUserId: number,
    unifiedCompanyId: number,
    linkedStaffId: number | null,
  ): Promise<{ linkedStaffId: number | null }> {
    if (linkedStaffId !== null) {
      const staff = await this.staffRepo.findActiveByIdForUnifiedCompany(
        linkedStaffId,
        unifiedCompanyId,
      );
      if (!staff) {
        throw new NotFoundException("Staff member not found or inactive");
      }
    }

    await this.profileRepo.updateByUserId(unifiedUserId, { linkedStaffId });
    return { linkedStaffId };
  }

  async updateTooltipPreference(
    unifiedUserId: number,
    hideTooltips: boolean,
  ): Promise<{ hideTooltips: boolean }> {
    await this.profileRepo.updateByUserId(unifiedUserId, { hideTooltips });
    return { hideTooltips };
  }

  async updateNotificationPreferences(
    unifiedUserId: number,
    prefs: { emailNotificationsEnabled?: boolean; pushNotificationsEnabled?: boolean },
  ): Promise<{ emailNotificationsEnabled: boolean; pushNotificationsEnabled: boolean }> {
    const updates: Record<string, boolean> = {};
    if (prefs.emailNotificationsEnabled !== undefined) {
      updates.emailNotificationsEnabled = prefs.emailNotificationsEnabled;
    }
    if (prefs.pushNotificationsEnabled !== undefined) {
      updates.pushNotificationsEnabled = prefs.pushNotificationsEnabled;
    }
    await this.profileRepo.updateByUserId(unifiedUserId, updates);
    const profile = await this.profileRepo.findOneOrFailByUserId(unifiedUserId);
    return {
      emailNotificationsEnabled: profile.emailNotificationsEnabled,
      pushNotificationsEnabled: profile.pushNotificationsEnabled,
    };
  }

  async refreshToken(refreshTokenStr: string) {
    try {
      const payload = this.jwtService.verify(refreshTokenStr);
      if (payload.tokenType !== "refresh") {
        throw new UnauthorizedException("Invalid token type");
      }

      // payload.sub is now unified User.id
      const unifiedUser = await this.unifiedUserRepo.findById(payload.sub);
      if (!unifiedUser) {
        throw new UnauthorizedException("User not found");
      }

      const profile = await this.profileRepo.findOneByUserId(unifiedUser.id);
      if (!profile) {
        throw new UnauthorizedException("No Stock Control profile found");
      }

      const scUser = profile.legacyScUserId
        ? await this.userRepo.findOneForCompany(profile.legacyScUserId, profile.companyId)
        : null;
      const role = scUser?.role || StockControlRole.STOREMAN;
      const name =
        [unifiedUser.firstName, unifiedUser.lastName].filter(Boolean).join(" ") ||
        unifiedUser.email;

      return {
        accessToken: this.jwtService.sign(
          {
            sub: unifiedUser.id,
            email: unifiedUser.email,
            name,
            role,
            companyId: profile.companyId,
            type: "stock-control",
          },
          { expiresIn: "8h" },
        ),
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async setBranding(
    companyId: number,
    brandingType: string,
    websiteUrl?: string,
    brandingAuthorized?: boolean,
    primaryColor?: string,
    accentColor?: string,
    logoUrl?: string,
    heroImageUrl?: string,
  ) {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    company.brandingType =
      brandingType === BrandingType.CUSTOM ? BrandingType.CUSTOM : BrandingType.ANNIX;
    company.websiteUrl = brandingType === BrandingType.CUSTOM ? (websiteUrl ?? null) : null;
    company.brandingAuthorized =
      brandingType === BrandingType.CUSTOM ? (brandingAuthorized ?? false) : false;
    company.primaryColor = brandingType === BrandingType.CUSTOM ? (primaryColor ?? null) : null;
    company.accentColor = brandingType === BrandingType.CUSTOM ? (accentColor ?? null) : null;
    company.logoUrl = brandingType === BrandingType.CUSTOM ? (logoUrl ?? null) : null;
    company.heroImageUrl = brandingType === BrandingType.CUSTOM ? (heroImageUrl ?? null) : null;
    await this.companyRepo.save(company);

    this.publicBrandingService.clearIconCache(companyId);

    return { message: "Branding preference saved successfully." };
  }

  async updateCompanyDetails(companyId: number, dto: UpdateCompanyDetailsDto) {
    const company = await this.companyRepo.findById(companyId);
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    if (dto.name != null) company.name = dto.name;
    if (dto.registrationNumber != null) company.registrationNumber = dto.registrationNumber;
    if (dto.vatNumber != null) company.vatNumber = dto.vatNumber;
    if (dto.streetAddress != null) company.streetAddress = dto.streetAddress;
    if (dto.city != null) company.city = dto.city;
    if (dto.province != null) company.province = dto.province;
    if (dto.postalCode != null) company.postalCode = dto.postalCode;
    if (dto.phone != null) company.phone = dto.phone;
    if (dto.email != null) company.email = dto.email;
    if (dto.websiteUrl != null) company.websiteUrl = dto.websiteUrl;
    if (dto.pipingLossFactorPct != null) company.pipingLossFactorPct = dto.pipingLossFactorPct;
    if (dto.flatPlateLossFactorPct != null)
      company.flatPlateLossFactorPct = dto.flatPlateLossFactorPct;
    if (dto.structuralSteelLossFactorPct != null)
      company.structuralSteelLossFactorPct = dto.structuralSteelLossFactorPct;
    if (dto.qcEnabled != null) company.qcEnabled = dto.qcEnabled;
    if (dto.messagingEnabled != null) company.messagingEnabled = dto.messagingEnabled;
    if (dto.staffLeaveEnabled != null) company.staffLeaveEnabled = dto.staffLeaveEnabled;
    if (dto.workflowEnabled != null) company.workflowEnabled = dto.workflowEnabled;
    if (dto.notificationsEnabled != null) company.notificationsEnabled = dto.notificationsEnabled;

    await this.companyRepo.save(company);

    if (dto.notificationsEnabled === false) {
      await this.pushSubscriptionRepo.deleteForCompany(companyId);
    }

    return { message: "Company details updated successfully." };
  }

  async completeOnboarding(companyId: number, unifiedUserId: number, dto: CompleteOnboardingDto) {
    const legacy = await this.companyRepo.findById(companyId);
    if (legacy) {
      legacy.name = dto.legalName;
      legacy.registrationNumber = dto.registrationNumber;
      legacy.vatNumber = dto.vatNumber ?? null;
      legacy.streetAddress = dto.streetAddress;
      legacy.city = dto.city;
      legacy.province = dto.province ?? null;
      legacy.postalCode = dto.postalCode;
      legacy.phone = dto.phone;
      legacy.email = dto.email;
      await this.companyRepo.save(legacy);
    }

    return this.currentUser(unifiedUserId);
  }

  async teamMembers(companyId: number) {
    const users = await this.userRepo.findForCompanyOrderedByCreated(companyId);

    return users.map((u) => ({
      id: u.id,
      unifiedUserId: u.unifiedUserId ?? null,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  async updateMemberRole(companyId: number, userId: number, role: string) {
    const user = await this.userRepo.findOneForCompany(userId, companyId);
    if (!user) {
      throw new NotFoundException("Team member not found");
    }

    const companyRoles = await this.companyRoleService.rolesForCompany(companyId);
    const validKeys = companyRoles.map((r) => r.key);
    if (!validKeys.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validKeys.join(", ")}`);
    }

    const admins = await this.userRepo.countAdminsForCompany(companyId);
    if (user.role === StockControlRole.ADMIN && role !== StockControlRole.ADMIN && admins <= 1) {
      throw new ForbiddenException("Cannot change role of the only admin");
    }

    user.role = role;
    await this.userRepo.saveForCompany(companyId, user);

    return { message: "Role updated successfully." };
  }

  async deleteMember(
    companyId: number,
    userId: number,
    requesterUnifiedUserId: number,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOneForCompany(userId, companyId);
    if (!user) {
      throw new NotFoundException("Team member not found");
    }

    if (user.unifiedUserId === requesterUnifiedUserId) {
      throw new ForbiddenException("You cannot delete your own account");
    }

    if (user.role === StockControlRole.ADMIN) {
      const admins = await this.userRepo.countAdminsForCompany(companyId);
      if (admins <= 1) {
        throw new ForbiddenException("Cannot delete the only admin");
      }
    }

    if (user.unifiedUserId !== null && user.unifiedUserId !== undefined) {
      const stockControlApp = await this.appRepo.findByCode("stock-control");
      if (stockControlApp) {
        const appAccessRows = await this.userAppAccessRepo.findManyWhere({
          userId: user.unifiedUserId,
          appId: stockControlApp.id,
        });
        await Promise.all(appAccessRows.map((row) => this.userAppAccessRepo.remove(row)));
      }
      const profile = await this.profileRepo.findOneByUserId(user.unifiedUserId);
      if (profile && profile.companyId === companyId) {
        await this.profileRepo.removeForCompany(companyId, profile);
      }
    }
    await this.userLocationAssignmentRepo.deleteForUser(companyId, user.id);
    await this.workflowStepAssignmentRepo.deleteForUser(companyId, user.id);
    await this.workflowNotificationRepo.deleteForUser(companyId, user.id);
    await this.userRepo.removeForCompany(companyId, user);

    this.logger.log(`Deleted team member ${user.email} (id=${user.id}) from company ${companyId}`);
    return { message: "Team member deleted successfully." };
  }

  async sendAppLink(companyId: number, userId: number): Promise<{ message: string }> {
    const user = await this.userRepo.findOneForCompanyWithCompany(userId, companyId);
    if (!user) {
      throw new NotFoundException("Team member not found");
    }

    await this.emailService.sendStockControlAppLinkEmail(
      user.email,
      user.name,
      user.company?.name ?? "Your company",
    );

    return { message: "App link sent successfully." };
  }

  async initiateAdminTransfer(
    companyId: number,
    initiatorId: number,
    targetEmail: string,
    newRoleForInitiator: string | null,
  ): Promise<{ message: string }> {
    const initiator = await this.userRepo.findOneForCompanyWithCompany(initiatorId, companyId);
    if (!initiator || initiator.role !== StockControlRole.ADMIN) {
      throw new ForbiddenException("Only the admin can initiate a transfer");
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();

    if (normalizedEmail === initiator.email.toLowerCase()) {
      throw new BadRequestException("Cannot transfer admin to yourself");
    }

    const targetUser = await this.userRepo.findOneByEmailAndCompany(normalizedEmail, companyId);
    if (!targetUser) {
      throw new BadRequestException(
        "No team member found with this email address. They must be an existing member of your company.",
      );
    }

    if (newRoleForInitiator !== null) {
      const companyRoles = await this.companyRoleService.rolesForCompany(companyId);
      const validKeys = companyRoles.filter((r) => r.key !== "admin").map((r) => r.key);
      if (!validKeys.includes(newRoleForInitiator)) {
        throw new BadRequestException("Invalid role selected for your new role");
      }
    }

    const existingPending = await this.adminTransferRepo.findPendingForCompany(companyId);
    if (existingPending) {
      existingPending.status = AdminTransferStatus.CANCELLED;
      await this.adminTransferRepo.saveForCompany(companyId, existingPending);
    }

    const token = uuidv4();
    const expiresAt = now().plus({ days: 7 }).toJSDate();

    await this.adminTransferRepo.create({
      companyId,
      initiatedById: initiatorId,
      targetEmail: normalizedEmail,
      token,
      newRoleForInitiator,
      status: AdminTransferStatus.PENDING,
      expiresAt,
    });

    await this.emailService.sendStockControlAdminTransferEmail(
      normalizedEmail,
      token,
      initiator.company?.name || "Your company",
      initiator.name,
    );

    return { message: "Admin transfer initiated. An email has been sent to the new admin." };
  }

  async pendingAdminTransfer(companyId: number): Promise<{
    id: number;
    targetEmail: string;
    newRoleForInitiator: string | null;
    token: string;
    createdAt: Date;
    expiresAt: Date;
  } | null> {
    const transfer = await this.adminTransferRepo.findPendingForCompany(companyId);

    if (!transfer) {
      return null;
    }

    if (now().toJSDate() > transfer.expiresAt) {
      transfer.status = AdminTransferStatus.EXPIRED;
      await this.adminTransferRepo.saveForCompany(companyId, transfer);
      return null;
    }

    return {
      id: transfer.id,
      targetEmail: transfer.targetEmail,
      newRoleForInitiator: transfer.newRoleForInitiator,
      token: transfer.token,
      createdAt: transfer.createdAt,
      expiresAt: transfer.expiresAt,
    };
  }

  async resendAdminTransfer(companyId: number): Promise<{ message: string }> {
    const transfer = await this.adminTransferRepo.findPendingForCompanyWithInitiator(companyId);

    if (!transfer) {
      throw new NotFoundException("No pending admin transfer found");
    }

    if (now().toJSDate() > transfer.expiresAt) {
      transfer.status = AdminTransferStatus.EXPIRED;
      await this.adminTransferRepo.saveForCompany(companyId, transfer);
      throw new BadRequestException("Admin transfer has expired. Please initiate a new one.");
    }

    const initiator = await this.userRepo.findOneByIdWithCompany(transfer.initiatedById);

    await this.emailService.sendStockControlAdminTransferEmail(
      transfer.targetEmail,
      transfer.token,
      initiator?.company?.name || "Your company",
      initiator?.name || "Admin",
    );

    return { message: "Admin transfer email resent successfully." };
  }

  async cancelAdminTransfer(companyId: number, transferId: number): Promise<{ message: string }> {
    const transfer = await this.adminTransferRepo.findPendingByIdForCompany(transferId, companyId);

    if (!transfer) {
      throw new NotFoundException("No pending admin transfer found");
    }

    transfer.status = AdminTransferStatus.CANCELLED;
    await this.adminTransferRepo.saveForCompany(companyId, transfer);

    return { message: "Admin transfer cancelled." };
  }

  async acceptAdminTransfer(token: string): Promise<{ transferred: boolean; message: string }> {
    const transfer = await this.adminTransferRepo.findByStatusToken(
      token,
      AdminTransferStatus.PENDING,
    );

    if (!transfer) {
      return { transferred: false, message: "No pending transfer" };
    }

    if (now().toJSDate() > transfer.expiresAt) {
      transfer.status = AdminTransferStatus.EXPIRED;
      await this.adminTransferRepo.saveForCompany(transfer.companyId, transfer);
      return { transferred: false, message: "Transfer has expired" };
    }

    const targetUser = await this.userRepo.findOneByEmailAndCompany(
      transfer.targetEmail,
      transfer.companyId,
    );
    if (!targetUser) {
      return { transferred: false, message: "User not found in company" };
    }

    if (!targetUser.emailVerified) {
      return { transferred: false, message: "Target user email is not verified" };
    }

    const initiator = await this.userRepo.findOneForCompany(
      transfer.initiatedById,
      transfer.companyId,
    );

    targetUser.role = StockControlRole.ADMIN;
    await this.userRepo.saveForCompany(transfer.companyId, targetUser);

    if (initiator) {
      if (transfer.newRoleForInitiator === null) {
        await this.userRepo.removeForCompany(transfer.companyId, initiator);
      } else {
        initiator.role = transfer.newRoleForInitiator;
        await this.userRepo.saveForCompany(transfer.companyId, initiator);
      }
    }

    transfer.status = AdminTransferStatus.ACCEPTED;
    transfer.acceptedAt = now().toJSDate();
    await this.adminTransferRepo.saveForCompany(transfer.companyId, transfer);

    return { transferred: true, message: "Admin transfer completed successfully." };
  }

  async adminBridge(adminEmail: string) {
    const normalizedEmail = adminEmail.toLowerCase().trim();
    const unifiedUser = await this.unifiedUserRepo.findOneByEmailAndScope(
      normalizedEmail,
      AppScope.STOCK_CONTROL,
    );

    if (!unifiedUser) {
      throw new NotFoundException(
        "No Stock Control account found for this admin email. Please register first.",
      );
    }

    const profile = await this.profileRepo.findOneByUserId(unifiedUser.id);
    if (!profile) {
      throw new NotFoundException("No Stock Control profile found for this admin email.");
    }

    const role = StockControlRole.ADMIN;
    const name =
      [unifiedUser.firstName, unifiedUser.lastName].filter(Boolean).join(" ") || unifiedUser.email;

    const tokens = this.generateTokens(unifiedUser, profile, role);
    return {
      ...tokens,
      user: {
        id: unifiedUser.id,
        email: unifiedUser.email,
        name,
        role,
      },
    };
  }

  private async dualWriteUnifiedUser(
    email: string,
    passwordHash: string,
    name: string,
    verificationToken: string,
    verificationExpires: Date,
  ): Promise<void> {
    try {
      const existingUnified = await this.unifiedUserRepo.findOneByEmailAndScope(
        email,
        AppScope.STOCK_CONTROL,
      );

      if (existingUnified) {
        existingUnified.passwordHash = passwordHash;
        existingUnified.emailVerificationToken = verificationToken;
        existingUnified.emailVerificationExpires = verificationExpires;
        await this.unifiedUserRepo.save(existingUnified);
      } else {
        const nameParts = name.split(" ");
        const user = this.unifiedUserRepo.instantiate({
          email,
          username: email,
          passwordHash,
          firstName: nameParts[0],
          lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
          appScope: AppScope.STOCK_CONTROL,
          status: "pending",
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: verificationExpires,
        } as Partial<User>);
        await this.unifiedUserRepo.save(user);
      }
    } catch {
      // Dual-write failure is non-fatal — legacy table is still canonical
    }
  }

  async issueTokensForAuthenticatedUser(
    unifiedUser: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const profile = await this.profileRepo.findOneByUserId(unifiedUser.id);

    if (!profile) {
      throw new UnauthorizedException(
        "Stock Control profile not found. Please complete registration first.",
      );
    }

    const scUser = profile.legacyScUserId
      ? await this.userRepo.findOneForCompany(profile.legacyScUserId, profile.companyId)
      : null;
    const role = scUser?.role || StockControlRole.STOREMAN;

    return this.generateTokens(unifiedUser, profile, role);
  }

  private generateTokens(unifiedUser: User, profile: StockControlProfile, role: string) {
    const name =
      [unifiedUser.firstName, unifiedUser.lastName].filter(Boolean).join(" ") || unifiedUser.email;

    const accessToken = this.jwtService.sign(
      {
        sub: unifiedUser.id,
        email: unifiedUser.email,
        name,
        role,
        companyId: profile.companyId,
        type: "stock-control",
      },
      { expiresIn: "8h" },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: unifiedUser.id,
        companyId: profile.companyId,
        tokenType: "refresh",
        type: "stock-control",
      },
      { expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }
}
