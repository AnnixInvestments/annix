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
  CheckEmailResponseDto,
  FieldFlowAuthResponseDto,
  FieldFlowLoginDto,
  FieldFlowProfileResponseDto,
  FieldFlowRefreshTokenDto,
  FieldFlowRegisterDto,
} from "./dto";
import { FieldFlowAuthService } from "./fieldflow-auth.service";
import { FieldFlowAuthGuard } from "./guards";

@ApiTags("FieldFlow - Authentication")
@Controller("fieldflow/auth")
export class FieldFlowAuthController {
  constructor(private readonly authService: FieldFlowAuthService) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new FieldFlow user" })
  @ApiResponse({ status: 201, type: FieldFlowAuthResponseDto })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async register(
    @Body() dto: FieldFlowRegisterDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<FieldFlowAuthResponseDto> {
    return this.authService.register(dto, clientIp, userAgent || "unknown");
  }

  @Post("login")
  @Public()
  @ApiOperation({ summary: "Login to FieldFlow" })
  @ApiResponse({ status: 200, type: FieldFlowAuthResponseDto })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(
    @Body() dto: FieldFlowLoginDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<FieldFlowAuthResponseDto> {
    return this.authService.login(dto, clientIp, userAgent || "unknown");
  }

  @Post("logout")
  @UseGuards(FieldFlowAuthGuard)
  @ApiOperation({ summary: "Logout from FieldFlow" })
  @ApiResponse({ status: 200 })
  async logout(@Request() req): Promise<{ success: boolean }> {
    await this.authService.logout(req.fieldflowUser.sessionToken);
    return { success: true };
  }

  @Post("refresh")
  @Public()
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, type: FieldFlowAuthResponseDto })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(
    @Body() dto: FieldFlowRefreshTokenDto,
    @Ip() clientIp: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<FieldFlowAuthResponseDto> {
    return this.authService.refreshSession(dto, clientIp, userAgent || "unknown");
  }

  @Get("profile")
  @UseGuards(FieldFlowAuthGuard)
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({ status: 200, type: FieldFlowProfileResponseDto })
  async profile(@Request() req): Promise<FieldFlowProfileResponseDto> {
    return this.authService.profile(req.fieldflowUser.userId);
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
