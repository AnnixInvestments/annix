import { Body, Controller, Get, Headers, Ip, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { EmailService } from "../email/email.service";
import { nowISO } from "../lib/datetime";
import { errorResponse, messageResponse } from "../shared/dto";
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
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly emailService: EmailService,
  ) {}

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

  @Get("test-email")
  async testEmail(@Query("to") to: string) {
    if (!to) {
      return errorResponse('Missing "to" query parameter');
    }
    const success = await this.emailService.sendEmail({
      to,
      subject: "Annix Test Email",
      html: `
        <h1>Test Email from Annix</h1>
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        <p>Sent at: ${nowISO()}</p>
      `,
      text: "Test Email from Annix - SMTP configuration is working!",
    });
    return success
      ? messageResponse("Email sent successfully")
      : errorResponse("Failed to send email");
  }
}
