import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  StreamableFile,
  Response,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
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
} from './dto/admin-rfq.dto';

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
  async getAllRfqs(@Query() queryDto: RfqQueryDto): Promise<RfqListResponseDto> {
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
  async getRfqDetail(@Param('id', ParseIntPipe) id: number): Promise<RfqDetailDto> {
    return this.rfqService.getRfqDetail(id);
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
    const { file, fileName, mimeType } = await this.rfqService.downloadDocument(
      documentId,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    });

    return file;
  }
}
