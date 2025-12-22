import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Request } from 'express';

import { CustomerSupplierService } from './customer-supplier.service';
import { CustomerAuthGuard } from './guards/customer-auth.guard';

@ApiTags('Customer Supplier Management')
@Controller('customer/suppliers')
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class CustomerSupplierController {
  constructor(private readonly supplierService: CustomerSupplierService) {}

  // Preferential Suppliers

  @Get()
  @ApiOperation({ summary: 'Get preferred supplier list' })
  @ApiResponse({ status: 200, description: 'Preferred suppliers retrieved' })
  async getPreferredSuppliers(@Req() req: Request) {
    const customerId = (req as any).customer.id;
    return this.supplierService.getPreferredSuppliers(customerId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a preferred supplier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        supplierProfileId: { type: 'number', description: 'ID of registered supplier (optional)' },
        supplierName: { type: 'string', description: 'Name for unregistered supplier' },
        supplierEmail: { type: 'string', description: 'Email for unregistered supplier' },
        priority: { type: 'number', description: 'Priority order (lower = higher priority)' },
        notes: { type: 'string', description: 'Notes about this supplier' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Supplier added' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 409, description: 'Supplier already exists' })
  async addPreferredSupplier(
    @Body() data: {
      supplierProfileId?: number;
      supplierName?: string;
      supplierEmail?: string;
      priority?: number;
      notes?: string;
    },
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.supplierService.addPreferredSupplier(customerId, data, clientIp);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a preferred supplier' })
  @ApiResponse({ status: 200, description: 'Supplier updated' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async updatePreferredSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: { priority?: number; notes?: string },
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.supplierService.updatePreferredSupplier(customerId, id, data, clientIp);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a preferred supplier' })
  @ApiResponse({ status: 200, description: 'Supplier removed' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async removePreferredSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.supplierService.removePreferredSupplier(customerId, id, clientIp);
  }

  // Invitations

  @Get('invitations')
  @ApiOperation({ summary: 'Get all supplier invitations' })
  @ApiResponse({ status: 200, description: 'Invitations retrieved' })
  async getInvitations(@Req() req: Request) {
    const customerId = (req as any).customer.id;
    return this.supplierService.getInvitations(customerId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Send a supplier invitation' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email' },
        supplierCompanyName: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  @ApiResponse({ status: 400, description: 'Supplier already registered' })
  @ApiResponse({ status: 409, description: 'Active invitation exists' })
  async createInvitation(
    @Body() data: { email: string; supplierCompanyName?: string; message?: string },
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.supplierService.createInvitation(customerId, data, clientIp);
  }

  @Post('invitations/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiResponse({ status: 200, description: 'Invitation cancelled' })
  @ApiResponse({ status: 400, description: 'Cannot cancel non-pending invitation' })
  async cancelInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.supplierService.cancelInvitation(customerId, id, clientIp);
  }

  @Post('invitations/:id/resend')
  @ApiOperation({ summary: 'Resend an invitation' })
  @ApiResponse({ status: 200, description: 'Invitation resent' })
  async resendInvitation(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const customerId = (req as any).customer.id;
    const clientIp = this.getClientIp(req);
    return this.supplierService.resendInvitation(customerId, id, clientIp);
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
