import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { StockControlAuthGuard } from "../guards/stock-control-auth.guard";
import { StockControlAuthService } from "../services/auth.service";

@ApiTags("Stock Control - Auth")
@Controller("stock-control/auth")
export class StockControlAuthController {
  constructor(private readonly authService: StockControlAuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new stock control user" })
  async register(@Body() body: { email: string; password: string; name: string; role?: string }) {
    return this.authService.register(body.email, body.password, body.name, body.role as any);
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

  @Post("set-branding")
  @ApiOperation({ summary: "Set branding preference for a user" })
  async setBranding(
    @Body() body: { userId: number; brandingType: string; websiteUrl?: string; brandingAuthorized?: boolean },
  ) {
    return this.authService.setBranding(body.userId, body.brandingType, body.websiteUrl, body.brandingAuthorized);
  }

  @UseGuards(StockControlAuthGuard)
  @Get("me")
  @ApiOperation({ summary: "Current user profile" })
  async currentUser(@Req() req: any) {
    return this.authService.currentUser(req.user.id);
  }

  @UseGuards(StockControlAuthGuard)
  @Post("logout")
  @ApiOperation({ summary: "Logout" })
  async logout() {
    return { message: "Logged out" };
  }
}
