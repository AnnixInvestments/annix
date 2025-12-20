import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BoqService, PaginatedResult } from './boq.service';
import { BoqParserService } from './boq-parser.service';
import { Boq } from './entities/boq.entity';
import { BoqLineItem } from './entities/boq-line-item.entity';
import { CreateBoqDto } from './dto/create-boq.dto';
import { UpdateBoqDto } from './dto/update-boq.dto';
import { CreateBoqLineItemDto } from './dto/create-boq-line-item.dto';
import { UpdateBoqLineItemDto } from './dto/update-boq-line-item.dto';
import { BoqQueryDto } from './dto/boq-query.dto';
import { ReorderLineItemsDto } from './dto/reorder-line-items.dto';
import { UploadBoqDto } from './dto/upload-boq.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('BOQ')
@Controller('boq')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class BoqController {
  constructor(
    private readonly boqService: BoqService,
    private readonly boqParserService: BoqParserService,
  ) {}

  // === CREATE ===

  @Post()
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Create a new BOQ' })
  @ApiResponse({ status: HttpStatus.CREATED, type: Boq })
  async create(@Body() createBoqDto: CreateBoqDto, @Request() req): Promise<Boq> {
    return this.boqService.create(createBoqDto, req.user);
  }

  @Post(':id/line-items')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Add a line item to BOQ' })
  @ApiResponse({ status: HttpStatus.CREATED, type: BoqLineItem })
  async addLineItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() createLineItemDto: CreateBoqLineItemDto,
    @Request() req,
  ): Promise<BoqLineItem> {
    return this.boqService.addLineItem(id, createLineItemDto, req.user);
  }

  @Post(':id/line-items/bulk')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Add multiple line items to BOQ' })
  @ApiResponse({ status: HttpStatus.CREATED, type: [BoqLineItem] })
  async addLineItemsBulk(
    @Param('id', ParseIntPipe) id: number,
    @Body() createLineItemsDto: CreateBoqLineItemDto[],
    @Request() req,
  ): Promise<BoqLineItem[]> {
    return this.boqService.addLineItemsBulk(id, createLineItemsDto, req.user);
  }

  @Post('upload')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload BOQ from Excel or PDF file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel (.xlsx, .xls) or PDF file',
        },
        title: {
          type: 'string',
          description: 'BOQ title',
        },
        description: {
          type: 'string',
          description: 'BOQ description (optional)',
        },
        drawingId: {
          type: 'number',
          description: 'Drawing ID to link (optional)',
        },
        rfqId: {
          type: 'number',
          description: 'RFQ ID to link (optional)',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: Boq })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file or parse error' })
  async uploadBoq(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadBoqDto,
    @Request() req,
  ): Promise<{ boq: Boq; warnings: string[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/pdf',
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.pdf'];
    const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
      throw new BadRequestException(
        'Invalid file type. Please upload an Excel (.xlsx, .xls) or PDF file.',
      );
    }

    // Parse the file
    let parsedData;
    if (fileExtension === '.pdf' || file.mimetype === 'application/pdf') {
      parsedData = this.boqParserService.parsePdf(file.buffer);
    } else {
      parsedData = this.boqParserService.parseExcel(file.buffer);
    }

    // Check for critical errors
    if (parsedData.errors.length > 0 && parsedData.lineItems.length === 0) {
      throw new BadRequestException({
        message: 'Failed to parse file',
        errors: parsedData.errors,
        warnings: parsedData.warnings,
      });
    }

    // Create the BOQ
    const createBoqDto: CreateBoqDto = {
      title: uploadDto.title || parsedData.title || `Imported BOQ - ${file.originalname}`,
      description: uploadDto.description || parsedData.description,
      drawingId: uploadDto.drawingId,
      rfqId: uploadDto.rfqId,
    };

    const boq = await this.boqService.create(createBoqDto, req.user);

    // Add line items
    if (parsedData.lineItems.length > 0) {
      const lineItemDtos: CreateBoqLineItemDto[] = parsedData.lineItems.map((item) => ({
        itemCode: item.itemCode,
        description: item.description,
        itemType: item.itemType as any,
        unitOfMeasure: item.unitOfMeasure,
        quantity: item.quantity,
        unitWeightKg: item.unitWeightKg,
        unitPrice: item.unitPrice,
        notes: item.notes,
        drawingReference: item.drawingReference,
      }));

      await this.boqService.addLineItemsBulk(boq.id, lineItemDtos, req.user);
    }

    // Return the complete BOQ with all warnings
    const fullBoq = await this.boqService.findOne(boq.id);

    return {
      boq: fullBoq,
      warnings: [
        ...parsedData.warnings,
        ...parsedData.errors.map((e) => `Error: ${e}`),
        `Successfully imported ${parsedData.lineItems.length} line items`,
      ],
    };
  }

  // === READ ===

  @Get()
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Get all BOQs with pagination' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@Query() query: BoqQueryDto): Promise<PaginatedResult<Boq>> {
    return this.boqService.findAll(query);
  }

  @Get(':id')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Get BOQ by ID with all line items' })
  @ApiResponse({ status: HttpStatus.OK, type: Boq })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Boq> {
    return this.boqService.findOne(id);
  }

  // === UPDATE ===

  @Patch(':id')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Update BOQ metadata' })
  @ApiResponse({ status: HttpStatus.OK, type: Boq })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBoqDto: UpdateBoqDto,
    @Request() req,
  ): Promise<Boq> {
    return this.boqService.update(id, updateBoqDto, req.user);
  }

  @Patch(':id/line-items/:lineItemId')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Update a BOQ line item' })
  @ApiResponse({ status: HttpStatus.OK, type: BoqLineItem })
  async updateLineItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineItemId', ParseIntPipe) lineItemId: number,
    @Body() updateLineItemDto: UpdateBoqLineItemDto,
    @Request() req,
  ): Promise<BoqLineItem> {
    return this.boqService.updateLineItem(id, lineItemId, updateLineItemDto, req.user);
  }

  @Patch(':id/line-items/reorder')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Reorder BOQ line items' })
  @ApiResponse({ status: HttpStatus.OK, type: [BoqLineItem] })
  async reorderLineItems(
    @Param('id', ParseIntPipe) id: number,
    @Body() reorderDto: ReorderLineItemsDto,
    @Request() req,
  ): Promise<BoqLineItem[]> {
    return this.boqService.reorderLineItems(id, reorderDto, req.user);
  }

  // === DELETE ===

  @Delete(':id')
  @Roles('rfq_administrator', 'admin')
  @ApiOperation({ summary: 'Delete a BOQ (only if in draft status)' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<void> {
    await this.boqService.remove(id, req.user);
  }

  @Delete(':id/line-items/:lineItemId')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Remove a line item from BOQ' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async removeLineItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineItemId', ParseIntPipe) lineItemId: number,
    @Request() req,
  ): Promise<void> {
    await this.boqService.removeLineItem(id, lineItemId, req.user);
  }

  // === LINK TO DRAWING ===

  @Post(':id/link-drawing/:drawingId')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Link BOQ to a drawing' })
  @ApiResponse({ status: HttpStatus.OK, type: Boq })
  async linkToDrawing(
    @Param('id', ParseIntPipe) id: number,
    @Param('drawingId', ParseIntPipe) drawingId: number,
    @Request() req,
  ): Promise<Boq> {
    return this.boqService.linkToDrawing(id, drawingId, req.user);
  }
}
