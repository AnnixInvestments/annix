import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { MoreThan, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { StockControlUser, StockControlRole } from "../entities/stock-control-user.entity";
import { StockControlCompany, BrandingType } from "../entities/stock-control-company.entity";
import { StockControlInvitation, StockControlInvitationStatus } from "../entities/stock-control-invitation.entity";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class StockControlAuthService {
  constructor(
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @InjectRepository(StockControlInvitation)
    private readonly invitationRepo: Repository<StockControlInvitation>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
    companyName?: string,
    invitationToken?: string,
  ) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    let companyId: number;
    let role: StockControlRole;
    let isInvitedUser = false;

    if (invitationToken) {
      const invitation = await this.invitationRepo.findOne({
        where: { token: invitationToken, status: StockControlInvitationStatus.PENDING },
      });

      if (!invitation) {
        throw new BadRequestException("Invalid or expired invitation token");
      }

      if (new Date() > invitation.expiresAt) {
        invitation.status = StockControlInvitationStatus.EXPIRED;
        await this.invitationRepo.save(invitation);
        throw new BadRequestException("Invitation has expired");
      }

      companyId = invitation.companyId;
      role = invitation.role as StockControlRole;
      isInvitedUser = true;

      invitation.status = StockControlInvitationStatus.ACCEPTED;
      invitation.acceptedAt = new Date();
      await this.invitationRepo.save(invitation);
    } else {
      const company = this.companyRepo.create({
        name: companyName || `${name} Company`,
      });
      const savedCompany = await this.companyRepo.save(company);
      companyId = savedCompany.id;
      role = StockControlRole.ADMIN;
    }

    const user = this.userRepo.create({
      email,
      passwordHash,
      name,
      role,
      companyId,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    const saved = await this.userRepo.save(user);

    await this.emailService.sendStockControlVerificationEmail(email, verificationToken);

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

  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException("Invalid or expired verification link. Please request a new one.");
    }

    const isInvitedUser = user.role !== StockControlRole.ADMIN;

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepo.save(user);

    return {
      message: "Email verified successfully. You can now sign in.",
      userId: user.id,
      email: user.email,
      needsBranding: !isInvitedUser,
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

    await this.emailService.sendStockControlVerificationEmail(email, verificationToken);

    return { message: "Verification email resent. Please check your inbox." };
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
      brandingType: user.company?.brandingType ?? BrandingType.ANNIX,
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
  ) {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException("Company not found");
    }

    company.brandingType = brandingType === BrandingType.CUSTOM ? BrandingType.CUSTOM : BrandingType.ANNIX;
    company.websiteUrl = brandingType === BrandingType.CUSTOM ? (websiteUrl ?? null) : null;
    company.brandingAuthorized = brandingType === BrandingType.CUSTOM ? (brandingAuthorized ?? false) : false;
    await this.companyRepo.save(company);

    return { message: "Branding preference saved successfully." };
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

  async updateMemberRole(companyId: number, userId: number, role: StockControlRole) {
    const user = await this.userRepo.findOne({ where: { id: userId, companyId } });
    if (!user) {
      throw new NotFoundException("Team member not found");
    }

    const validRoles = Object.values(StockControlRole);
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    const admins = await this.userRepo.count({ where: { companyId, role: StockControlRole.ADMIN } });
    if (user.role === StockControlRole.ADMIN && role !== StockControlRole.ADMIN && admins <= 1) {
      throw new ForbiddenException("Cannot change role of the only admin");
    }

    user.role = role;
    await this.userRepo.save(user);

    return { message: "Role updated successfully." };
  }

  private generateTokens(user: StockControlUser) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        type: "stock-control",
      },
      { expiresIn: "1h" },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        companyId: user.companyId,
        tokenType: "refresh",
        type: "stock-control",
      },
      { expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }
}
