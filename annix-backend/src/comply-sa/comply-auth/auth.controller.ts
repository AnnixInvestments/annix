import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { Response } from "express";
import { ComplySaJwtAuthGuard } from "./guards/jwt-auth.guard";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaForgotPasswordDto } from "./dto/forgot-password.dto";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaResendVerificationDto } from "./dto/resend-verification.dto";
import { ComplySaResetPasswordDto } from "./dto/reset-password.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";
import { ComplySaVerifyEmailDto } from "./dto/verify-email.dto";

const COOKIE_NAME = "comply_sa_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags("comply-sa/auth")
@Controller("comply-sa/auth")
@UseGuards(ThrottlerGuard)
export class ComplySaAuthController {
  constructor(private readonly authService: ComplySaAuthService) {}

  private setTokenCookie(response: Response, token: string): void {
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/comply-sa",
      maxAge: SEVEN_DAYS_MS,
    });
  }

  @Post("signup")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async signup(
    @Body() dto: ComplySaSignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signup(dto);
    this.setTokenCookie(response, result.access_token);
    return { user: result.user };
  }

  @Post("login")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(
    @Body() dto: ComplySaLoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setTokenCookie(response, result.access_token);
    return { user: result.user, emailVerified: result.emailVerified };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME, { path: "/api/comply-sa" });
    return { message: "Logged out" };
  }

  @Post("verify-email")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async verifyEmail(@Body() dto: ComplySaVerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("resend-verification")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async resendVerification(@Body() dto: ComplySaResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("forgot-password")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async forgotPassword(@Body() dto: ComplySaForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async resetPassword(@Body() dto: ComplySaResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @ApiBearerAuth()
  @UseGuards(ComplySaJwtAuthGuard)
  @Post("refresh")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async refresh(
    @Req() req: { user: { id: number } },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.refreshToken(req.user.id);
    this.setTokenCookie(response, result.access_token);
    return { user: result.user };
  }
}
