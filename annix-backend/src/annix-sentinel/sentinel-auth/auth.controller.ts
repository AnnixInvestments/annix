import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { Response } from "express";
import { AnnixSentinelAuthService } from "./auth.service";
import { AnnixSentinelForgotPasswordDto } from "./dto/forgot-password.dto";
import { AnnixSentinelLoginDto } from "./dto/login.dto";
import { AnnixSentinelResendVerificationDto } from "./dto/resend-verification.dto";
import { AnnixSentinelResetPasswordDto } from "./dto/reset-password.dto";
import { AnnixSentinelSignupDto } from "./dto/signup.dto";
import { AnnixSentinelVerifyEmailDto } from "./dto/verify-email.dto";
import { AnnixSentinelJwtAuthGuard } from "./guards/jwt-auth.guard";

const COOKIE_NAME = "comply_sa_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags("annix-sentinel/auth")
@Controller("annix-sentinel/auth")
@UseGuards(ThrottlerGuard)
export class AnnixSentinelAuthController {
  constructor(private readonly authService: AnnixSentinelAuthService) {}

  private setTokenCookie(response: Response, token: string): void {
    response.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api",
      maxAge: SEVEN_DAYS_MS,
    });
  }

  @Post("signup")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async signup(
    @Body() dto: AnnixSentinelSignupDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.signup(dto);
    this.setTokenCookie(response, result.access_token);
    return { user: result.user };
  }

  @Post("login")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Body() dto: AnnixSentinelLoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(dto);
    this.setTokenCookie(response, result.access_token);
    return {
      user: result.user,
      emailVerified: result.emailVerified,
      termsOutdated: result.termsOutdated,
    };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(COOKIE_NAME, { path: "/api/annix-sentinel" });
    return { message: "Logged out" };
  }

  @Post("verify-email")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async verifyEmail(@Body() dto: AnnixSentinelVerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("resend-verification")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async resendVerification(@Body() dto: AnnixSentinelResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("forgot-password")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async forgotPassword(@Body() dto: AnnixSentinelForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async resetPassword(@Body() dto: AnnixSentinelResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @ApiBearerAuth()
  @UseGuards(AnnixSentinelJwtAuthGuard)
  @Post("accept-terms")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async acceptTerms(@Req() req: { user: { id: number } }) {
    return this.authService.acceptCurrentTerms(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AnnixSentinelJwtAuthGuard)
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
