import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { EmailService } from "../../email/email.service";
import { CompanyRepository } from "../../platform/company.repository";
import { CompanyType } from "../../platform/entities/company.entity";
import {
  AppRepository,
  AppRoleRepository,
  UserAppAccessRepository,
} from "../../rbac/rbac.repository";
import { PasswordService } from "../../shared/auth/password.service";
import { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import { AnnixSentinelCompanyDetailsRepository } from "../companies/annix-sentinel-company-details.repository";
import { AnnixSentinelProfileRepository } from "../companies/annix-sentinel-profile.repository";
import { fromJSDate, now } from "../lib/datetime";
import { AnnixSentinelLoginDto } from "./dto/login.dto";
import { AnnixSentinelSignupDto } from "./dto/signup.dto";

const PASSWORD_RESET_EXPIRY_HOURS = 1;
const CURRENT_TERMS_VERSION = "1.0";

@Injectable()
export class AnnixSentinelAuthService {
  private readonly logger = new Logger(AnnixSentinelAuthService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly profileRepo: AnnixSentinelProfileRepository,
    private readonly companyRepo: CompanyRepository,
    private readonly companyDetailsRepo: AnnixSentinelCompanyDetailsRepository,
    private readonly appRepo: AppRepository,
    private readonly appRoleRepo: AppRoleRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(dto: AnnixSentinelSignupDto): Promise<{
    access_token: string;
    user: { id: number; name: string; email: string; role: string };
  }> {
    if (!dto.termsAccepted) {
      throw new BadRequestException(
        "You must accept the Terms and Conditions to create an account",
      );
    }

    const existingUser = await this.userRepo.findOneByEmail(dto.email);

    if (existingUser !== null) {
      throw new ConflictException("An account with this email already exists");
    }

    const entityType = dto.entityType ?? "company";

    const entityNameMap: Record<string, string> = {
      individual: dto.name,
      trust: dto.trustName || dto.name,
      company: dto.companyName || dto.name,
    };
    const companyName = entityNameMap[entityType] || dto.name;

    const savedUnifiedCompany = await this.companyRepo.create({
      name: companyName,
      companyType: CompanyType.CUSTOMER,
      registrationNumber: dto.registrationNumber ?? null,
      industry: dto.industrySector ?? null,
      province: dto.province ?? null,
      phone: dto.phone ?? null,
    });

    await this.companyDetailsRepo.create({
      companyId: savedUnifiedCompany.id,
      entityType,
      complianceAreas: (dto.complianceAreas as unknown as Record<string, unknown>) ?? null,
      idNumber: dto.idNumber ?? null,
      passportNumber: dto.passportNumber ?? null,
      passportCountry: dto.passportCountry ?? null,
      sarsTaxReference: dto.sarsTaxReference ?? null,
      dateOfBirth: dto.dateOfBirth ?? null,
      trustRegistrationNumber: dto.trustRegistrationNumber ?? null,
      mastersOffice: dto.mastersOffice ?? null,
      trusteeCount: dto.trusteeCount ?? null,
      employeeCountRange: dto.employeeCountRange ?? null,
      businessAddress: dto.businessAddress ?? null,
      profileComplete: dto.profileComplete ?? false,
    });

    const passwordHash = await this.passwordService.hashSimple(dto.password);
    const verificationToken = randomBytes(32).toString("hex");

    const savedUser = await this.userRepo.create({
      email: dto.email,
      username: dto.email,
      passwordHash,
      firstName: dto.name,
      status: "pending",
      emailVerified: false,
      emailVerificationToken: verificationToken,
    } as Partial<User>);

    await this.profileRepo.create({
      userId: savedUser.id,
      companyId: savedUnifiedCompany.id,
      termsAcceptedAt: now().toJSDate(),
      termsVersion: CURRENT_TERMS_VERSION,
    });

    await this.bridgeToRbac(savedUser.id);

    await this.sendVerificationEmail(savedUser.email, verificationToken);

    const token = this.jwtService.sign({
      sub: savedUser.id,
      email: savedUser.email,
      companyId: savedUnifiedCompany.id,
    });

    return {
      access_token: token,
      user: {
        id: savedUser.id,
        name: dto.name,
        email: savedUser.email,
        role: "owner",
      },
    };
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const user = await this.userRepo.findByEmailVerificationToken(token);

    if (user === null) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.status = "active";
    await this.userRepo.save(user);

    this.logger.log(`Email verified for user ${user.email}`);

    return { verified: true };
  }

  async resendVerification(email: string): Promise<{ sent: boolean }> {
    const user = await this.userRepo.findOneByEmail(email);

    if (user === null) {
      return { sent: true };
    }

    if (user.emailVerified) {
      return { sent: true };
    }

    const verificationToken = randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    await this.userRepo.save(user);

    await this.sendVerificationEmail(user.email, verificationToken);

    return { sent: true };
  }

  async login(dto: AnnixSentinelLoginDto): Promise<{
    access_token: string;
    user: { id: number; name: string; email: string; role: string };
    emailVerified: boolean;
    termsOutdated: boolean;
  }> {
    const user = await this.userRepo.findOneByEmail(dto.email);

    if (user === null) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await this.passwordService.verify(dto.password, user.passwordHash || "");

    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    user.lastLoginAt = now().toJSDate();
    await this.userRepo.save(user);

    const profile = await this.profileRepo.findOneByUserId(user.id);

    const termsOutdated = profile?.termsVersion !== CURRENT_TERMS_VERSION;
    const companyId = profile?.companyId ?? null;
    const userName = user.firstName || user.email;

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId,
    });

    return {
      access_token: token,
      user: { id: user.id, name: userName, email: user.email, role: "owner" },
      emailVerified: user.emailVerified,
      termsOutdated,
    };
  }

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const user = await this.userRepo.findOneByEmail(email);

    if (user === null) {
      return { sent: true };
    }

    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ hours: PASSWORD_RESET_EXPIRY_HOURS }).toJSDate();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expiresAt;
    await this.userRepo.save(user);

    await this.sendPasswordResetEmail(user.email, resetToken);

    this.logger.log(`Password reset requested for ${user.email}`);

    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const user = await this.userRepo.findByResetPasswordToken(token);

    if (user === null) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (user.resetPasswordExpires !== null) {
      const expiresAt = fromJSDate(user.resetPasswordExpires);
      if (now() > expiresAt) {
        throw new BadRequestException("Reset token has expired. Please request a new one.");
      }
    }

    const newHash = await this.passwordService.hashSimple(newPassword);
    user.passwordHash = newHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);

    this.logger.log(`Password reset completed for ${user.email}`);

    return { reset: true };
  }

  async refreshToken(userId: number): Promise<{
    access_token: string;
    user: { id: number; name: string; email: string; role: string; companyId: number | null };
  }> {
    const user = await this.userRepo.findById(userId);

    if (user === null) {
      throw new UnauthorizedException("User no longer exists");
    }

    const profile = await this.profileRepo.findOneByUserId(user.id);

    const companyId = profile?.companyId ?? null;
    const userName = user.firstName || user.email;

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        name: userName,
        email: user.email,
        role: "owner",
        companyId,
      },
    };
  }

  async acceptCurrentTerms(userId: number): Promise<{ accepted: boolean }> {
    const profile = await this.profileRepo.findOneByUserId(userId);

    if (profile === null) {
      throw new UnauthorizedException("User not found");
    }

    profile.termsAcceptedAt = now().toJSDate();
    profile.termsVersion = CURRENT_TERMS_VERSION;
    await this.profileRepo.save(profile);

    const user = await this.userRepo.findById(userId);
    this.logger.log(`User ${user?.email} accepted terms version ${CURRENT_TERMS_VERSION}`);

    return { accepted: true };
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.userRepo.findById(userId);
  }

  private async bridgeToRbac(userId: number): Promise<void> {
    try {
      const app = await this.appRepo.findByCode("annix-sentinel");
      if (!app) return;

      const rbacRole = await this.appRoleRepo.findByAppIdAndCode(Number(app.id), "administrator");
      if (!rbacRole) return;

      const existing = await this.userAppAccessRepo.findOneByUserAndApp(userId, Number(app.id));
      if (existing) return;

      await this.userAppAccessRepo.create({
        userId,
        appId: Number(app.id),
        roleId: Number(rbacRole.id),
        grantedAt: now().toJSDate(),
      });
    } catch (err) {
      this.logger.warn(`Failed to bridge Annix Sentinel user ${userId} to RBAC: ${err}`);
    }
  }

  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `https://sentinel.annix.co.za/auth/verify?token=${token}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: "Verify your email - Annix Sentinel",
        fromName: "Annix Sentinel",
        isTransactional: true,
        html: [
          "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>",
          "<body style='font-family:Arial,sans-serif;background:#f8fafc;padding:20px'>",
          "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0'>",
          "<div style='text-align:center;margin-bottom:24px'>",
          "<span style='font-size:24px;font-weight:bold;color:#0d9488'>Annix Sentinel</span>",
          "</div>",
          "<h2 style='color:#1a365d;margin:0 0 16px'>Verify your email address</h2>",
          "<p style='color:#4a5568;line-height:1.6'>Click the button below to verify your email address and activate your Annix Sentinel account.</p>",
          "<div style='margin:24px 0;text-align:center'>",
          `<a href='${verifyUrl}' style='display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold'>Verify Email</a>`,
          "</div>",
          "<p style='color:#a0aec0;font-size:12px'>If you did not create an account, you can safely ignore this email.</p>",
          "</div></body></html>",
        ].join(""),
        text: `Verify your email for Annix Sentinel: ${verifyUrl}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `https://sentinel.annix.co.za/auth/reset-password?token=${token}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: "Reset your password - Annix Sentinel",
        fromName: "Annix Sentinel",
        isTransactional: true,
        html: [
          "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>",
          "<body style='font-family:Arial,sans-serif;background:#f8fafc;padding:20px'>",
          "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0'>",
          "<div style='text-align:center;margin-bottom:24px'>",
          "<span style='font-size:24px;font-weight:bold;color:#0d9488'>Annix Sentinel</span>",
          "</div>",
          "<h2 style='color:#1a365d;margin:0 0 16px'>Reset your password</h2>",
          "<p style='color:#4a5568;line-height:1.6'>You requested a password reset for your Annix Sentinel account. Click the button below to set a new password. This link expires in 1 hour.</p>",
          "<div style='margin:24px 0;text-align:center'>",
          `<a href='${resetUrl}' style='display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold'>Reset Password</a>`,
          "</div>",
          "<p style='color:#a0aec0;font-size:12px'>If you did not request a password reset, you can safely ignore this email.</p>",
          "</div></body></html>",
        ].join(""),
        text: `Reset your Annix Sentinel password: ${resetUrl} (expires in 1 hour)`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
