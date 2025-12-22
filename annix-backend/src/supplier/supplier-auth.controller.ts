import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { SupplierAuthService } from './supplier-auth.service';
import {
  CreateSupplierRegistrationDto,
  SupplierLoginDto,
  SupplierLoginResponseDto,
} from './dto';

@ApiTags('Supplier Authentication')
@Controller('supplier')
export class SupplierAuthController {
  constructor(private readonly supplierAuthService: SupplierAuthService) {}

  @Post('auth/register')
  @ApiOperation({ summary: 'Register a new supplier account' })
  @ApiBody({ type: CreateSupplierRegistrationDto })
  @ApiResponse({ status: 201, description: 'Registration successful, verification email sent' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: CreateSupplierRegistrationDto,
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.supplierAuthService.register(dto, clientIp);
  }

  @Get('auth/verify-email/:token')
  @ApiOperation({ summary: 'Verify supplier email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.supplierAuthService.verifyEmail(token, clientIp);
  }

  @Post('auth/resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(
    @Body() body: { email: string },
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.supplierAuthService.resendVerificationEmail(body.email, clientIp);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supplier login with device verification' })
  @ApiBody({ type: SupplierLoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: SupplierLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or device mismatch' })
  @ApiResponse({ status: 403, description: 'Email not verified or account suspended' })
  async login(
    @Body() dto: SupplierLoginDto,
    @Req() req: Request,
  ): Promise<SupplierLoginResponseDto> {
    const clientIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    return this.supplierAuthService.login(dto, clientIp, userAgent);
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supplier logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: Request) {
    const sessionToken = this.extractSessionToken(req);
    const clientIp = this.getClientIp(req);

    if (sessionToken) {
      await this.supplierAuthService.logout(sessionToken, clientIp);
    }

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh supplier session token' })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: SupplierLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token or device mismatch' })
  async refresh(
    @Body() body: { refreshToken: string; deviceFingerprint: string },
    @Req() req: Request,
  ): Promise<SupplierLoginResponseDto> {
    const clientIp = this.getClientIp(req);
    return this.supplierAuthService.refreshSession(body.refreshToken, body.deviceFingerprint, clientIp);
  }

  // Helper methods

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private extractSessionToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );
        return decoded.sessionToken || null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
