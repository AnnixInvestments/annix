import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { CreateStraightPipeRfqWithItemDto } from './dto/create-rfq-item.dto';
import { CreateBendRfqWithItemDto } from './dto/create-bend-rfq-with-item.dto';
import { CreateBendRfqDto } from './dto/create-bend-rfq.dto';
import {
  StraightPipeCalculationResultDto,
  RfqResponseDto,
} from './dto/rfq-response.dto';
import { BendCalculationResultDto } from './dto/bend-calculation-result.dto';
import { RfqDocumentResponseDto } from './dto/rfq-document.dto';
import {
  SaveRfqDraftDto,
  RfqDraftResponseDto,
  RfqDraftFullResponseDto,
} from './dto/rfq-draft.dto';
import { Rfq } from './entities/rfq.entity';
import { CustomerAuthGuard } from '../customer/guards/customer-auth.guard';

@ApiTags('RFQ')
@Controller('rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post('straight-pipe/calculate')
  @ApiOperation({
    summary: 'Calculate straight pipe requirements',
    description:
      'Calculate pipe weight, quantities, and welding requirements for straight pipe RFQ',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Calculation completed successfully',
    type: StraightPipeCalculationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pipe dimension or steel specification not found',
  })
  @ApiBody({
    description: 'Straight pipe specifications for calculation',
    schema: {
      type: 'object',
      properties: {
        nominalBoreMm: {
          type: 'number',
          example: 500,
          description: 'Nominal bore in mm',
        },
        scheduleType: {
          type: 'string',
          enum: ['schedule', 'wall_thickness'],
          example: 'schedule',
        },
        scheduleNumber: {
          type: 'string',
          example: 'Sch20',
          description: 'Schedule number if scheduleType is schedule',
        },
        wallThicknessMm: {
          type: 'number',
          example: 15.09,
          description: 'Wall thickness in mm if scheduleType is wall_thickness',
        },
        individualPipeLength: {
          type: 'number',
          example: 12.192,
          description: 'Length of each individual pipe',
        },
        lengthUnit: {
          type: 'string',
          enum: ['meters', 'feet'],
          example: 'meters',
        },
        quantityType: {
          type: 'string',
          enum: ['total_length', 'number_of_pipes'],
          example: 'total_length',
        },
        quantityValue: {
          type: 'number',
          example: 8000,
          description: 'Total length in meters/feet or number of pipes',
        },
        workingPressureBar: {
          type: 'number',
          example: 10,
          description: 'Working pressure in bar',
        },
        workingTemperatureC: {
          type: 'number',
          example: 120,
          description: 'Working temperature in celsius',
        },
        steelSpecificationId: {
          type: 'number',
          example: 1,
          description: 'Steel specification ID (optional)',
        },
        flangeStandardId: {
          type: 'number',
          example: 1,
          description: 'Flange standard ID (optional)',
        },
        flangePressureClassId: {
          type: 'number',
          example: 1,
          description: 'Flange pressure class ID (optional)',
        },
      },
      required: [
        'nominalBoreMm',
        'scheduleType',
        'individualPipeLength',
        'lengthUnit',
        'quantityType',
        'quantityValue',
        'workingPressureBar',
      ],
    },
  })
  async calculateStraightPipeRequirements(
    @Body() dto: CreateStraightPipeRfqWithItemDto['straightPipe'],
  ): Promise<StraightPipeCalculationResultDto> {
    return this.rfqService.calculateStraightPipeRequirements(dto);
  }

  @Post('straight-pipe')
  @ApiOperation({
    summary: 'Create straight pipe RFQ',
    description:
      'Create a new RFQ for straight pipe with automatic calculations',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'RFQ created successfully',
    schema: {
      type: 'object',
      properties: {
        rfq: {
          $ref: '#/components/schemas/Rfq',
        },
        calculation: {
          $ref: '#/components/schemas/StraightPipeCalculationResultDto',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User, pipe dimension, or steel specification not found',
  })
  @ApiBody({
    description: 'Complete straight pipe RFQ data',
    type: CreateStraightPipeRfqWithItemDto,
    examples: {
      example1: {
        summary: 'Example straight pipe RFQ',
        description: 'A complete example for 500NB Sch20 pipeline',
        value: {
          rfq: {
            projectName: '500NB Pipeline Extension',
            description:
              'Extension of existing pipeline system with carbon steel pipe',
            customerName: 'Acme Industrial Solutions',
            customerEmail: 'procurement@acme-industrial.co.za',
            customerPhone: '+27 11 555 0123',
            requiredDate: '2025-12-31',
            status: 'draft',
            notes: 'Urgent delivery required by month end',
          },
          straightPipe: {
            nominalBoreMm: 500,
            scheduleType: 'schedule',
            scheduleNumber: 'Sch20',
            individualPipeLength: 12.192,
            lengthUnit: 'meters',
            quantityType: 'total_length',
            quantityValue: 8000,
            workingPressureBar: 10,
            workingTemperatureC: 120,
            steelSpecificationId: 1,
            flangeStandardId: 1,
            flangePressureClassId: 1,
          },
          itemDescription: '500NB Sch20 Straight Pipe for 10 Bar Pipeline',
          itemNotes: 'All pipes to be hydrostatically tested before delivery',
        },
      },
    },
  })
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  async createStraightPipeRfq(
    @Body() dto: CreateStraightPipeRfqWithItemDto,
    @Req() req: Request,
  ): Promise<{ rfq: Rfq; calculation: StraightPipeCalculationResultDto }> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.createStraightPipeRfq(dto, userId);
  }

  @Post('bend/calculate')
  @ApiOperation({
    summary: 'Calculate bend requirements',
    description:
      'Calculate bend weight, center-to-face dimensions, welding requirements, and pricing for bend RFQ',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bend calculation completed successfully',
    type: BendCalculationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Bend data, pipe dimension, or steel specification not found',
  })
  @ApiBody({
    description: 'Bend specifications for calculation',
    type: CreateBendRfqDto,
  })
  async calculateBendRequirements(
    @Body() dto: CreateBendRfqDto,
  ): Promise<BendCalculationResultDto> {
    return this.rfqService.calculateBendRequirements(dto);
  }

  @Post('bend')
  @ApiOperation({
    summary: 'Create bend RFQ',
    description:
      'Create a new RFQ for bends/elbows with automatic calculations including center-to-face, weights, and welding requirements',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Bend RFQ created successfully',
    schema: {
      type: 'object',
      properties: {
        rfq: {
          $ref: '#/components/schemas/Rfq',
        },
        calculation: {
          $ref: '#/components/schemas/BendCalculationResultDto',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'User, bend data, pipe dimension, or steel specification not found',
  })
  @ApiBody({
    description: 'Complete bend RFQ data',
    type: CreateBendRfqWithItemDto,
    examples: {
      example1: {
        summary: 'Example bend RFQ - 350NB 3D 45° with tangent',
        value: {
          rfq: {
            projectName: '350NB Pipeline Bend Extension',
            description: 'Bend for pipeline direction change',
            customerName: 'Industrial Solutions Ltd',
            customerEmail: 'procurement@industrial.co.za',
            customerPhone: '+27 11 555 0456',
            requiredDate: '2025-12-15',
            status: 'draft',
            notes: 'Special coating requirements',
          },
          bend: {
            nominalBoreMm: 350,
            scheduleNumber: 'Sch30',
            bendType: '3D',
            bendDegrees: 45,
            numberOfTangents: 1,
            tangentLengths: [400],
            quantityValue: 1,
            quantityType: 'number_of_items',
            workingPressureBar: 16,
            workingTemperatureC: 20,
            steelSpecificationId: 2,
            useGlobalFlangeSpecs: true,
          },
          itemDescription:
            '350NB 3D 45° Pulled Bend, Sch30 with 1 tangent of 400mm for 16 Bar Line',
          itemNotes: 'Requires special surface treatment and inspection',
        },
      },
    },
  })
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  async createBendRfq(
    @Body() dto: CreateBendRfqWithItemDto,
    @Req() req: Request,
  ): Promise<{ rfq: Rfq; calculation: BendCalculationResultDto }> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.createBendRfq(dto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all RFQs',
    description: 'Get all RFQs created by the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQs retrieved successfully',
    type: [RfqResponseDto],
  })
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  async getAllRfqs(@Req() req: Request): Promise<RfqResponseDto[]> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.findAllRfqs(userId);
  }

  // ==================== Draft Endpoints ====================
  // NOTE: Draft routes must be defined BEFORE :id routes to avoid route conflicts

  @Post('drafts')
  @ApiOperation({
    summary: 'Save RFQ draft',
    description: 'Save or update an RFQ draft with form progress',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Draft saved successfully',
    type: RfqDraftResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or draft not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update converted draft',
  })
  @ApiBody({
    description: 'RFQ draft data to save',
    type: SaveRfqDraftDto,
    examples: {
      example1: {
        summary: 'Save new draft',
        value: {
          projectName: 'Pipeline Extension Project',
          currentStep: 2,
          formData: {
            projectName: 'Pipeline Extension Project',
            customerName: 'Acme Corp',
            requiredByDate: '2025-12-31',
            deliveryLocation: 'Johannesburg',
          },
          globalSpecs: {
            steelSpec: 'ASTM A106 Gr.B',
            steelGrade: 'Grade B',
            workingPressure: 10,
            workingTemperature: 120,
          },
          requiredProducts: ['fabricated_steel', 'surface_protection'],
          straightPipeEntries: [],
        },
      },
    },
  })
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  async saveDraft(
    @Body() dto: SaveRfqDraftDto,
    @Req() req: Request,
  ): Promise<RfqDraftResponseDto> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.saveDraft(dto, userId);
  }

  @Get('drafts')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all drafts',
    description: 'Get all RFQ drafts for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Drafts retrieved successfully',
    type: [RfqDraftResponseDto],
  })
  async getDrafts(@Req() req: Request): Promise<RfqDraftResponseDto[]> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.getDrafts(userId);
  }

  @Get('drafts/number/:draftNumber')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get draft by draft number',
    description: 'Get a specific RFQ draft by its draft number',
  })
  @ApiParam({
    name: 'draftNumber',
    description: 'Draft number (e.g., DRAFT-2025-0001)',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Draft retrieved successfully',
    type: RfqDraftFullResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Draft not found',
  })
  async getDraftByNumber(
    @Param('draftNumber') draftNumber: string,
    @Req() req: Request,
  ): Promise<RfqDraftFullResponseDto> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.getDraftByNumber(draftNumber, userId);
  }

  @Get('drafts/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get draft by ID',
    description: 'Get a specific RFQ draft with full form data',
  })
  @ApiParam({ name: 'id', description: 'Draft ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Draft retrieved successfully',
    type: RfqDraftFullResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Draft not found',
  })
  async getDraftById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<RfqDraftFullResponseDto> {
    const userId = (req as any).customer?.userId;
    return this.rfqService.getDraftById(id, userId);
  }

  @Delete('drafts/:id')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete draft',
    description: 'Delete an RFQ draft',
  })
  @ApiParam({ name: 'id', description: 'Draft ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Draft deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Draft not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete converted draft',
  })
  async deleteDraft(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const userId = (req as any).customer?.userId;
    await this.rfqService.deleteDraft(id, userId);
    return { message: 'Draft deleted successfully' };
  }

  // ==================== RFQ by ID (must come after /drafts routes) ====================

  @Get(':id')
  @ApiOperation({
    summary: 'Get RFQ by ID',
    description:
      'Get detailed RFQ information including all items and calculations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'RFQ retrieved successfully',
    type: Rfq,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RFQ not found',
  })
  async getRfqById(@Param('id') id: number): Promise<Rfq> {
    return this.rfqService.findRfqById(id);
  }

  // ==================== Document Endpoints ====================

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    }),
  )
  @ApiOperation({
    summary: 'Upload document to RFQ',
    description:
      'Upload a document file (PDF, Excel, Word, etc.) to an RFQ. Maximum 10 documents per RFQ, 50MB per file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'RFQ ID', type: Number })
  @ApiBody({
    description: 'Document file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The document file (PDF, Excel, Word, images, etc.)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document uploaded successfully',
    type: RfqDocumentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'File too large or document limit reached',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RFQ not found',
  })
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RfqDocumentResponseDto> {
    return this.rfqService.uploadDocument(id, file);
  }

  @Get(':id/documents')
  @ApiOperation({
    summary: 'Get all documents for RFQ',
    description: 'Retrieve list of all documents attached to an RFQ',
  })
  @ApiParam({ name: 'id', description: 'RFQ ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Documents retrieved successfully',
    type: [RfqDocumentResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'RFQ not found',
  })
  async getDocuments(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RfqDocumentResponseDto[]> {
    return this.rfqService.getDocuments(id);
  }

  @Get('documents/:documentId/download')
  @ApiOperation({
    summary: 'Download document',
    description: 'Download a specific document by its ID',
  })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document file',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  async downloadDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, document } =
      await this.rfqService.downloadDocument(documentId);

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(document.filename)}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Delete('documents/:documentId')
  @ApiOperation({
    summary: 'Delete document',
    description: 'Delete a document from an RFQ',
  })
  @ApiParam({ name: 'documentId', description: 'Document ID', type: Number })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Document not found',
  })
  async deleteDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
  ): Promise<{ message: string }> {
    await this.rfqService.deleteDocument(documentId);
    return { message: 'Document deleted successfully' };
  }
}
