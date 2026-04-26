import { portalForHost } from "@annix/product-data/portals";
import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import { AdminAuthService } from "../admin/admin-auth.service";
import { AnnixRepAuthService } from "../annix-rep/auth/annix-rep-auth.service";
import { AuthService } from "../auth/auth.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CustomerAuthService } from "../customer/customer-auth.service";
import { CvAssistantAuthService } from "../cv-assistant/services/auth.service";
import { StockControlAuthService } from "../stock-control/services/auth.service";
import { SupplierAuthService } from "../supplier/supplier-auth.service";
import {
  PasskeyAuthOptionsRequestDto,
  PasskeyAuthVerifyRequestDto,
  PasskeyRegisterVerifyRequestDto,
  PasskeyRenameRequestDto,
  PasskeySummaryDto,
} from "./dto/passkey.dto";
import { PasskeyService } from "./passkey.service";

@ApiTags("auth-passkey")
@Controller("auth/passkey")
export class PasskeyController {
  constructor(
    private readonly passkeyService: PasskeyService,
    private readonly authService: AuthService,
    private readonly adminAuthService: AdminAuthService,
    private readonly customerAuthService: CustomerAuthService,
    private readonly supplierAuthService: SupplierAuthService,
    private readonly stockControlAuthService: StockControlAuthService,
    private readonly annixRepAuthService: AnnixRepAuthService,
    private readonly cvAssistantAuthService: CvAssistantAuthService,
  ) {}

  @Post("register/options")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate WebAuthn registration options for the current user" })
  async registerOptions(
    @Req()
    req: {
      user?: { id?: number; userId?: number };
      headers: Record<string, string | string[] | undefined>;
    },
  ) {
    const userId = this.requireUserId(req);
    return this.passkeyService.registrationOptions(userId, this.requestHost(req));
  }

  @Post("register/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify a registration response and store the credential" })
  @ApiResponse({ status: 201, description: "Passkey registered" })
  async registerVerify(
    @Req()
    req: {
      user?: { id?: number; userId?: number };
      headers: Record<string, string | string[] | undefined>;
    },
    @Body() body: PasskeyRegisterVerifyRequestDto,
  ): Promise<PasskeySummaryDto> {
    const userId = this.requireUserId(req);
    const passkey = await this.passkeyService.verifyRegistration(
      userId,
      body.response as unknown as RegistrationResponseJSON,
      body.deviceName ?? null,
      this.requestHost(req),
    );
    return this.toSummary(passkey);
  }

  @Post("login/options")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Generate WebAuthn authentication options" })
  async loginOptions(
    @Body() body: PasskeyAuthOptionsRequestDto,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
  ) {
    return this.passkeyService.authenticationOptions(body.email, this.requestHost(req));
  }

  @Post("login/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify an authentication assertion and issue JWTs" })
  async loginVerify(
    @Body() body: PasskeyAuthVerifyRequestDto,
    @Req() req: { headers: Record<string, string | string[] | undefined> },
    @Ip() clientIp: string,
  ) {
    const requestHost = this.requestHost(req);
    const result = await this.passkeyService.verifyAuthentication(
      body.response as unknown as AuthenticationResponseJSON,
      requestHost,
    );

    const userAgentHeader = req.headers["user-agent"];
    const userAgent = (typeof userAgentHeader === "string" ? userAgentHeader : null) || "unknown";

    const appCode = this.resolveAppCode(requestHost, body.appCode);

    if (appCode === "admin" || appCode === "au-rubber") {
      const adminResponse = await this.adminAuthService.issueTokensForAuthenticatedUser(
        result.user,
        appCode,
        clientIp,
        userAgent,
      );
      return {
        access_token: adminResponse.accessToken,
        refresh_token: adminResponse.refreshToken,
        token_type: "Bearer" as const,
        expires_in: 4 * 60 * 60,
      };
    }

    if (appCode === "customer") {
      const customerResponse = await this.customerAuthService.issueTokensForAuthenticatedUser(
        result.user,
        clientIp,
        userAgent,
      );
      return {
        access_token: customerResponse.accessToken,
        refresh_token: customerResponse.refreshToken,
        token_type: "Bearer" as const,
        expires_in: 3600,
      };
    }

    if (appCode === "supplier") {
      const supplierResponse = await this.supplierAuthService.issueTokensForAuthenticatedUser(
        result.user,
        clientIp,
        userAgent,
      );
      return {
        access_token: supplierResponse.accessToken,
        refresh_token: supplierResponse.refreshToken,
        token_type: "Bearer" as const,
        expires_in: 3600,
      };
    }

    if (appCode === "stock-control" || appCode === "ops") {
      const scResponse = await this.stockControlAuthService.issueTokensForAuthenticatedUser(
        result.user,
      );
      return {
        access_token: scResponse.accessToken,
        refresh_token: scResponse.refreshToken,
        token_type: "Bearer" as const,
        expires_in: 3600,
      };
    }

    if (appCode === "annix-rep") {
      const repResponse = await this.annixRepAuthService.issueTokensForAuthenticatedUser(
        result.user,
        clientIp,
        userAgent,
      );
      return {
        access_token: repResponse.accessToken,
        refresh_token: repResponse.refreshToken,
        token_type: "Bearer" as const,
        expires_in: 3600,
      };
    }

    if (appCode === "cv-assistant") {
      const cvResponse = await this.cvAssistantAuthService.issueTokensForAuthenticatedUser(
        result.user,
      );
      return {
        access_token: cvResponse.accessToken,
        refresh_token: cvResponse.refreshToken,
        token_type: "Bearer" as const,
        expires_in: 3600,
      };
    }

    return this.authService.login(result.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's registered passkeys" })
  async list(
    @Req() req: { user?: { id?: number; userId?: number } },
  ): Promise<PasskeySummaryDto[]> {
    const userId = this.requireUserId(req);
    const passkeys = await this.passkeyService.listForUser(userId);
    return passkeys.map((p) => this.toSummary(p));
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Rename a passkey" })
  async rename(
    @Req() req: { user?: { id?: number; userId?: number } },
    @Param("id", ParseIntPipe) id: number,
    @Body() body: PasskeyRenameRequestDto,
  ): Promise<PasskeySummaryDto> {
    const userId = this.requireUserId(req);
    const passkey = await this.passkeyService.rename(userId, id, body.deviceName);
    return this.toSummary(passkey);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke a passkey" })
  @ApiResponse({ status: 200, description: "Passkey revoked" })
  async revoke(
    @Req() req: { user?: { id?: number; userId?: number } },
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    const userId = this.requireUserId(req);
    await this.passkeyService.revoke(userId, id);
    return { ok: true };
  }

  private requireUserId(req: {
    user?: { id?: number | string; userId?: number | string };
  }): number {
    const raw = req.user?.id ?? req.user?.userId;
    const numeric = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;
    if (typeof numeric !== "number" || Number.isNaN(numeric)) {
      throw new UnauthorizedException("Authenticated user not found on request");
    }
    return numeric;
  }

  private requestHost(req: {
    headers: Record<string, string | string[] | undefined>;
  }): string | null {
    const forwarded = this.headerValue(req.headers["x-forwarded-host"]);
    if (forwarded) return forwarded;
    const origin = this.headerValue(req.headers.origin);
    if (origin) {
      try {
        return new URL(origin).host;
      } catch {
        // Malformed Origin — fall through to Host header
      }
    }
    return this.headerValue(req.headers.host);
  }

  private headerValue(raw: string | string[] | undefined): string | null {
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && raw.length > 0) return raw[0] ?? null;
    return null;
  }

  private resolveAppCode(
    requestHost: string | null,
    bodyAppCode: string | null | undefined,
  ): string | null {
    if (bodyAppCode) return bodyAppCode;
    const portal = portalForHost(requestHost);
    return portal ? portal.code : null;
  }

  private toSummary(passkey: {
    id: number;
    deviceName: string | null;
    transports: string[];
    backupEligible: boolean;
    backupState: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
  }): PasskeySummaryDto {
    return {
      id: passkey.id,
      deviceName: passkey.deviceName,
      transports: passkey.transports || [],
      backupEligible: passkey.backupEligible,
      backupState: passkey.backupState,
      lastUsedAt: passkey.lastUsedAt,
      createdAt: passkey.createdAt,
    };
  }
}
