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
import { v4 as uuidv4 } from "uuid";
import { MoreThan, Repository } from "typeorm";
import { EmailService } from "../../email/email.service";
import { BrandingType, StockControlRole, StockControlUser } from "../entities/stock-control-user.entity";

const VERIFICATION_EXPIRY_HOURS = 24;

@Injectable()
export class StockControlAuthService {
  constructor(
    @InjectRepository(StockControlUser)
    private readonly userRepo: Repository<StockControlUser>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
    role: StockControlRole = StockControlRole.STOREMAN,
  ) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = uuidv4();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000);

    const user = this.userRepo.create({
      email,
      passwordHash,
      name,
      role,
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

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await this.userRepo.save(user);

    return {
      message: "Email verified successfully. You can now sign in.",
      userId: user.id,
      email: user.email,
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
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
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
    userId: number,
    brandingType: string,
    websiteUrl?: string,
    brandingAuthorized?: boolean,
  ) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (!user.emailVerified) {
      throw new BadRequestException("Email must be verified before setting branding preferences.");
    }

    user.brandingType = brandingType === BrandingType.CUSTOM ? BrandingType.CUSTOM : BrandingType.ANNIX;
    user.websiteUrl = brandingType === BrandingType.CUSTOM ? (websiteUrl ?? null) : null;
    user.brandingAuthorized = brandingType === BrandingType.CUSTOM ? (brandingAuthorized ?? false) : false;
    await this.userRepo.save(user);

    return { message: "Branding preference saved successfully." };
  }

  private generateTokens(user: StockControlUser) {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        type: "stock-control",
      },
      { expiresIn: "1h" },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        tokenType: "refresh",
        type: "stock-control",
      },
      { expiresIn: "7d" },
    );

    return { accessToken, refreshToken };
  }
}
