import { randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AppScope } from "../rbac/app-scope";
import { AuthConfigService } from "../shared/auth/auth-config.service";
import { PasswordService } from "../shared/auth/password.service";
import { UserRepository } from "../user/user.repository";
import { ResolveAppResponseDto } from "./dto/resolve-app.dto";

@Injectable()
export class UnifiedLoginService {
  private readonly dummyPasswordHash: Promise<string>;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly authConfigService: AuthConfigService,
  ) {
    this.dummyPasswordHash = this.passwordService.hashSimple(randomBytes(32).toString("hex"));
  }

  async resolveApp(email: string, password: string): Promise<ResolveAppResponseDto> {
    const normalizedEmail = email.toLowerCase().trim();

    const stockControlUser = await this.userRepo.findOneByEmailAndScope(
      normalizedEmail,
      AppScope.STOCK_CONTROL,
    );
    if (stockControlUser && (await this.passwordMatches(password, stockControlUser.passwordHash))) {
      return { app: "stock-control" };
    }

    const adminUser = await this.userRepo.findByEmailWithRolesAndScope(
      normalizedEmail,
      AppScope.ANNIX_ADMIN,
    );
    if (adminUser && (await this.passwordMatches(password, adminUser.passwordHash))) {
      return { app: "au-rubber" };
    }

    if (!stockControlUser && !adminUser) {
      await this.consumeTimingForMissingUser(password);
    }

    throw new UnauthorizedException("Invalid credentials");
  }

  private async passwordMatches(
    password: string,
    passwordHash: string | null | undefined,
  ): Promise<boolean> {
    if (this.authConfigService.isPasswordVerificationDisabled()) {
      return true;
    }
    return this.passwordService.verify(password, passwordHash || "");
  }

  private async consumeTimingForMissingUser(password: string): Promise<void> {
    if (this.authConfigService.isPasswordVerificationDisabled()) {
      return;
    }
    await this.passwordService.verify(password, await this.dummyPasswordHash);
  }
}
