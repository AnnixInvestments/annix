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
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { PasswordService } from "../../shared/auth/password.service";
import { S3StorageService } from "../../storage/s3-storage.service";
import { User } from "../../user/entities/user.entity";
import { UpdateCompanyDetailsDto } from "../dto/update-company-details.dto";
import { PushSubscription } from "../entities/push-subscription.entity";
import { StaffMember } from "../entities/staff-member.entity";
import {
  AdminTransferStatus,
  StockControlAdminTransfer,
} from "../entities/stock-control-admin-transfer.entity";
import { BrandingType, StockControlCompany } from "../entities/stock-control-company.entity";
import {
  StockControlInvitation,
  StockControlInvitationStatus,
} from "../entities/stock-control-invitation.entity";
import { StockControlProfile } from "../entities/stock-control-profile.entity";
import { StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";
import { CompanyRoleService } from "./company-role.service";
import { PublicBrandingService } from "./public-branding.service";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class StockControlAuthService {
  private readonly logger = new Logger(StockControlAuthService.name);
  private readonly storageType: string;

  constructor(
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @InjectRepository(StockControlInvitation)
    private readonly invitationRepo: Repository<StockControlInvitation>,
    @InjectRepository(StockControlAdminTransfer)
    private readonly adminTransferRepo: Repository<StockControlAdminTransfer>,
    @InjectRepository(StaffMember)
    private readonly staffRepo: Repository<StaffMember>,
    @InjectRepository(PushSubscription)
    private readonly pushSubscriptionRepo: Repository<PushSubscription>,
    @InjectRepository(User)
    private readonly unifiedUserRepo: Repository<User>,
    @InjectRepository(StockControlProfile)
    private readonly profileRepo: Repository<StockControlProfile>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly s3StorageService: S3StorageService,
    private readonly configService: ConfigService,
    private readonly publicBrandingService: PublicBrandingService,
    private readonly companyRoleService: CompanyRoleService,
    private readonly passwordService: PasswordService,
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
    const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const { companyId, role, isInvitedUser } = await (async () => {
      if (invitationToken) {
        const invitation = await this.invitationRepo.findOne({
          where: { token: invitationToken, status: StockControlInvitationStatus.PENDING },
        });

        if (!invitation) {
          throw new BadRequestException("Invalid or expired invitation token");
        }

        if (now().toJSDate() > invitation.expiresAt) {
          invitation.status = StockControlInvitationStatus.EXPIRED;
          await this.invitationRepo.save(invitation);
          throw new BadRequestException("Invitation has expired");
        }

        invitation.status = StockControlInvitationStatus.ACCEPTED;
        invitation.acceptedAt = now().toJSDate();
        await this.invitationRepo.save(invitation);

        return {
          companyId: invitation.companyId,
          role: invitation.role as StockControlRole,
          isInvitedUser: true,
        };
      }

      const pendingInvitation = await this.invitationRepo.findOne({
        where: { email: normalizedEmail, status: StockControlInvitationStatus.PENDING },
      });

      if (pendingInvitation) {
        pendingInvitation.status = StockControlInvitationStatus.ACCEPTED;
        pendingInvitation.acceptedAt = now().toJSDate();
        await this.invitationRepo.save(pendingInvitation);

        return {
          companyId: pendingInvitation.companyId,
          role: pendingInvitation.role as StockControlRole,
          isInvitedUser: true,
        };
      }

      const company = this.companyRepo.create({
        name: companyName || `${name} Company`,
      });
      const savedCompany = await this.companyRepo.save(company);
      return {
        companyId: savedCompany.id,
        role: StockControlRole.ADMIN as StockControlRole,
        isInvitedUser: false,
      };
    })();

    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      name,
      role,
      companyId,
      emailVerified: true,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    const saved = await this.userRepo.save(user);

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
    const user = await this.userRepo.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(now().toJSDate()),
      },
    });

    if (!user) {
      throw new BadRequestException(
        "Invalid or expired verification link. Please request a new one.",
      );
    }

    const isInvitedUser = user.role !== StockControlRole.ADMIN;

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepo.save(user);

    await this.unifiedUserRepo
      .createQueryBuilder()
      .update()
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: "active",
      })
      .where("LOWER(email) = LOWER(:email)", { email: user.email })
      .execute();

    const result: Record<string, unknown> = {
      message: "Email verified successfully. You can now sign in.",
      userId: user.id,
      email: user.email,
      needsBranding: !isInvitedUser,
    };

    if (!isInvitedUser) {
      // Issue unified JWT tokens for auto-login after verification
      const unifiedUser = await this.unifiedUserRepo.findOne({
        where: { email: user.email },
      });
      const profile = unifiedUser
        ? await this.profileRepo.findOne({ where: { userId: unifiedUser.id } })
        : null;
      if (unifiedUser && profile) {
        const tokens = this.generateTokens(unifiedUser, profile, user.role);
        result.accessToken = tokens.accessToken;
        result.refreshToken = tokens.refreshToken;
      }
    }

    return result;
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: ILike(email.trim()) } });

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
    await this.userRepo.save(user);

    await this.unifiedUserRepo
      .createQueryBuilder()
      .update()
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      })
      .where("LOWER(email) = LOWER(:email)", { email: user.email })
      .execute();

    await this.emailService.sendStockControlVerificationEmail(email, verificationToken);

    return { message: "Verification email resent. Please check your inbox." };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: ILike(email.trim()) } });

    if (user?.emailVerified) {
      const resetToken = uuidv4();
      const resetExpires = now().plus({ hours: 1 }).toJSDate();

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await this.userRepo.save(user);

      await this.unifiedUserRepo
        .createQueryBuilder()
        .update()
        .set({ resetPasswordToken: resetToken, resetPasswordExpires: resetExpires })
        .where("LOWER(email) = LOWER(:email)", { email: user.email })
        .execute();

      await this.emailService.sendStockControlPasswordResetEmail(email, resetToken);
    }

    return {
      message: "If an account exists with that email, a password reset link has been sent.",
    };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(now().toJSDate()),
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired reset link. Please request a new one.");
    }

    const newHash = await this.passwordService.hashSimple(password);
    user.passwordHash = newHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);

    await this.unifiedUserRepo
      .createQueryBuilder()
      .update()
      .set({ passwordHash: newHash, resetPasswordToken: null, resetPasswordExpires: null })
      .where("LOWER(email) = LOWER(:email)", { email: user.email })
      .execute();

    return { message: "Password reset successfully. You can now sign in with your new password." };
  }

  async login(email: string, password: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Look up the unified User for password verification
    const unifiedUser = await this.unifiedUserRepo.findOne({
      where: { email: ILike(normalizedEmail) },
    });
    if (!unifiedUser) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await this.passwordService.verify(password, unifiedUser.passwordHash || "");
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Get the SC profile for company and role info
    const profile = await this.profileRepo.findOne({
      where: { userId: unifiedUser.id },
    });
    if (!profile) {
      throw new UnauthorizedException("No Stock Control profile found");
    }

    // Resolve role from legacy SC user (until roles migrate to RBAC)
    const scUser = profile.legacyScUserId
      ? await this.userRepo.findOne({ where: { id: profile.legacyScUserId } })
      : null;
    const role = scUser?.role || StockControlRole.STOREMAN;

    if (!unifiedUser.emailVerified) {
      unifiedUser.emailVerified = true;
      await this.unifiedUserRepo.save(unifiedUser);
    }

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
    const profile = await this.profileRepo.findOne({
      where: { userId: unifiedUserId },
      relations: ["user", "company"],
    });
    if (!profile) {
      throw new UnauthorizedException("User not found");
    }

    const unifiedUser = profile.user;
    const company = profile.company;

    // Resolve role from legacy SC user (until roles migrate to RBAC)
    const scUser = profile.legacyScUserId
      ? await this.userRepo.findOne({ where: { id: profile.legacyScUserId } })
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
      const staff = await this.staffRepo.findOne({
        where: { id: linkedStaffId, unifiedCompanyId, active: true } as any,
      });
      if (!staff) {
        throw new NotFoundException("Staff member not found or inactive");
      }
    }

    await this.profileRepo.update({ userId: unifiedUserId }, { linkedStaffId });
    return { linkedStaffId };
  }

  async updateTooltipPreference(
    unifiedUserId: number,
    hideTooltips: boolean,
  ): Promise<{ hideTooltips: boolean }> {
    await this.profileRepo.update({ userId: unifiedUserId }, { hideTooltips });
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
    await this.profileRepo.update({ userId: unifiedUserId }, updates);
    const profile = await this.profileRepo.findOneOrFail({ where: { userId: unifiedUserId } });
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
      const unifiedUser = await this.unifiedUserRepo.findOne({ where: { id: payload.sub } });
      if (!unifiedUser) {
        throw new UnauthorizedException("User not found");
      }

      const profile = await this.profileRepo.findOne({ where: { userId: unifiedUser.id } });
      if (!profile) {
        throw new UnauthorizedException("No Stock Control profile found");
      }

      const scUser = profile.legacyScUserId
        ? await this.userRepo.findOne({ where: { id: profile.legacyScUserId } })
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
          { expiresIn: "1h" },
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
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
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

    // Also update the unified companies table (currentUser reads from there)
    const unifiedIdResult = await this.profileRepo.manager.query(
      "SELECT unified_company_id FROM stock_control_companies WHERE id = $1",
      [companyId],
    );
    const unifiedCompanyId = unifiedIdResult[0]?.unified_company_id;
    if (unifiedCompanyId) {
      await this.profileRepo.manager.query(
        `UPDATE companies SET
          branding_type = $1, website_url = $2, branding_authorized = $3,
          primary_color = $4, accent_color = $5, logo_url = $6, hero_image_url = $7,
          updated_at = NOW()
        WHERE id = $8`,
        [
          company.brandingType,
          company.websiteUrl,
          company.brandingAuthorized,
          company.primaryColor,
          company.accentColor,
          company.logoUrl,
          company.heroImageUrl,
          unifiedCompanyId,
        ],
      );
    }

    this.publicBrandingService.clearIconCache(companyId);

    return { message: "Branding preference saved successfully." };
  }

  async updateCompanyDetails(companyId: number, dto: UpdateCompanyDetailsDto) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
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

    // Dual-write to unified companies table
    const unifiedIdResult = await this.profileRepo.manager.query(
      "SELECT unified_company_id FROM stock_control_companies WHERE id = $1",
      [companyId],
    );
    const unifiedCompanyId = unifiedIdResult[0]?.unified_company_id;
    if (unifiedCompanyId) {
      await this.profileRepo.manager.query(
        `UPDATE companies SET
          name = $1, registration_number = $2, vat_number = $3,
          street_address = $4, city = $5, province = $6, postal_code = $7,
          phone = $8, email = $9, website_url = $10,
          qc_enabled = $11, workflow_enabled = $12,
          updated_at = NOW()
        WHERE id = $13`,
        [
          company.name,
          company.registrationNumber,
          company.vatNumber,
          company.streetAddress,
          company.city,
          company.province,
          company.postalCode,
          company.phone,
          company.email,
          company.websiteUrl,
          company.qcEnabled,
          company.workflowEnabled,
          unifiedCompanyId,
        ],
      );
    }

    if (dto.notificationsEnabled === false) {
      await this.pushSubscriptionRepo.delete({ companyId });
    }

    return { message: "Company details updated successfully." };
  }

  async teamMembers(companyId: number) {
    const users = await this.userRepo.find({
      where: { companyId },
      order: { createdAt: "ASC" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
  }

  async updateMemberRole(companyId: number, userId: number, role: string) {
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    if (!user) {
      throw new NotFoundException("Team member not found");
    }

    const companyRoles = await this.companyRoleService.rolesForCompany(companyId);
    const validKeys = companyRoles.map((r) => r.key);
    if (!validKeys.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validKeys.join(", ")}`);
    }

    const admins = await this.userRepo.count({
      where: { companyId, role: StockControlRole.ADMIN },
    });
    if (user.role === StockControlRole.ADMIN && role !== StockControlRole.ADMIN && admins <= 1) {
      throw new ForbiddenException("Cannot change role of the only admin");
    }

    user.role = role;
    await this.userRepo.save(user);

    return { message: "Role updated successfully." };
  }

  async deleteMember(
    companyId: number,
    userId: number,
    requesterUnifiedUserId: number,
  ): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    if (!user) {
      throw new NotFoundException("Team member not found");
    }

    if (user.unifiedUserId === requesterUnifiedUserId) {
      throw new ForbiddenException("You cannot delete your own account");
    }

    if (user.role === StockControlRole.ADMIN) {
      const admins = await this.userRepo.count({
        where: { companyId, role: StockControlRole.ADMIN },
      });
      if (admins <= 1) {
        throw new ForbiddenException("Cannot delete the only admin");
      }
    }

    await this.userRepo.manager.transaction(async (manager) => {
      if (user.unifiedUserId !== null && user.unifiedUserId !== undefined) {
        await manager.query(
          `DELETE FROM user_app_access
           WHERE user_id = $1
             AND app_id IN (SELECT id FROM apps WHERE code = 'stock-control')`,
          [user.unifiedUserId],
        );
        await manager.delete(StockControlProfile, { userId: user.unifiedUserId });
      }
      await manager.delete(StockControlUser, { id: user.id });
    });

    this.logger.log(`Deleted team member ${user.email} (id=${user.id}) from company ${companyId}`);
    return { message: "Team member deleted successfully." };
  }

  async sendAppLink(companyId: number, userId: number): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id: userId, companyId },
      relations: ["company"],
    });
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
    const initiator = await this.userRepo.findOne({
      where: { id: initiatorId, companyId },
      relations: ["company"],
    });
    if (!initiator || initiator.role !== StockControlRole.ADMIN) {
      throw new ForbiddenException("Only the admin can initiate a transfer");
    }

    const normalizedEmail = targetEmail.toLowerCase().trim();

    if (normalizedEmail === initiator.email.toLowerCase()) {
      throw new BadRequestException("Cannot transfer admin to yourself");
    }

    const targetUser = await this.userRepo.findOne({
      where: { email: normalizedEmail, companyId },
    });
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

    const existingPending = await this.adminTransferRepo.findOne({
      where: { companyId, status: AdminTransferStatus.PENDING },
    });
    if (existingPending) {
      existingPending.status = AdminTransferStatus.CANCELLED;
      await this.adminTransferRepo.save(existingPending);
    }

    const token = uuidv4();
    const expiresAt = now().plus({ days: 7 }).toJSDate();

    const transfer = this.adminTransferRepo.create({
      companyId,
      initiatedById: initiatorId,
      targetEmail: normalizedEmail,
      token,
      newRoleForInitiator,
      status: AdminTransferStatus.PENDING,
      expiresAt,
    });
    await this.adminTransferRepo.save(transfer);

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
    const transfer = await this.adminTransferRepo.findOne({
      where: { companyId, status: AdminTransferStatus.PENDING },
    });

    if (!transfer) {
      return null;
    }

    if (now().toJSDate() > transfer.expiresAt) {
      transfer.status = AdminTransferStatus.EXPIRED;
      await this.adminTransferRepo.save(transfer);
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
    const transfer = await this.adminTransferRepo.findOne({
      where: { companyId, status: AdminTransferStatus.PENDING },
      relations: ["initiatedBy", "initiatedBy.company"],
    });

    if (!transfer) {
      throw new NotFoundException("No pending admin transfer found");
    }

    if (now().toJSDate() > transfer.expiresAt) {
      transfer.status = AdminTransferStatus.EXPIRED;
      await this.adminTransferRepo.save(transfer);
      throw new BadRequestException("Admin transfer has expired. Please initiate a new one.");
    }

    const initiator = await this.userRepo.findOne({
      where: { id: transfer.initiatedById },
      relations: ["company"],
    });

    await this.emailService.sendStockControlAdminTransferEmail(
      transfer.targetEmail,
      transfer.token,
      initiator?.company?.name || "Your company",
      initiator?.name || "Admin",
    );

    return { message: "Admin transfer email resent successfully." };
  }

  async cancelAdminTransfer(companyId: number, transferId: number): Promise<{ message: string }> {
    const transfer = await this.adminTransferRepo.findOne({
      where: { id: transferId, companyId, status: AdminTransferStatus.PENDING },
    });

    if (!transfer) {
      throw new NotFoundException("No pending admin transfer found");
    }

    transfer.status = AdminTransferStatus.CANCELLED;
    await this.adminTransferRepo.save(transfer);

    return { message: "Admin transfer cancelled." };
  }

  async acceptAdminTransfer(token: string): Promise<{ transferred: boolean; message: string }> {
    const transfer = await this.adminTransferRepo.findOne({
      where: { token, status: AdminTransferStatus.PENDING },
    });

    if (!transfer) {
      return { transferred: false, message: "No pending transfer" };
    }

    if (now().toJSDate() > transfer.expiresAt) {
      transfer.status = AdminTransferStatus.EXPIRED;
      await this.adminTransferRepo.save(transfer);
      return { transferred: false, message: "Transfer has expired" };
    }

    const targetUser = await this.userRepo.findOne({
      where: { email: transfer.targetEmail, companyId: transfer.companyId },
    });
    if (!targetUser) {
      return { transferred: false, message: "User not found in company" };
    }

    if (!targetUser.emailVerified) {
      return { transferred: false, message: "Target user email is not verified" };
    }

    const initiator = await this.userRepo.findOne({
      where: { id: transfer.initiatedById, companyId: transfer.companyId },
    });

    targetUser.role = StockControlRole.ADMIN;
    await this.userRepo.save(targetUser);

    if (initiator) {
      if (transfer.newRoleForInitiator === null) {
        await this.userRepo.remove(initiator);
      } else {
        initiator.role = transfer.newRoleForInitiator;
        await this.userRepo.save(initiator);
      }
    }

    transfer.status = AdminTransferStatus.ACCEPTED;
    transfer.acceptedAt = now().toJSDate();
    await this.adminTransferRepo.save(transfer);

    return { transferred: true, message: "Admin transfer completed successfully." };
  }

  async adminBridge(adminEmail: string) {
    const normalizedEmail = adminEmail.toLowerCase().trim();
    const unifiedUser = await this.unifiedUserRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (!unifiedUser) {
      throw new NotFoundException(
        "No Stock Control account found for this admin email. Please register first.",
      );
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: unifiedUser.id },
    });
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
      const existingUnified = await this.unifiedUserRepo.findOne({
        where: { email },
      });

      if (existingUnified) {
        existingUnified.passwordHash = passwordHash;
        existingUnified.emailVerificationToken = verificationToken;
        existingUnified.emailVerificationExpires = verificationExpires;
        await this.unifiedUserRepo.save(existingUnified);
      } else {
        const nameParts = name.split(" ");
        const user = this.unifiedUserRepo.create({
          email,
          username: email,
          passwordHash,
          firstName: nameParts[0],
          lastName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
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
      { expiresIn: "1h" },
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
