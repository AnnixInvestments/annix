import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { Company, CompanyType } from "../../platform/entities/company.entity";
import { App } from "../../rbac/entities/app.entity";
import { AppRole } from "../../rbac/entities/app-role.entity";
import { UserAppAccess } from "../../rbac/entities/user-app-access.entity";
import { PasswordService } from "../../shared/auth/password.service";
import { User } from "../../user/entities/user.entity";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaCompanyDetails } from "../companies/entities/comply-sa-company-details.entity";
import { ComplySaProfile } from "../companies/entities/comply-sa-profile.entity";
import { ComplySaUser } from "../companies/entities/user.entity";
import { fromJSDate, now } from "../lib/datetime";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";

const PASSWORD_RESET_EXPIRY_HOURS = 1;
const CURRENT_TERMS_VERSION = "1.0";

@Injectable()
export class ComplySaAuthService {
  private readonly logger = new Logger(ComplySaAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ComplySaProfile)
    private readonly profileRepo: Repository<ComplySaProfile>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(ComplySaCompanyDetails)
    private readonly companyDetailsRepo: Repository<ComplySaCompanyDetails>,
    @InjectRepository(ComplySaUser)
    private readonly legacyUserRepo: Repository<ComplySaUser>,
    @InjectRepository(ComplySaCompany)
    private readonly legacyCompanyRepo: Repository<ComplySaCompany>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectRepository(AppRole)
    private readonly appRoleRepo: Repository<AppRole>,
    @InjectRepository(UserAppAccess)
    private readonly userAppAccessRepo: Repository<UserAppAccess>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
  ) {}

  async signup(dto: ComplySaSignupDto): Promise<{
    access_token: string;
    user: { id: number; name: string; email: string; role: string };
  }> {
    if (!dto.termsAccepted) {
      throw new BadRequestException(
        "You must accept the Terms and Conditions to create an account",
      );
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

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

    const unifiedCompany = this.companyRepo.create({
      name: companyName,
      companyType: CompanyType.CUSTOMER,
      registrationNumber: dto.registrationNumber ?? null,
      industry: dto.industrySector ?? null,
      province: dto.province ?? null,
      phone: dto.phone ?? null,
    });
    const savedUnifiedCompany = await this.companyRepo.save(unifiedCompany);

    const companyDetails = this.companyDetailsRepo.create({
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
    await this.companyDetailsRepo.save(companyDetails);

    const passwordHash = await this.passwordService.hashSimple(dto.password);
    const verificationToken = randomBytes(32).toString("hex");

    const user = this.userRepo.create({
      email: dto.email,
      username: dto.email,
      passwordHash,
      firstName: dto.name,
      status: "pending",
      emailVerified: false,
      emailVerificationToken: verificationToken,
    } as Partial<User>);
    const savedUser = await this.userRepo.save(user);

    const profile = this.profileRepo.create({
      userId: savedUser.id,
      companyId: savedUnifiedCompany.id,
      termsAcceptedAt: now().toJSDate(),
      termsVersion: CURRENT_TERMS_VERSION,
    });
    await this.profileRepo.save(profile);

    await this.bridgeToRbac(savedUser.id);

    const legacyCompany = this.legacyCompanyRepo.create({
      name: companyName,
      entityType,
      registrationNumber: dto.registrationNumber ?? null,
      industry: dto.industrySector ?? null,
      province: dto.province ?? null,
      complianceAreas: dto.complianceAreas ?? null,
      idNumber: dto.idNumber ?? null,
      passportNumber: dto.passportNumber ?? null,
      passportCountry: dto.passportCountry ?? null,
      sarsTaxReference: dto.sarsTaxReference ?? null,
      dateOfBirth: dto.dateOfBirth ?? null,
      phone: dto.phone ?? null,
      trustRegistrationNumber: dto.trustRegistrationNumber ?? null,
      mastersOffice: dto.mastersOffice ?? null,
      trusteeCount: dto.trusteeCount ?? null,
      employeeCountRange: dto.employeeCountRange ?? null,
      businessAddress: dto.businessAddress ?? null,
      profileComplete: dto.profileComplete ?? false,
    });
    const savedLegacyCompany = await this.legacyCompanyRepo.save(legacyCompany);

    const legacyUser = this.legacyUserRepo.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      companyId: savedLegacyCompany.id,
      role: "owner",
      emailVerified: false,
      emailVerificationToken: verificationToken,
      termsAcceptedAt: now().toJSDate(),
      termsVersion: CURRENT_TERMS_VERSION,
    });
    await this.legacyUserRepo.save(legacyUser);

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
    const user = await this.userRepo.findOne({
      where: { emailVerificationToken: token },
    });

    if (user === null) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.status = "active";
    await this.userRepo.save(user);

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({ emailVerified: true, emailVerificationToken: null })
      .where("email = :email", { email: user.email })
      .execute();

    this.logger.log(`Email verified for user ${user.email}`);

    return { verified: true };
  }

  async resendVerification(email: string): Promise<{ sent: boolean }> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (user === null) {
      return { sent: true };
    }

    if (user.emailVerified) {
      return { sent: true };
    }

    const verificationToken = randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    await this.userRepo.save(user);

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({ emailVerificationToken: verificationToken })
      .where("email = :email", { email: user.email })
      .execute();

    await this.sendVerificationEmail(user.email, verificationToken);

    return { sent: true };
  }

  async login(dto: ComplySaLoginDto): Promise<{
    access_token: string;
    user: { id: number; name: string; email: string; role: string };
    emailVerified: boolean;
    termsOutdated: boolean;
  }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    if (user === null) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordToCheck = user.passwordHash || user.password;
    const passwordValid = await this.passwordService.verify(dto.password, passwordToCheck);

    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
      relations: ["company"],
    });

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
    const user = await this.userRepo.findOne({ where: { email } });

    if (user === null) {
      return { sent: true };
    }

    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ hours: PASSWORD_RESET_EXPIRY_HOURS }).toJSDate();

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expiresAt;
    await this.userRepo.save(user);

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({ passwordResetToken: resetToken, passwordResetExpiresAt: expiresAt })
      .where("email = :email", { email: user.email })
      .execute();

    await this.sendPasswordResetEmail(user.email, resetToken);

    this.logger.log(`Password reset requested for ${user.email}`);

    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const user = await this.userRepo.findOne({
      where: { resetPasswordToken: token },
    });

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

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({ passwordHash: newHash, passwordResetToken: null, passwordResetExpiresAt: null })
      .where("email = :email", { email: user.email })
      .execute();

    this.logger.log(`Password reset completed for ${user.email}`);

    return { reset: true };
  }

  async refreshToken(userId: number): Promise<{
    access_token: string;
    user: { id: number; name: string; email: string; role: string; companyId: number | null };
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (user === null) {
      throw new UnauthorizedException("User no longer exists");
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
    });

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
    const profile = await this.profileRepo.findOne({ where: { userId } });

    if (profile === null) {
      throw new UnauthorizedException("User not found");
    }

    profile.termsAcceptedAt = now().toJSDate();
    profile.termsVersion = CURRENT_TERMS_VERSION;
    await this.profileRepo.save(profile);

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({ termsAcceptedAt: now().toJSDate(), termsVersion: CURRENT_TERMS_VERSION })
      .where("id = :id", { id: profile.legacyComplyUserId })
      .execute();

    const user = await this.userRepo.findOne({ where: { id: userId } });
    this.logger.log(`User ${user?.email} accepted terms version ${CURRENT_TERMS_VERSION}`);

    return { accepted: true };
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  private async bridgeToRbac(userId: number): Promise<void> {
    try {
      const app = await this.appRepo.findOne({ where: { code: "comply-sa" } });
      if (!app) return;

      const rbacRole = await this.appRoleRepo.findOne({
        where: { appId: app.id, code: "administrator" },
      });
      if (!rbacRole) return;

      const existing = await this.userAppAccessRepo.findOne({
        where: { userId, appId: app.id },
      });
      if (existing) return;

      const access = this.userAppAccessRepo.create({
        userId,
        appId: app.id,
        roleId: rbacRole.id,
        grantedAt: now().toJSDate(),
      });
      await this.userAppAccessRepo.save(access);
    } catch (err) {
      this.logger.warn(`Failed to bridge Comply SA user ${userId} to RBAC: ${err}`);
    }
  }

  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verifyUrl = `https://comply-sa.annix.co.za/auth/verify?token=${token}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: "Verify your email - Comply SA",
        fromName: "Comply SA",
        isTransactional: true,
        html: [
          "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>",
          "<body style='font-family:Arial,sans-serif;background:#f8fafc;padding:20px'>",
          "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0'>",
          "<div style='text-align:center;margin-bottom:24px'>",
          "<span style='font-size:24px;font-weight:bold;color:#0d9488'>Comply SA</span>",
          "</div>",
          "<h2 style='color:#1a365d;margin:0 0 16px'>Verify your email address</h2>",
          "<p style='color:#4a5568;line-height:1.6'>Click the button below to verify your email address and activate your Comply SA account.</p>",
          "<div style='margin:24px 0;text-align:center'>",
          `<a href='${verifyUrl}' style='display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold'>Verify Email</a>`,
          "</div>",
          "<p style='color:#a0aec0;font-size:12px'>If you did not create an account, you can safely ignore this email.</p>",
          "</div></body></html>",
        ].join(""),
        text: `Verify your email for Comply SA: ${verifyUrl}`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `https://comply-sa.annix.co.za/auth/reset-password?token=${token}`;

    try {
      await this.emailService.sendEmail({
        to: email,
        subject: "Reset your password - Comply SA",
        fromName: "Comply SA",
        isTransactional: true,
        html: [
          "<!DOCTYPE html><html><head><meta charset='UTF-8'></head>",
          "<body style='font-family:Arial,sans-serif;background:#f8fafc;padding:20px'>",
          "<div style='max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e2e8f0'>",
          "<div style='text-align:center;margin-bottom:24px'>",
          "<span style='font-size:24px;font-weight:bold;color:#0d9488'>Comply SA</span>",
          "</div>",
          "<h2 style='color:#1a365d;margin:0 0 16px'>Reset your password</h2>",
          "<p style='color:#4a5568;line-height:1.6'>You requested a password reset for your Comply SA account. Click the button below to set a new password. This link expires in 1 hour.</p>",
          "<div style='margin:24px 0;text-align:center'>",
          `<a href='${resetUrl}' style='display:inline-block;background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold'>Reset Password</a>`,
          "</div>",
          "<p style='color:#a0aec0;font-size:12px'>If you did not request a password reset, you can safely ignore this email.</p>",
          "</div></body></html>",
        ].join(""),
        text: `Reset your Comply SA password: ${resetUrl} (expires in 1 hour)`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
