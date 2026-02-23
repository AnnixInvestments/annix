import { Body, Controller, Get, Post, Query, Request, UseGuards } from "@nestjs/common";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
} from "../dto/auth.dto";
import { CvAssistantAuthGuard } from "../guards/cv-assistant-auth.guard";
import { CvAssistantAuthService } from "../services/auth.service";

@Controller("cv-assistant/auth")
export class CvAssistantAuthController {
  constructor(private readonly authService: CvAssistantAuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name, dto.companyName);
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Get("verify-email")
  async verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post("resend-verification")
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post("refresh")
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get("me")
  @UseGuards(CvAssistantAuthGuard)
  async currentUser(@Request() req: { user: { id: number } }) {
    return this.authService.currentUser(req.user.id);
  }

  @Get("team")
  @UseGuards(CvAssistantAuthGuard)
  async teamMembers(@Request() req: { user: { companyId: number } }) {
    return this.authService.teamMembers(req.user.companyId);
  }

  @Post("logout")
  @UseGuards(CvAssistantAuthGuard)
  async logout() {
    return { message: "Logged out successfully" };
  }
}
