import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlRoleGuard, StockControlRoles } from "../guards/stock-control-role.guard";
import { StockControlAuthService } from "../services/auth.service";

@ApiTags("Stock Control - Auth")
@Controller("stock-control/auth")
export class StockControlAuthController {
  constructor(private readonly authService: StockControlAuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new stock control user" })
  async register(
    @Body() body: { email: string; password: string; name: string; companyName?: string; invitationToken?: string },
  ) {
    return this.authService.register(body.email, body.password, body.name, body.companyName, body.invitationToken);
  }

  @Get("verify-email")
  @ApiOperation({ summary: "Verify email address" })
  async verifyEmail(@Query("token") token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post("resend-verification")
  @ApiOperation({ summary: "Resend verification email" })
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerification(body.email);
  }

  @Post("login")
  @ApiOperation({ summary: "Login to stock control" })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Post("set-branding")
  @ApiOperation({ summary: "Set branding preference for company" })
  async setBranding(
    @Req() req: any,
    @Body() body: { brandingType: string; websiteUrl?: string; brandingAuthorized?: boolean },
  ) {
    return this.authService.setBranding(req.user.companyId, body.brandingType, body.websiteUrl, body.brandingAuthorized);
  }

  @UseGuards(StockControlAuthGuard)
  @Get("me")
  @ApiOperation({ summary: "Current user profile" })
  async currentUser(@Req() req: any) {
    return this.authService.currentUser(req.user.id);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Get("team")
  @ApiOperation({ summary: "List team members" })
  async teamMembers(@Req() req: any) {
    return this.authService.teamMembers(req.user.companyId);
  }

  @UseGuards(StockControlAuthGuard, StockControlRoleGuard)
  @StockControlRoles("admin")
  @Patch("team/:id/role")
  @ApiOperation({ summary: "Update team member role" })
  async updateMemberRole(@Req() req: any, @Param("id") id: number, @Body() body: { role: string }) {
    return this.authService.updateMemberRole(req.user.companyId, id, body.role as any);
  }

  @UseGuards(StockControlAuthGuard)
  @Post("logout")
  @ApiOperation({ summary: "Logout" })
  async logout() {
    return { message: "Logged out" };
  }
}
