import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerAuthService } from './customer-auth.service';
import {
  CreateCustomerRegistrationDto,
  CustomerLoginDto,
  CustomerLoginResponseDto,
  RefreshTokenDto,
} from './dto';

@ApiTags('Customer Authentication')
@Controller('customer')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiBody({ type: CreateCustomerRegistrationDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input or terms not accepted' })
  @ApiResponse({ status: 409, description: 'Email or company already exists' })
  async register(
    @Body() dto: CreateCustomerRegistrationDto,
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.customerAuthService.register(dto, clientIp);
  }

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer login with device verification' })
  @ApiBody({ type: CustomerLoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: CustomerLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or device mismatch' })
  @ApiResponse({ status: 403, description: 'Account suspended or pending' })
  async login(
    @Body() dto: CustomerLoginDto,
    @Req() req: Request,
  ): Promise<CustomerLoginResponseDto> {
    const clientIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    return this.customerAuthService.login(dto, clientIp, userAgent);
  }

  @Post('auth/logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Req() req: Request) {
    const sessionToken = this.extractSessionToken(req);
    const clientIp = this.getClientIp(req);

    if (sessionToken) {
      await this.customerAuthService.logout(sessionToken, clientIp);
    }

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh customer session token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed', type: CustomerLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token or device mismatch' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<CustomerLoginResponseDto> {
    const clientIp = this.getClientIp(req);
    return this.customerAuthService.refreshSession(dto, clientIp);
  }

  @Post('auth/verify-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify device fingerprint is registered' })
  @ApiResponse({ status: 200, description: 'Device verification result' })
  async verifyDevice(
    @Body() body: { customerId: number; deviceFingerprint: string },
  ) {
    const binding = await this.customerAuthService.verifyDeviceBinding(
      body.customerId,
      body.deviceFingerprint,
    );

    return {
      valid: !!binding,
      message: binding
        ? 'Device is registered and active'
        : 'Device not recognized',
    };
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
        // Decode JWT to get session token
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
