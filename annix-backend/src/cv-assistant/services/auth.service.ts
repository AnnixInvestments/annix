import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { MoreThan, Repository } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "../../email/email.service";
import { now } from "../../lib/datetime";
import { Company } from "../../platform/entities/company.entity";
import { App } from "../../rbac/entities/app.entity";
import { AppRole } from "../../rbac/entities/app-role.entity";
import { UserAppAccess } from "../../rbac/entities/user-app-access.entity";
import { PasswordService } from "../../shared/auth/password.service";
import { User } from "../../user/entities/user.entity";
import { CvAssistantCompany } from "../entities/cv-assistant-company.entity";
import { CvAssistantProfile } from "../entities/cv-assistant-profile.entity";
import { CvAssistantRole, CvAssistantUser } from "../entities/cv-assistant-user.entity";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class CvAssistantAuthService {
  private readonly logger = new Logger(CvAssistantAuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CvAssistantProfile)
    private readonly profileRepo: Repository<CvAssistantProfile>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CvAssistantUser)
    private readonly legacyUserRepo: Repository<CvAssistantUser>,
    @InjectRepository(CvAssistantCompany)
    private readonly legacyCompanyRepo: Repository<CvAssistantCompany>,
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

  async register(email: string, password: string, name: string, companyName?: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const resolvedCompanyName = companyName || `${name} Company`;

    const company = this.companyRepo.create({
      name: resolvedCompanyName,
      companyType: "CUSTOMER" as any,
    });
    const savedCompany = await this.companyRepo.save(company);

    const user = this.userRepo.create({
      email,
      username: email,
      passwordHash,
      firstName: name.split(" ")[0],
      lastName: name.includes(" ") ? name.substring(name.indexOf(" ") + 1) : undefined,
      status: "pending",
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    } as Partial<User>);
    const savedUser = await this.userRepo.save(user);

    const profile = this.profileRepo.create({
      userId: savedUser.id,
      companyId: savedCompany.id,
    });
    await this.profileRepo.save(profile);

    await this.bridgeToRbac(savedUser.id, "admin");

    const legacyCompany = this.legacyCompanyRepo.create({
      name: resolvedCompanyName,
    });
    const savedLegacyCompany = await this.legacyCompanyRepo.save(legacyCompany);

    const legacyUser = this.legacyUserRepo.create({
      email,
      passwordHash,
      name,
      role: CvAssistantRole.ADMIN,
      companyId: savedLegacyCompany.id,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });
    await this.legacyUserRepo.save(legacyUser);

    await this.emailService.sendCvAssistantVerificationEmail(email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name,
        role: CvAssistantRole.ADMIN,
      },
    };
  }

  async verifyEmail(token: string) {
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

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    user.status = "active";
    await this.userRepo.save(user);

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      })
      .where("email = :email", { email: user.email })
      .execute();

    const profile = await this.profileRepo.findOne({ where: { userId: user.id } });
    const role = await this.resolveRole(user.id);
    const tokens = this.generateTokens(user, profile, role);

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
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await this.userRepo.save(user);

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      })
      .where("email = :email", { email: user.email })
      .execute();

    await this.emailService.sendCvAssistantVerificationEmail(email, verificationToken);

    return { message: "Verification email resent. Please check your inbox." };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });

    if (user?.emailVerified) {
      const resetToken = uuidv4();
      const resetExpires = now().plus({ hours: 1 }).toJSDate();

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await this.userRepo.save(user);

      await this.legacyUserRepo
        .createQueryBuilder()
        .update()
        .set({ resetPasswordToken: resetToken, resetPasswordExpires: resetExpires })
        .where("email = :email", { email: user.email })
        .execute();

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

    await this.legacyUserRepo
      .createQueryBuilder()
      .update()
      .set({ passwordHash: newHash, resetPasswordToken: null, resetPasswordExpires: null })
      .where("email = :email", { email: user.email })
      .execute();

    return { message: "Password reset successfully. You can now sign in with your new password." };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordToCheck = user.passwordHash || user.password;
    const valid = await this.passwordService.verify(password, passwordToCheck);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        "Please verify your email address before signing in. Check your inbox for the verification link.",
      );
    }

    const profile = await this.profileRepo.findOne({ where: { userId: user.id } });
    const role = await this.resolveRole(user.id);
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const tokens = this.generateTokens(user, profile, role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        role,
      },
    };
  }

  async currentUser(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ["company"],
    });

    const role = await this.resolveRole(userId);
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    return {
      id: user.id,
      email: user.email,
      name: userName,
      role,
      companyId: profile?.companyId ?? null,
      companyName: profile?.company?.name ?? null,
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

      const profile = await this.profileRepo.findOne({ where: { userId: user.id } });
      const role = await this.resolveRole(user.id);
      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

      return {
        accessToken: this.jwtService.sign(
          {
            sub: user.id,
            email: user.email,
            name: userName,
            role,
            companyId: profile?.companyId ?? payload.companyId,
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
    const profiles = await this.profileRepo.find({
      where: { companyId },
      relations: ["user"],
      order: { createdAt: "ASC" },
    });

    const result: Array<{
      id: number;
      name: string;
      email: string;
      role: string;
      createdAt: Date;
    }> = [];
    for (const p of profiles) {
      const role = await this.resolveRole(p.userId);
      const userName =
        [p.user.firstName, p.user.lastName].filter(Boolean).join(" ") || p.user.email;
      result.push({
        id: p.userId,
        name: userName,
        email: p.user.email,
        role,
        createdAt: p.createdAt,
      });
    }
    return result;
  }

  private async resolveRole(userId: number): Promise<string> {
    const access = await this.userAppAccessRepo.findOne({
      where: { userId, app: { code: "cv-assistant" } },
      relations: ["role"],
    });

    if (access?.role) {
      const roleMap: Record<string, string> = {
        viewer: CvAssistantRole.VIEWER,
        editor: CvAssistantRole.RECRUITER,
        administrator: CvAssistantRole.ADMIN,
      };
      return roleMap[access.role.code] || CvAssistantRole.VIEWER;
    }

    return CvAssistantRole.VIEWER;
  }

  private async bridgeToRbac(userId: number, cvRole: string): Promise<void> {
    try {
      const app = await this.appRepo.findOne({ where: { code: "cv-assistant" } });
      if (!app) return;

      const roleMap: Record<string, string> = {
        viewer: "viewer",
        recruiter: "editor",
        admin: "administrator",
      };
      const rbacRoleCode = roleMap[cvRole] || "viewer";

      const rbacRole = await this.appRoleRepo.findOne({
        where: { appId: app.id, code: rbacRoleCode },
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
      this.logger.warn(`Failed to bridge CV Assistant user ${userId} to RBAC: ${err}`);
    }
  }

  private generateTokens(user: User, profile: CvAssistantProfile | null, role: string) {
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: userName,
        role,
        companyId: profile?.companyId ?? null,
        type: "cv-assistant",
      },
      { expiresIn: "1h" },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        companyId: profile?.companyId ?? null,
        tokenType: "refresh",
        type: "cv-assistant",
      },
      { expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }
}
