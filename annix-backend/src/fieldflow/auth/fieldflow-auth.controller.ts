import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Public } from "../../auth/public.decorator";
import {
  AnnixRepAuthResponseDto,
  AnnixRepLoginDto,
  AnnixRepProfileResponseDto,
  AnnixRepRefreshTokenDto,
  AnnixRepRegisterDto,
  CheckEmailResponseDto,
} from "./dto";
import { AnnixRepAuthService } from "./fieldflow-auth.service";
import { AnnixRepAuthGuard } from "./guards";
import { OAuthProvider } from "./oauth-login.provider";

@ApiTags("Annix Rep - Authentication")
@Controller("annix-rep/auth")
export class AnnixRepAuthController {
  constructor(private readonly authService: AnnixRepAuthService) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new Annix Rep user" })
  @ApiResponse({ status: 201, type: AnnixRepAuthResponseDto })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async register(
    @Body() dto: AnnixRepRegisterDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    return this.authService.register(dto, clientIp, userAgent || "unknown");
  }

  @Post("login")
  @Public()
  @ApiOperation({ summary: "Login to Annix Rep" })
  @ApiResponse({ status: 200, type: AnnixRepAuthResponseDto })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() dto: AnnixRepLoginDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    return this.authService.login(dto, clientIp, userAgent || "unknown");
  }

  @Post("logout")
  @UseGuards(AnnixRepAuthGuard)
  @ApiOperation({ summary: "Logout from Annix Rep" })
  @ApiResponse({ status: 200 })
  async logout(@Request() req): Promise<{ success: boolean }> {
    await this.authService.logout(req.annixRepUser.sessionToken);
    return { success: true };
  }

  @Post("refresh")
  @Public()
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, type: AnnixRepAuthResponseDto })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(
    @Body() dto: AnnixRepRefreshTokenDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<AnnixRepAuthResponseDto> {
    return this.authService.refreshSession(dto, clientIp, userAgent || "unknown");
  }

  @Get("profile")
  @UseGuards(AnnixRepAuthGuard)
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, type: AnnixRepProfileResponseDto })
  async profile(@Request() req): Promise<AnnixRepProfileResponseDto> {
    return this.authService.profile(req.annixRepUser.userId);
  }

  @Get("check-email")
  @Public()
  @ApiOperation({ summary: "Check if email is available for registration" })
  @ApiResponse({ status: 200, type: CheckEmailResponseDto })
  async checkEmail(@Query("email") email: string): Promise<CheckEmailResponseDto> {
    const available = await this.authService.checkEmailAvailable(email);
    return { available };
  }

  @Get("oauth/callback")
  @Public()
  @ApiOperation({ summary: "OAuth callback handler" })
  async oauthCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (error) {
      res.redirect(`${frontendUrl}/voice-filter/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendUrl}/voice-filter/login?error=missing_code`);
      return;
    }

    const [provider, redirectBase64] = state.split(":");
    let redirectPath = "/voice-filter";
    try {
      redirectPath = Buffer.from(redirectBase64, "base64").toString("utf-8");
    } catch {
      redirectPath = "/voice-filter";
    }

    const oauthProvider = provider === "teams" ? "microsoft" : provider;
    const validProviders: OAuthProvider[] = ["google", "microsoft", "zoom"];

    if (!validProviders.includes(oauthProvider as OAuthProvider)) {
      res.redirect(`${frontendUrl}/voice-filter/login?error=invalid_provider`);
      return;
    }

    try {
      const callbackUrl = `${process.env.API_URL || "http://localhost:4001"}/annix-rep/auth/oauth/callback`;
      const authResponse = await this.authService.oauthLogin(
        oauthProvider as OAuthProvider,
        code,
        callbackUrl,
        clientIp,
        userAgent || "unknown",
      );

      const params = new URLSearchParams({
        oauth: "success",
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        userId: authResponse.userId.toString(),
        email: authResponse.email,
        firstName: authResponse.firstName,
        lastName: authResponse.lastName,
        redirect: redirectPath,
      });

      res.redirect(`${frontendUrl}/voice-filter/login?${params.toString()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      res.redirect(`${frontendUrl}/voice-filter/login?error=${encodeURIComponent(message)}`);
    }
  }

  @Get("oauth/:provider")
  @Public()
  @ApiOperation({ summary: "Initiate OAuth login flow" })
  async oauthRedirect(
    @Param("provider") provider: string,
    @Query("redirect") redirect: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const validProviders: OAuthProvider[] = ["google", "microsoft", "zoom"];
    const oauthProvider = provider === "teams" ? "microsoft" : provider;

    if (!validProviders.includes(oauthProvider as OAuthProvider)) {
      res.redirect(`${frontendUrl}/voice-filter/login?error=invalid_provider`);
      return;
    }

    if (!this.authService.isOAuthProviderConfigured(oauthProvider as OAuthProvider)) {
      res.redirect(`${frontendUrl}/voice-filter/login?error=provider_not_configured`);
      return;
    }

    const state = `${provider}:${Buffer.from(redirect || "/voice-filter").toString("base64")}:${Date.now()}`;
    const callbackUrl = `${process.env.API_URL || "http://localhost:4001"}/annix-rep/auth/oauth/callback`;
    const authUrl = this.authService.oauthAuthorizationUrl(
      oauthProvider as OAuthProvider,
      callbackUrl,
      state,
    );

    if (!authUrl) {
      res.redirect(`${frontendUrl}/voice-filter/login?error=oauth_failed`);
      return;
    }

    res.redirect(authUrl);
  }
}
