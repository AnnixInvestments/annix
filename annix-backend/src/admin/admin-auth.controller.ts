import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminLoginDto,
  AdminLoginResponseDto,
  AdminRefreshTokenDto,
  AdminRefreshTokenResponseDto,
  AdminUserProfileDto,
} from './dto/admin-auth.dto';
import { Public } from '../auth/public.decorator';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Not authorized for admin access' })
  async login(
    @Body() loginDto: AdminLoginDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AdminLoginResponseDto> {
    return this.adminAuthService.login(loginDto, clientIp, userAgent || 'Unknown');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @Request() req,
    @Ip() clientIp: string,
  ): Promise<{ message: string }> {
    const userId = req.user.sub || req.user.userId;
    const sessionToken = req.user.sessionToken;

    await this.adminAuthService.logout(userId, sessionToken, clientIp);

    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AdminRefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshTokenDto: AdminRefreshTokenDto,
  ): Promise<AdminRefreshTokenResponseDto> {
    return this.adminAuthService.refreshToken(refreshTokenDto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: AdminUserProfileDto,
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getCurrentUser(@Request() req): Promise<AdminUserProfileDto> {
    const userId = req.user.sub || req.user.userId;
    return this.adminAuthService.getCurrentUser(userId);
  }
}
