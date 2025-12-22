import {
  Controller,
  Get,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerService } from './customer.service';
import { CustomerAuthGuard } from './guards/customer-auth.guard';
import { CustomerDeviceGuard } from './guards/customer-device.guard';
import {
  UpdateCustomerProfileDto,
  UpdateCompanyAddressDto,
  ChangePasswordDto,
  CustomerProfileResponseDto,
} from './dto';

@ApiTags('Customer Portal')
@Controller('customer')
@UseGuards(CustomerAuthGuard, CustomerDeviceGuard)
@ApiBearerAuth()
@ApiHeader({
  name: 'x-device-fingerprint',
  description: 'Device fingerprint for verification',
  required: true,
})
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get customer profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved', type: CustomerProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: Request): Promise<CustomerProfileResponseDto> {
    const customerId = req['customer'].customerId;
    return this.customerService.getProfile(customerId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update customer profile (limited fields)' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: CustomerProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @Req() req: Request,
  ): Promise<CustomerProfileResponseDto> {
    const customerId = req['customer'].customerId;
    const clientIp = this.getClientIp(req);
    return this.customerService.updateProfile(customerId, dto, clientIp);
  }

  @Get('company')
  @ApiOperation({ summary: 'Get company details' })
  @ApiResponse({ status: 200, description: 'Company retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCompany(@Req() req: Request) {
    const customerId = req['customer'].customerId;
    return this.customerService.getCompany(customerId);
  }

  @Patch('company/address')
  @ApiOperation({ summary: 'Update company address (limited fields)' })
  @ApiResponse({ status: 200, description: 'Company address updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCompanyAddress(
    @Body() dto: UpdateCompanyAddressDto,
    @Req() req: Request,
  ) {
    const customerId = req['customer'].customerId;
    const clientIp = this.getClientIp(req);
    return this.customerService.updateCompanyAddress(customerId, dto, clientIp);
  }

  @Patch('profile/password')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    const customerId = req['customer'].customerId;
    const clientIp = this.getClientIp(req);
    return this.customerService.changePassword(customerId, dto, clientIp);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get customer dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboard(@Req() req: Request) {
    const customerId = req['customer'].customerId;
    return this.customerService.getDashboard(customerId);
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
}
