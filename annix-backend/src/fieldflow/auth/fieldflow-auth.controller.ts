import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
}
