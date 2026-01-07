import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SupplierAuthGuard } from './guards/supplier-auth.guard';
import { BoqDistributionService } from '../boq/boq-distribution.service';
import { SupplierBoqStatus } from '../boq/entities/boq-supplier-access.entity';

class DeclineBoqDto {
  reason: string;
}

@ApiTags('Supplier BOQs')
@Controller('supplier/boqs')
@UseGuards(SupplierAuthGuard)
@ApiBearerAuth()
export class SupplierBoqController {
  constructor(private readonly distributionService: BoqDistributionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all BOQs assigned to the supplier' })
  @ApiQuery({ name: 'status', required: false, enum: SupplierBoqStatus })
  @ApiResponse({
    status: 200,
    description: 'List of BOQs assigned to supplier',
  })
  async getMyBoqs(
    @Request() req: any,
    @Query('status') status?: SupplierBoqStatus,
  ) {
    const supplierProfileId = req.supplierProfile.id;

    const boqs = await this.distributionService.getSupplierBoqs(
      supplierProfileId,
      status,
    );

    return boqs.map(({ access, boq, sectionSummary }) => ({
      id: boq.id,
      boqNumber: boq.boqNumber,
      title: boq.title,
      status: access.status,
      projectInfo: access.projectInfo,
      customerInfo: access.customerInfo,
      sections: sectionSummary,
      viewedAt: access.viewedAt,
      respondedAt: access.respondedAt,
      notificationSentAt: access.notificationSentAt,
      createdAt: access.createdAt,
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get filtered BOQ details (only allowed sections)' })
  @ApiResponse({
    status: 200,
    description: 'Filtered BOQ details for supplier',
  })
  async getBoqDetails(
    @Request() req: any,
    @Param('id', ParseIntPipe) boqId: number,
  ) {
    const supplierProfileId = req.supplierProfile.id;

    const { boq, sections, access } =
      await this.distributionService.getFilteredBoqForSupplier(
        boqId,
        supplierProfileId,
      );

    // Auto-mark as viewed on first access
    if (!access.viewedAt) {
      await this.distributionService.markAsViewed(boqId, supplierProfileId);
    }

    return {
      boq: {
        id: boq.id,
        boqNumber: boq.boqNumber,
        title: boq.title,
        description: boq.description,
        status: boq.status,
      },
      projectInfo: access.projectInfo,
      customerInfo: access.customerInfo,
      accessStatus: access.status,
      viewedAt: access.viewedAt || new Date(),
      sections: sections.map((section) => ({
        id: section.id,
        sectionType: section.sectionType,
        sectionTitle: section.sectionTitle,
        items: section.items,
        totalWeightKg: section.totalWeightKg,
        itemCount: section.itemCount,
      })),
    };
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark BOQ as viewed' })
  @ApiResponse({
    status: 200,
    description: 'BOQ marked as viewed',
  })
  async markAsViewed(
    @Request() req: any,
    @Param('id', ParseIntPipe) boqId: number,
  ) {
    const supplierProfileId = req.supplierProfile.id;
    const access = await this.distributionService.markAsViewed(
      boqId,
      supplierProfileId,
    );

    return {
      success: true,
      viewedAt: access.viewedAt,
      status: access.status,
    };
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline to quote on BOQ' })
  @ApiResponse({
    status: 200,
    description: 'BOQ declined',
  })
  async declineBoq(
    @Request() req: any,
    @Param('id', ParseIntPipe) boqId: number,
    @Body() body: DeclineBoqDto,
  ) {
    const supplierProfileId = req.supplierProfile.id;
    const access = await this.distributionService.declineBoq(
      boqId,
      supplierProfileId,
      body.reason,
    );

    return {
      success: true,
      status: access.status,
      respondedAt: access.respondedAt,
    };
  }
}
