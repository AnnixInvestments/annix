import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, RefreshTokenDto } from './dto/admin-auth.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { Request } from 'express';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  async login(
    @Body() loginDto: AdminLoginDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminAuthService.login(loginDto, clientIp, userAgent || 'unknown');
  }

  @Post('logout')
  @UseGuards(AdminAuthGuard)
  async logout(@Req() req: any, @Ip() clientIp: string) {
    const userId = req.user.id;
    const sessionToken = req.user.sessionToken;
    await this.adminAuthService.logout(userId, sessionToken, clientIp);
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.adminAuthService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  async getCurrentUser(@Req() req: any) {
    return this.adminAuthService.getCurrentUser(req.user.id);
  }
}
