import { randomBytes } from "node:crypto";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { CompanyService, type CoreAppAccessState } from "../platform/company.service";
import { AppScope } from "../rbac/app-scope";
import { AuthConfigService } from "../shared/auth/auth-config.service";
import { PasswordService } from "../shared/auth/password.service";
import type { User } from "../user/entities/user.entity";
import { UserRepository } from "../user/user.repository";
import { ResolveAppResponseDto, type ResolvedApp } from "./dto/resolve-app.dto";

@Injectable()
export class UnifiedLoginService {
  private readonly logger = new Logger(UnifiedLoginService.name);
  private readonly dummyPasswordHash: Promise<string>;

  constructor(
    private readonly userRepo: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly authConfigService: AuthConfigService,
    private readonly moduleRef: ModuleRef,
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
      return this.responseForUser(stockControlUser, "stock-control");
    }

    const adminUser = await this.userRepo.findByEmailWithRolesAndScope(
      normalizedEmail,
      AppScope.ANNIX_ADMIN,
    );
    if (adminUser && (await this.passwordMatches(password, adminUser.passwordHash))) {
      return this.responseForUser(adminUser, "au-rubber");
    }

    if (!stockControlUser && !adminUser) {
      await this.consumeTimingForMissingUser(password);
    }

    this.logResolveAppEvent("invalid_credentials", null, null, [], "invalid_credentials");
    throw new UnauthorizedException("Invalid credentials");
  }

  private async responseForUser(user: User, app: ResolvedApp): Promise<ResolveAppResponseDto> {
    const companyId = user.companyId;
    if (companyId === null) {
      this.logResolveAppEvent("success", app, null, [app], "company_unresolved");
      return { app, enabledApps: [app], companyId: null };
    }

    const blocked = await this.coreLoginModuleGateBlocks(companyId, app);
    if (blocked) {
      this.logResolveAppEvent("disabled", app, companyId, [], "explicitly_disabled");
      throw new UnauthorizedException("App access is disabled for this company");
    }

    const enabledApps = await this.enabledAppsForCompany(companyId);
    this.logResolveAppEvent("success", app, companyId, enabledApps, "resolved");
    return { app, enabledApps, companyId };
  }

  private logResolveAppEvent(
    result: "success" | "invalid_credentials" | "disabled",
    app: ResolvedApp | null,
    companyId: number | null,
    enabledApps: ResolvedApp[],
    reason: string,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: "core.resolve_app",
        result,
        app,
        companyId,
        enabledApps,
        gateEnabled: this.authConfigService.isCoreLoginModuleGateEnabled(),
        reason,
      }),
    );
  }

  private async coreLoginModuleGateBlocks(companyId: number, app: ResolvedApp): Promise<boolean> {
    if (!this.authConfigService.isCoreLoginModuleGateEnabled()) {
      return false;
    }

    const accessState = await this.coreAppAccessState(companyId, app);
    return accessState === "disabled";
  }

  private async enabledAppsForCompany(companyId: number): Promise<ResolvedApp[]> {
    try {
      const companyService = this.moduleRef.get(CompanyService, { strict: false });
      return companyService.enabledApps(companyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Falling back to resolved app while loading core entitlements for company ${companyId}: ${message}`,
      );
      return [];
    }
  }

  private async coreAppAccessState(
    companyId: number,
    app: ResolvedApp,
  ): Promise<CoreAppAccessState> {
    try {
      const companyService = this.moduleRef.get(CompanyService, { strict: false });
      return companyService.coreAppAccessState(companyId, app);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Failing open while loading core app gate state for company ${companyId}: ${message}`,
      );
      return "unknown";
    }
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
