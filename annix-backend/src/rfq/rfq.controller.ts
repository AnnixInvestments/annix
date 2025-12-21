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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { RfqService } from './rfq.service';
import { CreateStraightPipeRfqWithItemDto } from './dto/create-rfq-item.dto';
import { CreateBendRfqWithItemDto } from './dto/create-bend-rfq-with-item.dto';
import { CreateBendRfqDto } from './dto/create-bend-rfq.dto';
import { StraightPipeCalculationResultDto, RfqResponseDto } from './dto/rfq-response.dto';
import { BendCalculationResultDto } from './dto/bend-calculation-result.dto';
import { RfqDocumentResponseDto } from './dto/rfq-document.dto';
import { Rfq } from './entities/rfq.entity';

@ApiTags('RFQ')
@Controller('rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post('straight-pipe/calculate')
  @ApiOperation({
    summary: 'Calculate straight pipe requirements',
    description: 'Calculate pipe weight, quantities, and welding requirements for straight pipe RFQ',
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
    description: 'Create a new RFQ for straight pipe with automatic calculations',
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
            description: 'Extension of existing pipeline system with carbon steel pipe',
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
  async createStraightPipeRfq(
    @Body() dto: CreateStraightPipeRfqWithItemDto,
  ): Promise<{ rfq: Rfq; calculation: StraightPipeCalculationResultDto }> {
    // For demo purposes, use a default user ID (1) when auth is disabled
    const userId = 1;
    return this.rfqService.createStraightPipeRfq(dto, userId);
  }

  @Post('bend/calculate')
  @ApiOperation({
    summary: 'Calculate bend requirements',
    description: 'Calculate bend weight, center-to-face dimensions, welding requirements, and pricing for bend RFQ',
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
    description: 'Create a new RFQ for bends/elbows with automatic calculations including center-to-face, weights, and welding requirements',
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
    description: 'User, bend data, pipe dimension, or steel specification not found',
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
          itemDescription: '350NB 3D 45° Pulled Bend, Sch30 with 1 tangent of 400mm for 16 Bar Line',
          itemNotes: 'Requires special surface treatment and inspection',
        },
      },
    },
  })
  async createBendRfq(
    @Body() dto: CreateBendRfqWithItemDto,
  ): Promise<{ rfq: Rfq; calculation: BendCalculationResultDto }> {
    // For demo purposes, use a default user ID (1) when auth is disabled
    const userId = 1;
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
  async getAllRfqs(): Promise<RfqResponseDto[]> {
    // For demo purposes, use a default user ID (1) when auth is disabled
    const userId = 1;
    return this.rfqService.findAllRfqs(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get RFQ by ID',
    description: 'Get detailed RFQ information including all items and calculations',
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
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  }))
  @ApiOperation({
    summary: 'Upload document to RFQ',
    description: 'Upload a document file (PDF, Excel, Word, etc.) to an RFQ. Maximum 10 documents per RFQ, 50MB per file.',
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
    const { buffer, document } = await this.rfqService.downloadDocument(documentId);

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
