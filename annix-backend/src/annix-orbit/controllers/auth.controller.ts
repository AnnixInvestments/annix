import { Body, Controller, Get, Post, Query, Request, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AcceptAnnixOrbitTeamInviteDto } from "../dto/annix-orbit-team.dto";
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  RegisterIndividualDto,
  RegisterRecruiterDto,
  RegisterStudentDto,
  ResendVerificationDto,
  ResetPasswordDto,
} from "../dto/auth.dto";
import { AnnixOrbitAuthGuard } from "../guards/annix-orbit-auth.guard";
import { AnnixOrbitAuthThrottlerGuard } from "../guards/auth-throttler.guard";
import { AnnixOrbitAuthService } from "../services/auth.service";

@Controller("annix-orbit/auth")
@UseGuards(AnnixOrbitAuthThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AnnixOrbitAuthController {
  constructor(private readonly authService: AnnixOrbitAuthService) {}

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @Post("register/recruiter")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerRecruiter(@Body() dto: RegisterRecruiterDto) {
    return this.authService.registerRecruiter({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      agencyName: dto.agencyName,
      province: dto.province,
      city: dto.city,
    });
  }

  @Post("register/individual")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerIndividual(@Body() dto: RegisterIndividualDto) {
    return this.authService.registerIndividual(
      dto.email,
      dto.password,
      dto.name,
      dto.eeDisclosure,
      dto.phone,
      dto.ageGroup,
    );
  }

  @Post("register/student")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerStudent(@Body() dto: RegisterStudentDto) {
    return this.authService.registerStudent(dto.email, dto.password, dto.name, dto.eeDisclosure);
  }

  @Get("team-invite")
  async teamInviteInfo(@Query("token") token: string) {
    return this.authService.teamInviteInfo(token);
  }

  @Post("accept-team-invite")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async acceptTeamInvite(@Body() dto: AcceptAnnixOrbitTeamInviteDto) {
    return this.authService.acceptTeamInvite(dto.token, dto.name, dto.password);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.accountType);
  }

  @Get("verify-email")
  async verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post("resend-verification")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
