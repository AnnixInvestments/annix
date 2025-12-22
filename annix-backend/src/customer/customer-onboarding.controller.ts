import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerOnboardingService } from './customer-onboarding.service';
import { CustomerAuthGuard } from './guards/customer-auth.guard';

@ApiTags('Customer Onboarding')
@Controller('customer/onboarding')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class CustomerOnboardingController {
  constructor(private readonly onboardingService: CustomerOnboardingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get onboarding status and checklist' })
  @ApiResponse({ status: 200, description: 'Onboarding status retrieved' })
  async getStatus(@Req() req: Request) {
    const customerId = (req as any).customer.id;
    return this.onboardingService.getOnboardingStatus(customerId);
  }

  @Patch('company')
  @ApiOperation({ summary: 'Update company details during onboarding' })
  @ApiResponse({ status: 200, description: 'Company details updated' })
  @ApiResponse({ status: 403, description: 'Cannot update at this stage' })
  async updateCompanyDetails(
    @Body() data: Record<string, any>,
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.onboardingService.updateCompanyDetails(customerId, data, clientIp);
  }

  @Post('save-draft')
  @ApiOperation({ summary: 'Save onboarding progress as draft' })
  @ApiResponse({ status: 200, description: 'Draft saved' })
  async saveDraft(
    @Body() data: Record<string, any>,
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.onboardingService.saveDraft(customerId, data, clientIp);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit onboarding for review' })
  @ApiResponse({ status: 200, description: 'Onboarding submitted' })
  @ApiResponse({ status: 400, description: 'Incomplete details or documents' })
  async submit(@Req() req: Request) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.onboardingService.submitOnboarding(customerId, clientIp);
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
