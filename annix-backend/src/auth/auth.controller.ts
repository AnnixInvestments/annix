import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { clientIpFromRequest } from "../lib/client-ip";
import { AuthService } from "./auth.service";
import { LoginUserDto } from "./dto/login-user.dto";
import { CoreAuthThrottlerGuard } from "./guards/auth-throttler.guard";

interface RefreshTokenBody {
  refreshToken: string;
}

interface AcceptInviteBody {
  token: string;
  password: string;
}

@ApiTags("auth")
@Controller("auth")
@UseGuards(CoreAuthThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Login and get JWT token" })
  @ApiResponse({ status: 201, description: "JWT access token returned" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() loginUserDto: LoginUserDto, @Req() req: Request) {
    const ip = clientIpFromRequest(req);
    const user = await this.authService.validateUser(loginUserDto.email, loginUserDto.password, ip);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.authService.login(user, ip);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Exchange a refresh token for a fresh access + refresh token pair" })
  @ApiResponse({ status: 201, description: "Fresh token pair returned" })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(@Body() body: RefreshTokenBody, @Req() req: Request) {
    const tokens = await this.authService.refreshToken(body.refreshToken, clientIpFromRequest(req));
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };
  }

  @Get("invite/:token")
  @ApiOperation({ summary: "Validate an invite token and return the invitee's details" })
  @ApiResponse({ status: 200, description: "Invite is valid" })
  @ApiResponse({ status: 400, description: "Invite invalid or expired" })
  async invitePreview(@Param("token") token: string) {
    return this.authService.invitePreview(token);
  }

  @Post("accept-invite")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Set a password from an invite token and activate the account" })
  @ApiResponse({ status: 201, description: "Account activated" })
  @ApiResponse({ status: 400, description: "Invite invalid/expired or password too weak" })
  async acceptInvite(@Body() body: AcceptInviteBody, @Req() req: Request) {
    return this.authService.acceptInvite(body.token, body.password, clientIpFromRequest(req));
  }
}
