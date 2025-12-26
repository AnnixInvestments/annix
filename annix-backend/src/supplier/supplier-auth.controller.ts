import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Register a new supplier account (basic)' })
  @ApiBody({ type: CreateSupplierRegistrationDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: CreateSupplierRegistrationDto,
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.supplierAuthService.register(dto, clientIp);
  }

  @Post('auth/register-full')
  @ApiOperation({ summary: 'Register a new supplier account with company details and documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'JSON string of company data' },
        profile: { type: 'string', description: 'JSON string of profile data' },
        security: { type: 'string', description: 'JSON string of security data (email, password, deviceFingerprint)' },
        vatDocument: { type: 'string', format: 'binary', description: 'VAT registration document' },
        companyRegDocument: { type: 'string', format: 'binary', description: 'Company registration document' },
        beeDocument: { type: 'string', format: 'binary', description: 'B-BBEE certificate' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Registration successful', type: SupplierLoginResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'vatDocument', maxCount: 1 },
    { name: 'companyRegDocument', maxCount: 1 },
    { name: 'beeDocument', maxCount: 1 },
  ]))
  async registerFull(
    @Body() body: any,
    @UploadedFiles() files: {
      vatDocument?: Express.Multer.File[],
      companyRegDocument?: Express.Multer.File[],
      beeDocument?: Express.Multer.File[],
    },
    @Req() req: Request,
  ): Promise<SupplierLoginResponseDto> {
    const clientIp = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Parse JSON strings from form data
    const company = JSON.parse(body.company);
    const profile = JSON.parse(body.profile);
    const security = JSON.parse(body.security);

    // Extract files
    const vatDocument = files.vatDocument?.[0];
    const companyRegDocument = files.companyRegDocument?.[0];
    const beeDocument = files.beeDocument?.[0];

    return this.supplierAuthService.registerFull(
      {
        email: security.email,
        password: security.password,
        deviceFingerprint: security.deviceFingerprint,
        browserInfo: security.browserInfo,
        company,
        profile,
      },
      clientIp,
      userAgent,
      vatDocument,
      companyRegDocument,
      beeDocument,
    );
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
