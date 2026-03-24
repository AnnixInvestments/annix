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
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { ComplySaCompany } from "../companies/entities/company.entity";
import { ComplySaUser } from "../companies/entities/user.entity";
import { fromJSDate, now } from "../lib/datetime";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";

const PASSWORD_RESET_EXPIRY_HOURS = 1;

@Injectable()
export class ComplySaAuthService {
  private readonly logger = new Logger(ComplySaAuthService.name);

  constructor(
    @InjectRepository(ComplySaUser)
    private readonly usersRepository: Repository<ComplySaUser>,
    @InjectRepository(ComplySaCompany)
    private readonly companiesRepository: Repository<ComplySaCompany>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signup(
    dto: ComplySaSignupDto,
  ): Promise<{ access_token: string; user: Partial<ComplySaUser> }> {
    if (!dto.termsAccepted) {
      throw new BadRequestException(
        "You must accept the Terms and Conditions to create an account",
      );
    }

    const existingUser = await this.usersRepository.findOne({
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

    const company = this.companiesRepository.create({
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
    const savedCompany = await this.companiesRepository.save(company);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const verificationToken = randomBytes(32).toString("hex");

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      companyId: savedCompany.id,
      role: "owner",
      emailVerified: false,
      emailVerificationToken: verificationToken,
      termsAcceptedAt: now().toJSDate(),
      termsVersion: "1.0",
    });
    const savedUser = await this.usersRepository.save(user);

    await this.sendVerificationEmail(savedUser.email, verificationToken);

    const token = this.jwtService.sign({
      sub: savedUser.id,
      email: savedUser.email,
      companyId: savedCompany.id,
    });

    return {
      access_token: token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (user === null) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    await this.usersRepository.save(user);

    this.logger.log(`Email verified for user ${user.email}`);

    return { verified: true };
  }

  async resendVerification(email: string): Promise<{ sent: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (user === null) {
      return { sent: true };
    }

    if (user.emailVerified) {
      return { sent: true };
    }

    const verificationToken = randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    await this.usersRepository.save(user);

    await this.sendVerificationEmail(user.email, verificationToken);

    return { sent: true };
  }

  async login(
    dto: ComplySaLoginDto,
  ): Promise<{ access_token: string; user: Partial<ComplySaUser>; emailVerified: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
      relations: ["company"],
    });

    if (user === null) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
    });

    return {
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      emailVerified: user.emailVerified,
    };
  }

  async forgotPassword(email: string): Promise<{ sent: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (user === null) {
      return { sent: true };
    }

    const resetToken = randomBytes(32).toString("hex");
    const expiresAt = now().plus({ hours: PASSWORD_RESET_EXPIRY_HOURS }).toJSDate();

    user.passwordResetToken = resetToken;
    user.passwordResetExpiresAt = expiresAt;
    await this.usersRepository.save(user);

    await this.sendPasswordResetEmail(user.email, resetToken);

    this.logger.log(`Password reset requested for ${user.email}`);

    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ reset: boolean }> {
    const user = await this.usersRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (user === null) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    if (user.passwordResetExpiresAt !== null) {
      const expiresAt = fromJSDate(user.passwordResetExpiresAt);
      if (now() > expiresAt) {
        throw new BadRequestException("Reset token has expired. Please request a new one.");
      }
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.usersRepository.save(user);

    this.logger.log(`Password reset completed for ${user.email}`);

    return { reset: true };
  }

  async refreshToken(
    userId: number,
  ): Promise<{ access_token: string; user: Partial<ComplySaUser> }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["company"],
    });

    if (user === null) {
      throw new UnauthorizedException("User no longer exists");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
    };
  }

  async validateUser(userId: number): Promise<ComplySaUser | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ["company"],
    });

    return user ?? null;
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
