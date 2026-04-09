import { Body, Controller, Get, Headers, Ip, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { messageResponse } from "../shared/dto";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto, AdminRefreshTokenDto } from "./dto/admin-auth.dto";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    sessionToken: string;
  };
}

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  async login(
    @Body() loginDto: AdminLoginDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ) {
    return this.adminAuthService.login(loginDto, clientIp, userAgent || "unknown");
  }

  @Post("logout")
  @UseGuards(AdminAuthGuard)
  async logout(@Req() req: AuthenticatedRequest, @Ip() clientIp: string) {
    const userId = req.user.id;
    const sessionToken = req.user.sessionToken;
    await this.adminAuthService.logout(userId, sessionToken, clientIp);
    return messageResponse("Logged out successfully");
  }

  @Post("refresh")
  async refreshToken(@Body() refreshTokenDto: AdminRefreshTokenDto) {
    return this.adminAuthService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get("me")
  @UseGuards(AdminAuthGuard)
  async currentUser(@Req() req: AuthenticatedRequest) {
    return this.adminAuthService.currentUser(req.user.id);
  }
}
