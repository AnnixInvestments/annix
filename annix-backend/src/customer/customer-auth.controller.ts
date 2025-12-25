import {
  Controller,
  Post,
  Body,
  Req,
  Param,
  HttpCode,
  HttpStatus,
  Get,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiConsumes } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Register a new customer account with documents' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'JSON string of company data' },
        user: { type: 'string', description: 'JSON string of user data' },
        security: { type: 'string', description: 'JSON string of security data' },
        vatDocument: { type: 'string', format: 'binary', description: 'VAT registration document' },
        companyRegDocument: { type: 'string', format: 'binary', description: 'Company registration document' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input or terms not accepted' })
  @ApiResponse({ status: 409, description: 'Email or company already exists' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'vatDocument', maxCount: 1 },
    { name: 'companyRegDocument', maxCount: 1 },
  ]))
  async register(
    @Body() body: any,
    @UploadedFiles() files: { vatDocument?: Express.Multer.File[], companyRegDocument?: Express.Multer.File[] },
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);

    // Parse JSON strings from form data
    const dto: CreateCustomerRegistrationDto = {
      company: JSON.parse(body.company),
      user: JSON.parse(body.user),
      security: JSON.parse(body.security),
    };

    // Extract files
    const vatDocument = files.vatDocument?.[0];
    const companyRegDocument = files.companyRegDocument?.[0];

    return this.customerAuthService.register(dto, clientIp, vatDocument, companyRegDocument);
  }

  @Post('validate-document')
  @ApiOperation({ summary: 'Validate uploaded document against user input using OCR' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        document: { type: 'string', format: 'binary', description: 'Document to validate' },
        documentType: { type: 'string', enum: ['vat', 'registration'], description: 'Type of document' },
        expectedData: { type: 'string', description: 'JSON string of expected data to validate against' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Document validation result' })
  @ApiResponse({ status: 400, description: 'Invalid input or unsupported file type' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'document', maxCount: 1 },
  ]))
  async validateDocument(
    @Body() body: { documentType: string; expectedData: string },
    @UploadedFiles() files: { document?: Express.Multer.File[] },
  ) {
    const document = files.document?.[0];

    if (!document) {
      return {
        success: false,
        message: 'No document provided',
      };
    }

    const documentType = body.documentType as 'vat' | 'registration';
    const expectedData = JSON.parse(body.expectedData);

    return this.customerAuthService.validateUploadedDocument(
      document,
      documentType,
      expectedData,
    );
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

  @Get('auth/verify-email/:token')
  @ApiOperation({ summary: 'Verify email with token' })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.customerAuthService.verifyEmail(token, clientIp);
  }

  @Post('auth/resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({ schema: { properties: { email: { type: 'string', format: 'email' } } } })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  async resendVerification(
    @Body() body: { email: string },
    @Req() req: Request,
  ) {
    const clientIp = this.getClientIp(req);
    return this.customerAuthService.resendVerificationEmail(body.email, clientIp);
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
