import {
  Body,
  Controller,
  Delete,
  Get,
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
import { AuthService } from "../auth/auth.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
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
  ) {}

  @Post("register/options")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Generate WebAuthn registration options for the current user" })
  async registerOptions(@Req() req: { user?: { id?: number; userId?: number } }) {
    const userId = this.requireUserId(req);
    return this.passkeyService.registrationOptions(userId);
  }

  @Post("register/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Verify a registration response and store the credential" })
  @ApiResponse({ status: 201, description: "Passkey registered" })
  async registerVerify(
    @Req() req: { user?: { id?: number; userId?: number } },
    @Body() body: PasskeyRegisterVerifyRequestDto,
  ): Promise<PasskeySummaryDto> {
    const userId = this.requireUserId(req);
    const passkey = await this.passkeyService.verifyRegistration(
      userId,
      body.response as unknown as RegistrationResponseJSON,
      body.deviceName ?? null,
    );
    return this.toSummary(passkey);
  }

  @Post("login/options")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Generate WebAuthn authentication options" })
  async loginOptions(@Body() body: PasskeyAuthOptionsRequestDto) {
    return this.passkeyService.authenticationOptions(body.email);
  }

  @Post("login/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verify an authentication assertion and issue JWTs" })
  async loginVerify(@Body() body: PasskeyAuthVerifyRequestDto) {
    const result = await this.passkeyService.verifyAuthentication(
      body.response as unknown as AuthenticationResponseJSON,
    );
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

  private requireUserId(req: { user?: { id?: number; userId?: number } }): number {
    const id = req.user?.id ?? req.user?.userId;
    if (typeof id !== "number") {
      throw new UnauthorizedException("Authenticated user not found on request");
    }
    return id;
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
