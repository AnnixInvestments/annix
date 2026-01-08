import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Ip,
  Headers,
  Query,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto, RefreshTokenDto } from './dto/admin-auth.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { EmailService } from '../email/email.service';
import { Request } from 'express';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly emailService: EmailService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: AdminLoginDto,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminAuthService.login(
      loginDto,
      clientIp,
      userAgent || 'unknown',
    );
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

  @Get('test-email')
  async testEmail(@Query('to') to: string) {
    if (!to) {
      return { success: false, message: 'Missing "to" query parameter' };
    }
    const success = await this.emailService.sendEmail({
      to,
      subject: 'Annix Test Email',
      html: `
        <h1>Test Email from Annix</h1>
        <p>If you received this email, your SMTP configuration is working correctly!</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
      text: 'Test Email from Annix - SMTP configuration is working!',
    });
    return { success, message: success ? 'Email sent successfully' : 'Failed to send email' };
  }
}
