import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { ComplySaAuthService } from "./auth.service";
import { ComplySaLoginDto } from "./dto/login.dto";
import { ComplySaSignupDto } from "./dto/signup.dto";

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
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body.token);
  }

  @Post("resend-verification")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Post("forgot-password")
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post("reset-password")
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }
}
