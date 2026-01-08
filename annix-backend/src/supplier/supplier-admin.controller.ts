import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';

import { SupplierAdminService } from './supplier-admin.service';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EmailService } from '../email/email.service';
import {
  RejectSupplierDto,
  SuspendSupplierDto,
  ReviewDocumentDto,
} from './dto';
import { SupplierOnboardingStatus } from './entities';

@ApiTags('Admin - Supplier Management')
@Controller('admin/suppliers')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('admin', 'employee')
@ApiBearerAuth()
export class SupplierAdminController {
  constructor(
    private readonly supplierAdminService: SupplierAdminService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all suppliers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SupplierOnboardingStatus })
  @ApiResponse({ status: 200, description: 'Suppliers list retrieved' })
  async getAllSuppliers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: SupplierOnboardingStatus,
  ) {
    return this.supplierAdminService.getAllSuppliers(
      page || 1,
      limit || 20,
      status,
    );
  }

  @Get('pending-review')
  @ApiOperation({ summary: 'Get suppliers pending review' })
  @ApiResponse({ status: 200, description: 'Pending suppliers retrieved' })
  async getPendingReview() {
    return this.supplierAdminService.getPendingReview();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details' })
  @ApiResponse({ status: 200, description: 'Supplier details retrieved' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async getSupplierDetails(@Param('id', ParseIntPipe) id: number) {
    return this.supplierAdminService.getSupplierDetails(id);
  }

  @Patch(':id/documents/:docId/review')
  @ApiOperation({ summary: 'Review supplier document' })
  @ApiResponse({ status: 200, description: 'Document reviewed' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async reviewDocument(
    @Param('id', ParseIntPipe) supplierId: number,
    @Param('docId', ParseIntPipe) documentId: number,
    @Body() dto: ReviewDocumentDto,
    @Req() req: Request,
  ) {
    const adminUserId = req['user'].userId;
    const clientIp = this.getClientIp(req);
    return this.supplierAdminService.reviewDocument(
      supplierId,
      documentId,
      dto,
      adminUserId,
      clientIp,
    );
  }

  @Post(':id/start-review')
  @ApiOperation({ summary: 'Start reviewing supplier onboarding' })
  @ApiResponse({ status: 200, description: 'Review started' })
  async startReview(
    @Param('id', ParseIntPipe) supplierId: number,
    @Req() req: Request,
  ) {
    const adminUserId = req['user'].userId;
    const clientIp = this.getClientIp(req);
    return this.supplierAdminService.startReview(
      supplierId,
      adminUserId,
      clientIp,
    );
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve supplier onboarding' })
  @ApiResponse({ status: 200, description: 'Supplier approved' })
  @ApiResponse({ status: 400, description: 'Cannot approve in current status' })
  async approveOnboarding(
    @Param('id', ParseIntPipe) supplierId: number,
    @Req() req: Request,
  ) {
    const adminUserId = req['user'].userId;
    const clientIp = this.getClientIp(req);
    return this.supplierAdminService.approveOnboarding(
      supplierId,
      adminUserId,
      clientIp,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject supplier onboarding' })
  @ApiResponse({ status: 200, description: 'Supplier rejected' })
  @ApiResponse({ status: 400, description: 'Cannot reject in current status' })
  async rejectOnboarding(
    @Param('id', ParseIntPipe) supplierId: number,
    @Body() dto: RejectSupplierDto,
    @Req() req: Request,
  ) {
    const adminUserId = req['user'].userId;
    const clientIp = this.getClientIp(req);
    return this.supplierAdminService.rejectOnboarding(
      supplierId,
      dto,
      adminUserId,
      clientIp,
    );
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend supplier account' })
  @ApiResponse({ status: 200, description: 'Supplier suspended' })
  async suspendSupplier(
    @Param('id', ParseIntPipe) supplierId: number,
    @Body() dto: SuspendSupplierDto,
    @Req() req: Request,
  ) {
    const adminUserId = req['user'].userId;
    const clientIp = this.getClientIp(req);
    return this.supplierAdminService.suspendSupplier(
      supplierId,
      dto,
      adminUserId,
      clientIp,
    );
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate supplier account' })
  @ApiResponse({ status: 200, description: 'Supplier reactivated' })
  async reactivateSupplier(
    @Param('id', ParseIntPipe) supplierId: number,
    @Req() req: Request,
  ) {
    const adminUserId = req['user'].userId;
    const clientIp = this.getClientIp(req);
    return this.supplierAdminService.reactivateSupplier(
      supplierId,
      adminUserId,
      clientIp,
    );
  }

  @Post('invite')
  @ApiOperation({ summary: 'Send supplier invitation email' })
  @ApiResponse({ status: 200, description: 'Invitation sent' })
  async inviteSupplier(
    @Body() body: { email: string; message?: string },
    @Req() req: Request,
  ) {
    const adminName = req['user']?.firstName
      ? `${req['user'].firstName} ${req['user'].lastName || ''}`.trim()
      : 'Annix Admin';

    const success = await this.emailService.sendSupplierAdminInvitationEmail(
      body.email,
      adminName,
      body.message,
    );

    return {
      success,
      message: success
        ? `Invitation sent to ${body.email}`
        : 'Failed to send invitation',
    };
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
