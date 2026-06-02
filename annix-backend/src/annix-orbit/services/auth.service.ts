import {
  BadRequestException,
  ConflictException,
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
import { CompanyRepository } from "../../platform/company.repository";
import {
  AppRepository,
  AppRoleRepository,
  UserAppAccessRepository,
} from "../../rbac/rbac.repository";
import { PasswordService } from "../../shared/auth/password.service";
import { User } from "../../user/entities/user.entity";
import { UserRepository } from "../../user/user.repository";
import { ANNIX_ORBIT_JWT_SECRET_DEFAULT } from "../annix-orbit.constants";
import type { RegisterEeDisclosureDto } from "../dto/auth.dto";
import {
  EeConsentSource,
  type EeDisabilityStatus,
  type EeGender,
  type EeNationalityStatus,
  type EePopulationGroup,
  type EePurpose,
} from "../entities/annix-orbit-candidate-ee-attributes.entity";
import {
  AnnixOrbitProfile,
  type AnnixOrbitProfileEeDisclosure,
  AnnixOrbitUserType,
} from "../entities/annix-orbit-profile.entity";
import { AnnixOrbitRole } from "../entities/annix-orbit-user.entity";
import { AnnixOrbitCompanyRepository } from "../repositories/annix-orbit-company.repository";
import { AnnixOrbitEeConsentTextVersionRepository } from "../repositories/annix-orbit-ee-consent-text-version.repository";
import { AnnixOrbitProfileRepository } from "../repositories/annix-orbit-profile.repository";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class AnnixOrbitAuthService {
  private readonly logger = new Logger(AnnixOrbitAuthService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly profileRepo: AnnixOrbitProfileRepository,
    private readonly companyRepo: CompanyRepository,
    private readonly cvCompanyRepo: AnnixOrbitCompanyRepository,
    private readonly appRepo: AppRepository,
    private readonly appRoleRepo: AppRoleRepository,
    private readonly userAppAccessRepo: UserAppAccessRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
    private readonly eeConsentTextVersionRepo: AnnixOrbitEeConsentTextVersionRepository,
  ) {}

  private async buildRegistrationDisclosure(
    ee: RegisterEeDisclosureDto,
  ): Promise<AnnixOrbitProfileEeDisclosure> {
    const active = await this.eeConsentTextVersionRepo.activeOpenEnded(now().toJSDate());
    const grantedAt = now().toJSDate();
    return {
      populationGroup: ee.populationGroup as EePopulationGroup,
      gender: ee.gender as EeGender,
      disabilityStatus: ee.disabilityStatus as EeDisabilityStatus,
      requiresAccommodation: ee.requiresAccommodation,
      accommodationNotes: ee.accommodationNotes ?? null,
      nationalityStatus: ee.nationalityStatus as EeNationalityStatus,
      purposes: ee.purposes as EePurpose[],
      consentTextVersionId: active ? active.id : 0,
      consentGrantedAt: grantedAt,
      consentSource: EeConsentSource.REGISTRATION,
      updatedAt: grantedAt,
    };
  }

  private jwtSecret(): string {
    return this.configService.get<string>("ANNIX_ORBIT_JWT_SECRET", ANNIX_ORBIT_JWT_SECRET_DEFAULT);
  }

  /**
   * The CV Assistant module stores company FKs against `cv_assistant_companies`
   * (a CV-specific mirror table) rather than the shared `companies` table the
   * profile + registration use. To keep both consistent we INSERT a matching
   * row in `cv_assistant_companies` with the SAME id whenever a `companies`
   * row is created from this service. Idempotent — INSERT…ON CONFLICT.
   */
  private async mirrorIntoAnnixOrbitCompanies(id: number, name: string): Promise<void> {
    await this.cvCompanyRepo.mirrorCompany(id, name);
  }

  /**
   * Self-healing for legacy users who landed in CV Assistant without a
   * complete `cv_assistant_profile` row (e.g. accounts created in another
   * portal before CV Assistant existed). On login we auto-provision a
   * placeholder company so the wizard can save against a real companyId
   * instead of 500-ing on the not-null constraint.
   *
   * Individual users intentionally have companyId=null and userType=individual;
   * we leave those alone.
   */
  private async ensureCompanyProfile(
    user: User,
    profile: AnnixOrbitProfile | null,
  ): Promise<AnnixOrbitProfile | null> {
    if (profile && profile.userType === AnnixOrbitUserType.INDIVIDUAL) {
      return profile;
    }
    if (profile?.companyId) {
      return profile;
    }

    const fallbackCompanyName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    this.logger.warn(
      `User ${user.id} (${user.email}) has incomplete CV Assistant profile — auto-provisioning placeholder company`,
    );
    const companyName = `${fallbackCompanyName}'s Company`;
    const savedCompany = await this.companyRepo.create({
      name: companyName,
      companyType: "CUSTOMER" as never,
      industry: null,
      companySize: null,
      province: null,
      city: null,
    });
    await this.mirrorIntoAnnixOrbitCompanies(savedCompany.id, companyName);

    if (profile) {
      profile.companyId = savedCompany.id;
      profile.userType = AnnixOrbitUserType.COMPANY;
      return this.profileRepo.save(profile);
    }
    return this.profileRepo.create({
      userId: user.id,
      companyId: savedCompany.id,
      userType: AnnixOrbitUserType.COMPANY,
    });
  }

  async register(input: {
    email: string;
    password: string;
    name: string;
    companyName: string;
    industry: string;
    companySize: string;
    province: string;
    city: string;
  }) {
    const { email, password, name, companyName, industry, companySize, province, city } = input;
    const existing = await this.userRepo.findOneByEmail(email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const savedCompany = await this.companyRepo.create({
      name: companyName,
      companyType: "CUSTOMER" as any,
      industry,
      companySize,
      province,
      city,
    });
    await this.mirrorIntoAnnixOrbitCompanies(savedCompany.id, companyName);

    const savedUser = await this.userRepo.create({
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

    await this.profileRepo.create({
      userId: savedUser.id,
      companyId: savedCompany.id,
      userType: AnnixOrbitUserType.COMPANY,
    });

    await this.bridgeToRbac(savedUser.id, "admin");

    await this.emailService.sendAnnixOrbitVerificationEmail(email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name,
        role: AnnixOrbitRole.ADMIN,
        userType: AnnixOrbitUserType.COMPANY,
      },
    };
  }

  async registerRecruiter(input: {
    email: string;
    password: string;
    name: string;
    agencyName: string;
    province: string;
    city: string;
  }) {
    const { email, password, name, agencyName, province, city } = input;
    const existing = await this.userRepo.findOneByEmail(email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const savedCompany = await this.companyRepo.create({
      name: agencyName,
      companyType: "CUSTOMER" as any,
      industry: "Staffing & Recruitment",
      companySize: null,
      province,
      city,
    });
    await this.mirrorIntoAnnixOrbitCompanies(savedCompany.id, agencyName);

    const savedUser = await this.userRepo.create({
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

    await this.profileRepo.create({
      userId: savedUser.id,
      companyId: savedCompany.id,
      userType: AnnixOrbitUserType.RECRUITER,
    });

    await this.bridgeToRbac(savedUser.id, "admin");

    await this.emailService.sendAnnixOrbitVerificationEmail(email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name,
        role: AnnixOrbitRole.ADMIN,
        userType: AnnixOrbitUserType.RECRUITER,
      },
    };
  }

  async registerIndividual(
    email: string,
    password: string,
    name: string,
    eeDisclosure?: RegisterEeDisclosureDto,
  ) {
    const existing = await this.userRepo.findOneByEmail(email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const savedUser = await this.userRepo.create({
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

    const disclosure = eeDisclosure ? await this.buildRegistrationDisclosure(eeDisclosure) : null;
    await this.profileRepo.create({
      userId: savedUser.id,
      companyId: null,
      userType: AnnixOrbitUserType.INDIVIDUAL,
      eeDisclosure: disclosure,
    } as Partial<AnnixOrbitProfile>);

    await this.emailService.sendAnnixOrbitVerificationEmail(email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name,
        role: AnnixOrbitRole.INDIVIDUAL,
        userType: AnnixOrbitUserType.INDIVIDUAL,
      },
    };
  }

  async registerStudent(
    email: string,
    password: string,
    name: string,
    eeDisclosure?: RegisterEeDisclosureDto,
  ) {
    const existing = await this.userRepo.findOneByEmail(email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await this.passwordService.hashSimple(password);
    const verificationToken = uuidv4();
    const verificationExpires = now().plus({ hours: VERIFICATION_EXPIRY_HOURS }).toJSDate();

    const savedUser = await this.userRepo.create({
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

    const disclosure = eeDisclosure ? await this.buildRegistrationDisclosure(eeDisclosure) : null;
    await this.profileRepo.create({
      userId: savedUser.id,
      companyId: null,
      userType: AnnixOrbitUserType.STUDENT,
      eeDisclosure: disclosure,
    } as Partial<AnnixOrbitProfile>);

    await this.assignOrbitRbacRole(savedUser.id, "student");

    await this.emailService.sendAnnixOrbitVerificationEmail(email, verificationToken);

    return {
      message: "Registration successful. Please check your email to verify your account.",
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name,
        role: AnnixOrbitRole.STUDENT,
        userType: AnnixOrbitUserType.STUDENT,
      },
    };
  }

  private async assignOrbitRbacRole(userId: number, roleCode: string): Promise<void> {
    try {
      const app = await this.appRepo.findByCode("annix-orbit");
      if (!app) return;

      const role = await this.appRoleRepo.findByAppIdAndCode(app.id, roleCode);
      if (!role) return;

      const existing = await this.userAppAccessRepo.findOneByUserAndApp(userId, app.id);
      if (existing) return;

      await this.userAppAccessRepo.create({
        userId,
        appId: app.id,
        roleId: role.id,
        grantedAt: now().toJSDate(),
      });
    } catch (err) {
      this.logger.warn(`Failed to assign Annix Orbit role ${roleCode} to user ${userId}: ${err}`);
    }
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findByValidEmailVerificationToken(token, now().toJSDate());

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

    const profile = await this.profileRepo.findByUserId(user.id);
    const role = await this.resolveRole(user.id, profile);
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
    const user = await this.userRepo.findOneByEmail(email);

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

    await this.emailService.sendAnnixOrbitVerificationEmail(email, verificationToken);

    return { message: "Verification email resent. Please check your inbox." };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepo.findOneByEmail(email);

    if (user?.emailVerified) {
      const resetToken = uuidv4();
      const resetExpires = now().plus({ hours: 1 }).toJSDate();

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetExpires;
      await this.userRepo.save(user);

      await this.emailService.sendAnnixOrbitPasswordResetEmail(email, resetToken);
    }

    return {
      message: "If an account exists with that email, a password reset link has been sent.",
    };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.userRepo.findByValidResetPasswordToken(token, now().toJSDate());

    if (!user) {
      throw new BadRequestException("Invalid or expired reset link. Please request a new one.");
    }

    const newHash = await this.passwordService.hashSimple(password);
    user.passwordHash = newHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepo.save(user);

    return { message: "Password reset successfully. You can now sign in with your new password." };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await this.passwordService.verify(password, user.passwordHash || "");
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        "Please verify your email address before signing in. Check your inbox for the verification link.",
      );
    }

    let profile = await this.profileRepo.findByUserId(user.id);
    profile = await this.ensureCompanyProfile(user, profile);
    const role = await this.resolveRole(user.id, profile);
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const tokens = this.generateTokens(user, profile, role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        role,
        userType: profile?.userType ?? AnnixOrbitUserType.COMPANY,
      },
    };
  }

  async currentUser(userId: number) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    const profile = await this.profileRepo.findByUserIdWithCompany(userId);

    const role = await this.resolveRole(userId, profile);
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    return {
      id: user.id,
      email: user.email,
      name: userName,
      role,
      userType: profile?.userType ?? AnnixOrbitUserType.COMPANY,
      companyId: profile?.companyId ?? null,
      companyName: profile?.company?.name ?? null,
      createdAt: user.createdAt,
    };
  }

  async refreshToken(refreshToken: string) {
    const secret = this.jwtSecret();
    try {
      const payload = this.jwtService.verify(refreshToken, { secret });
      if (payload.tokenType !== "refresh") {
        throw new UnauthorizedException("Invalid token type");
      }

      const user = await this.userRepo.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      const profile = await this.profileRepo.findByUserId(user.id);
      const role = await this.resolveRole(user.id, profile);
      const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

      return {
        accessToken: this.jwtService.sign(
          {
            sub: user.id,
            email: user.email,
            name: userName,
            role,
            userType: profile?.userType ?? AnnixOrbitUserType.COMPANY,
            companyId: profile?.companyId ?? payload.companyId ?? null,
            type: "annix-orbit",
          },
          { secret, expiresIn: "8h" },
        ),
      };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async teamMembers(companyId: number) {
    const profiles = await this.profileRepo.teamMembers(companyId);

    const result: Array<{
      id: number;
      name: string;
      email: string;
      role: string;
      createdAt: Date;
    }> = [];
    for (const p of profiles) {
      const role = await this.resolveRole(p.userId, p);
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

  private async resolveRole(userId: number, profile?: AnnixOrbitProfile | null): Promise<string> {
    const resolvedProfile =
      profile === undefined ? await this.profileRepo.findByUserId(userId) : profile;
    if (resolvedProfile?.userType === AnnixOrbitUserType.STUDENT) {
      return AnnixOrbitRole.STUDENT;
    }
    if (resolvedProfile?.userType === AnnixOrbitUserType.INDIVIDUAL) {
      return AnnixOrbitRole.INDIVIDUAL;
    }

    const access = await this.userAppAccessRepo.findByUserAndAppCodeWithRole(userId, "annix-orbit");

    if (access?.role) {
      const roleMap: Record<string, string> = {
        viewer: AnnixOrbitRole.VIEWER,
        editor: AnnixOrbitRole.RECRUITER,
        administrator: AnnixOrbitRole.ADMIN,
      };
      const mapped = roleMap[access.role.code];
      return mapped || AnnixOrbitRole.VIEWER;
    }

    return AnnixOrbitRole.VIEWER;
  }

  private async bridgeToRbac(userId: number, cvRole: string): Promise<void> {
    try {
      const app = await this.appRepo.findByCode("annix-orbit");
      if (!app) return;

      const roleMap: Record<string, string> = {
        viewer: "viewer",
        recruiter: "editor",
        admin: "administrator",
      };
      const rbacRoleCode = roleMap[cvRole] || "viewer";

      const rbacRole = await this.appRoleRepo.findOneWhere({
        appId: app.id,
        code: rbacRoleCode,
      });
      if (!rbacRole) return;

      const existing = await this.userAppAccessRepo.findOneWhere({
        userId,
        appId: app.id,
      });
      if (existing) return;

      await this.userAppAccessRepo.create({
        userId,
        appId: app.id,
        roleId: rbacRole.id,
        grantedAt: now().toJSDate(),
      });
    } catch (err) {
      this.logger.warn(`Failed to bridge CV Assistant user ${userId} to RBAC: ${err}`);
    }
  }

  async issueTokensForAuthenticatedUser(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const profile = await this.profileRepo.findByUserId(user.id);
    const role = await this.resolveRole(user.id, profile);
    return this.generateTokens(user, profile, role);
  }

  private generateTokens(user: User, profile: AnnixOrbitProfile | null, role: string) {
    const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const userType = profile?.userType ?? AnnixOrbitUserType.COMPANY;
    const secret = this.jwtSecret();

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: userName,
        role,
        userType,
        companyId: profile?.companyId ?? null,
        type: "annix-orbit",
      },
      { secret, expiresIn: "8h" },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        userType,
        companyId: profile?.companyId ?? null,
        tokenType: "refresh",
        type: "annix-orbit",
      },
      { secret, expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }
}
