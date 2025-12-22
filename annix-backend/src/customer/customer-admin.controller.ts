import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerAdminService } from './customer-admin.service';
import {
  CustomerQueryDto,
  SuspendCustomerDto,
  ReactivateCustomerDto,
  ResetDeviceBindingDto,
  CustomerListResponseDto,
  CustomerDetailDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Customer Administration')
@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class CustomerAdminController {
  constructor(private readonly customerAdminService: CustomerAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Customer list', type: CustomerListResponseDto })
  @ApiQuery({ name: 'search', required: false, description: 'Search by company name or email' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by account status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async listCustomers(
    @Query() query: CustomerQueryDto,
  ): Promise<CustomerListResponseDto> {
    return this.customerAdminService.listCustomers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer details', type: CustomerDetailDto })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CustomerDetailDto> {
    return this.customerAdminService.getCustomerDetail(id);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend customer account' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Account suspended' })
  @ApiResponse({ status: 400, description: 'Account already suspended' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async suspendCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendCustomerDto,
    @Req() req: Request,
  ) {
    const adminUserId = req['user']?.sub || req['user']?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.suspendCustomer(id, dto, adminUserId, clientIp);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate suspended customer account' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Account reactivated' })
  @ApiResponse({ status: 400, description: 'Account already active' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async reactivateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReactivateCustomerDto,
    @Req() req: Request,
  ) {
    const adminUserId = req['user']?.sub || req['user']?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.reactivateCustomer(id, dto, adminUserId, clientIp);
  }

  @Post(':id/reset-device')
  @ApiOperation({ summary: 'Reset customer device binding' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Device binding reset' })
  @ApiResponse({ status: 400, description: 'No active device binding' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async resetDeviceBinding(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetDeviceBindingDto,
    @Req() req: Request,
  ) {
    const adminUserId = req['user']?.sub || req['user']?.id;
    const clientIp = this.getClientIp(req);
    return this.customerAdminService.resetDeviceBinding(id, dto, adminUserId, clientIp);
  }

  @Get(':id/login-history')
  @ApiOperation({ summary: 'Get customer login history' })
  @ApiParam({ name: 'id', description: 'Customer ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records to return' })
  @ApiResponse({ status: 200, description: 'Login history' })
  async getLoginHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: number,
  ) {
    return this.customerAdminService.getLoginHistory(id, limit || 50);
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
