import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { CvAssistantRole, CvAssistantUser } from "../entities/cv-assistant-user.entity";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class CvAssistantAuthService {
  constructor(
    @InjectRepository(CvAssistantUser)
    private readonly userRepo: Repository<CvAssistantUser>,
    @InjectRepository(CvAssistantCompany)
    private readonly companyRepo: Repository<CvAssistantCompany>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(email: string, password: string, name: string, companyName?: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const company = this.companyRepo.create({
      name: companyName || `${name} Company`,
    });
    const savedCompany = await this.companyRepo.save(company);

    const user = this.userRepo.create({
      email,
      passwordHash,
      name,
      role: CvAssistantRole.ADMIN,
      companyId: savedCompany.id,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    const saved = await this.userRepo.save(user);

    await this.emailService.sendCvAssistantVerificationEmail(email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        role: saved.role,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException(
        "Invalid or expired verification link. Please request a new one.",
      );
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepo.save(user);

    const tokens = this.generateTokens(user);

    return {
      message: "Email verified successfully. You can now sign in.",
      userId: user.id,
      email: user.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async resendVerification(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException("No account found with this email address.");
    }

    if (user.emailVerified) {
      throw new BadRequestException("Email is already verified. Please sign in.");
    }

    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await this.userRepo.save(user);

    await this.emailService.sendCvAssistantVerificationEmail(email, verificationToken);

    return { message: "Verification email resent. Please check your inbox." };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (user?.emailVerified) {
      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await this.userRepo.save(user);

      await this.emailService.sendCvAssistantPasswordResetEmail(email, resetToken);
    }

    return {
      message: "If an account exists with that email, a password reset link has been sent.",
    };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.userRepo.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired reset link. Please request a new one.");
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);

    return { message: "Password reset successfully. You can now sign in with your new password." };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        "Please verify your email address before signing in. Check your inbox for the verification link.",
      );
    }

    const tokens = this.generateTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async currentUser(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["company"],
    });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      createdAt: user.createdAt,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      if (payload.tokenType !== "refresh") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      return {
        accessToken: this.jwtService.sign(
          {
            sub: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            type: "cv-assistant",
          },
          { expiresIn: "1h" },
        ),
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
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

  private generateTokens(user: CvAssistantUser) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        type: "cv-assistant",
      },
      { expiresIn: "1h" },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        companyId: user.companyId,
        tokenType: "refresh",
        type: "cv-assistant",
      },
      { expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }
}
