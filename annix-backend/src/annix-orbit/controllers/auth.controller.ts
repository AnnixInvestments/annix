import { Body, Controller, Get, Post, Query, Request, UseGuards } from "@nestjs/common";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  RegisterIndividualDto,
  RegisterStudentDto,
  ResendVerificationDto,
  ResetPasswordDto,
} from "../dto/auth.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitAuthService } from "../services/auth.service";

@Controller("annix-orbit/auth")
export class AnnixOrbitAuthController {
  constructor(private readonly authService: AnnixOrbitAuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    return this.authService.register({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      companyName: dto.companyName,
      industry: dto.industry,
      companySize: dto.companySize,
      province: dto.province,
      city: dto.city,
    });
  }

  @Post("register/individual")
  async registerIndividual(@Body() dto: RegisterIndividualDto) {
    return this.authService.registerIndividual(dto.email, dto.password, dto.name);
  }

  @Post("register/student")
  async registerStudent(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto.email, dto.password, dto.name);
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
  @UseGuards(AnnixOrbitAuthGuard)
  async currentUser(@Request() req: { user: { id: number } }) {
    return this.authService.currentUser(req.user.id);
  }

  @Get("team")
  @UseGuards(AnnixOrbitAuthGuard)
  async teamMembers(@Request() req: { user: { companyId: number } }) {
    return this.authService.teamMembers(req.user.companyId);
  }

  @Post("logout")
  @UseGuards(AnnixOrbitAuthGuard)
  async logout() {
    return { message: "Logged out successfully" };
  }
}
