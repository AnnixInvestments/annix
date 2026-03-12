import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaForgotPasswordDto } from "./dto/forgot-password.dto";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaResendVerificationDto } from "./dto/resend-verification.dto";
import { ComplySaResetPasswordDto } from "./dto/reset-password.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";
import { ComplySaVerifyEmailDto } from "./dto/verify-email.dto";

@ApiTags("comply-sa/auth")
@Controller("comply-sa/auth")
@UseGuards(ThrottlerGuard)
export class ComplySaAuthController {
  constructor(private readonly authService: ComplySaAuthService) {}

  @Post("signup")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async signup(@Body() dto: ComplySaSignupDto) {
    return this.authService.signup(dto);
  }

  @Post("login")
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(@Body() dto: ComplySaLoginDto) {
    return this.authService.login(dto);
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
}
