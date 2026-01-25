import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  StreamableFile,
  Response,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import {
  Response as ExpressResponse,
  Request as ExpressRequest,
} from 'express';
import { AdminRfqService } from './admin-rfq.service';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  RfqQueryDto,
  RfqListResponseDto,
  RfqDetailDto,
  RfqItemDetailDto,
  RfqDocumentDto,
  RfqFullDraftDto,
} from './dto/admin-rfq.dto';
import { CreateUnifiedRfqDto } from '../rfq/dto/create-unified-rfq.dto';
import { SaveRfqDraftDto, RfqDraftResponseDto } from '../rfq/dto/rfq-draft.dto';
import { Rfq } from '../rfq/entities/rfq.entity';

@ApiTags('Admin RFQ Management')
@Controller('admin/rfqs')
@UseGuards(AdminAuthGuard, RolesGuard)
@Roles('admin', 'employee')
@ApiBearerAuth()
export class AdminRfqController {
  constructor(private readonly rfqService: AdminRfqService) {}

  @Get()
  @ApiOperation({ summary: 'Get all RFQs (paginated, filterable) - VIEW ONLY' })
  @ApiResponse({
    status: 200,
    description: 'RFQs retrieved successfully',
    type: RfqListResponseDto,
  })
  async getAllRfqs(
    @Query() queryDto: RfqQueryDto,
  ): Promise<RfqListResponseDto> {
    return this.rfqService.getAllRfqs(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ detail by ID - VIEW ONLY' })
  @ApiResponse({
    status: 200,
    description: 'RFQ detail retrieved successfully',
    type: RfqDetailDto,
  })
  @ApiResponse({ status: 404, description: 'RFQ not found' })
  async getRfqDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RfqDetailDto> {
    return this.rfqService.getRfqDetail(id);
  }

  @Get(':id/full')
  @ApiOperation({ summary: 'Get full RFQ draft data for editing' })
  @ApiResponse({
    status: 200,
    description: 'Full RFQ draft retrieved successfully',
    type: RfqFullDraftDto,
  })
  @ApiResponse({ status: 404, description: 'RFQ not found' })
  async getRfqFullDraft(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RfqFullDraftDto> {
    return this.rfqService.getRfqFullDraft(id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get RFQ items with specifications - VIEW ONLY' })
  @ApiResponse({
    status: 200,
    description: 'RFQ items retrieved successfully',
    type: [RfqItemDetailDto],
  })
  @ApiResponse({ status: 404, description: 'RFQ not found' })
  async getRfqItems(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RfqItemDetailDto[]> {
    return this.rfqService.getRfqItems(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get RFQ documents - VIEW ONLY' })
  @ApiResponse({
    status: 200,
    description: 'RFQ documents retrieved successfully',
    type: [RfqDocumentDto],
  })
  @ApiResponse({ status: 404, description: 'RFQ not found' })
  async getRfqDocuments(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RfqDocumentDto[]> {
    return this.rfqService.getRfqDocuments(id);
  }

  @Get('documents/:documentId')
  @ApiOperation({ summary: 'Download RFQ document - VIEW ONLY' })
  @ApiResponse({
    status: 200,
    description: 'Document downloaded successfully',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async downloadDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<StreamableFile> {
    const { file, fileName, mimeType } =
      await this.rfqService.downloadDocument(documentId);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return file;
  }

  @Put(':id/unified')
  @ApiOperation({
    summary: 'Update RFQ as admin',
    description:
      'Update a customer RFQ with new items and data. Admin-only endpoint that bypasses customer authentication.',
  })
  @ApiParam({ name: 'id', description: 'RFQ ID', type: Number })
  @ApiBody({ type: CreateUnifiedRfqDto })
  @ApiResponse({
    status: 200,
    description: 'RFQ updated successfully',
  })
  @ApiResponse({ status: 404, description: 'RFQ not found' })
  async updateRfq(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateUnifiedRfqDto,
  ): Promise<{ rfq: Rfq; itemsUpdated: number }> {
    return this.rfqService.updateRfq(id, dto);
  }

  @Post('drafts')
  @ApiOperation({
    summary: 'Save RFQ draft as admin',
    description:
      'Save or update a customer RFQ draft. Admin-only endpoint that bypasses customer authentication.',
  })
  @ApiBody({ type: SaveRfqDraftDto })
  @ApiResponse({
    status: 200,
    description: 'Draft saved successfully',
    type: RfqDraftResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Draft not found' })
  async saveDraft(@Body() dto: SaveRfqDraftDto): Promise<RfqDraftResponseDto> {
    return this.rfqService.saveDraft(dto);
  }
}
