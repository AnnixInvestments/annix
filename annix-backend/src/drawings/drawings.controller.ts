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
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Res,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DrawingsService, PaginatedResult } from './drawings.service';
import { DrawingAnalyzerService, DrawingAnalysisResult } from './drawing-analyzer.service';
import { Drawing } from './entities/drawing.entity';
import { DrawingVersion } from './entities/drawing-version.entity';
import { DrawingComment } from './entities/drawing-comment.entity';
import { CreateDrawingDto } from './dto/create-drawing.dto';
import { UpdateDrawingDto } from './dto/update-drawing.dto';
import { UploadVersionDto } from './dto/upload-version.dto';
import { CreateDrawingCommentDto } from './dto/create-drawing-comment.dto';
import { DrawingQueryDto } from './dto/drawing-query.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Drawings')
@Controller('drawings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class DrawingsController {
  constructor(
    private readonly drawingsService: DrawingsService,
    private readonly analyzerService: DrawingAnalyzerService,
  ) {}

  // === UPLOAD & CREATE ===

  @Post('upload')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new drawing' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        rfqId: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: Drawing })
  async uploadDrawing(
    @UploadedFile() file: Express.Multer.File,
    @Body() createDrawingDto: CreateDrawingDto,
    @Request() req,
  ): Promise<Drawing> {
    return this.drawingsService.uploadDrawing(file, createDrawingDto, req.user);
  }

  @Post(':id/version')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new version of an existing drawing' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        changeNotes: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: DrawingVersion })
  async uploadNewVersion(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadVersionDto: UploadVersionDto,
    @Request() req,
  ): Promise<DrawingVersion> {
    return this.drawingsService.uploadNewVersion(id, file, uploadVersionDto, req.user);
  }

  // === READ ===

  @Get()
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Get all drawings with pagination and filtering' })
  @ApiResponse({ status: HttpStatus.OK })
  async findAll(@Query() query: DrawingQueryDto): Promise<PaginatedResult<Drawing>> {
    return this.drawingsService.findAll(query);
  }

  @Get(':id')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Get drawing by ID with all versions' })
  @ApiResponse({ status: HttpStatus.OK, type: Drawing })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Drawing> {
    return this.drawingsService.findOne(id);
  }

  @Get(':id/download')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Download drawing file' })
  @ApiResponse({ status: HttpStatus.OK })
  async downloadDrawing(
    @Param('id', ParseIntPipe) id: number,
    @Query('version') version: number,
    @Request() req,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, mimeType } = await this.drawingsService.downloadFile(
      id,
      version,
      req.user,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Get(':id/versions')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Get version history for a drawing' })
  @ApiResponse({ status: HttpStatus.OK, type: [DrawingVersion] })
  async getVersionHistory(@Param('id', ParseIntPipe) id: number): Promise<DrawingVersion[]> {
    return this.drawingsService.getVersionHistory(id);
  }

  // === UPDATE ===

  @Patch(':id')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Update drawing metadata' })
  @ApiResponse({ status: HttpStatus.OK, type: Drawing })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDrawingDto: UpdateDrawingDto,
    @Request() req,
  ): Promise<Drawing> {
    return this.drawingsService.update(id, updateDrawingDto, req.user);
  }

  // === DELETE ===

  @Delete(':id')
  @Roles('rfq_administrator', 'admin')
  @ApiOperation({ summary: 'Delete a drawing' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req): Promise<void> {
    await this.drawingsService.remove(id, req.user);
  }

  // === COMMENTS/ANNOTATIONS ===

  @Post(':id/comments')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'admin')
  @ApiOperation({ summary: 'Add a comment or annotation to a drawing' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DrawingComment })
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() createCommentDto: CreateDrawingCommentDto,
    @Request() req,
  ): Promise<DrawingComment> {
    return this.drawingsService.addComment(id, createCommentDto, req.user);
  }

  @Get(':id/comments')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'compliance_officer', 'customer', 'supplier', 'admin', 'user')
  @ApiOperation({ summary: 'Get all comments for a drawing' })
  @ApiResponse({ status: HttpStatus.OK, type: [DrawingComment] })
  async getComments(@Param('id', ParseIntPipe) id: number): Promise<DrawingComment[]> {
    return this.drawingsService.getComments(id);
  }

  @Patch('comments/:commentId/resolve')
  @Roles('rfq_administrator', 'reviewer', 'approver', 'admin')
  @ApiOperation({ summary: 'Mark a comment as resolved' })
  @ApiResponse({ status: HttpStatus.OK, type: DrawingComment })
  async resolveComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req,
  ): Promise<DrawingComment> {
    return this.drawingsService.resolveComment(commentId, req.user);
  }

  // === ANALYSIS ===

  @Post('analyze')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and analyze a PDF drawing to extract components' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file to analyze',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analysis results with extracted components' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid file or analysis failed' })
  async analyzeDrawing(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<DrawingAnalysisResult> {
    if (!file) {
      return {
        success: false,
        components: [],
        errors: ['No file uploaded'],
        warnings: [],
        metadata: {
          pageCount: 0,
          extractionMethod: 'none',
          analysisTimestamp: new Date(),
        },
      };
    }

    // Validate file type
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (ext !== '.pdf' && file.mimetype !== 'application/pdf') {
      return {
        success: false,
        components: [],
        errors: ['Only PDF files can be analyzed. Please upload a PDF file.'],
        warnings: [],
        metadata: {
          pageCount: 0,
          extractionMethod: 'none',
          analysisTimestamp: new Date(),
        },
      };
    }

    return this.analyzerService.analyzePdf(file.buffer);
  }

  @Get(':id/analyze')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Analyze an existing drawing to extract components' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analysis results with extracted components' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Drawing is not a PDF or analysis failed' })
  async analyzeExistingDrawing(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DrawingAnalysisResult> {
    const drawing = await this.drawingsService.findOne(id);

    // Check if it's a PDF
    if (drawing.mimeType !== 'application/pdf') {
      return {
        success: false,
        components: [],
        errors: ['Only PDF drawings can be analyzed. This drawing is not a PDF file.'],
        warnings: [],
        metadata: {
          pageCount: 0,
          extractionMethod: 'none',
          analysisTimestamp: new Date(),
        },
      };
    }

    // Download the file and analyze
    const { buffer } = await this.drawingsService.downloadFile(id);
    return this.analyzerService.analyzePdf(buffer);
  }

  @Post(':id/analyze-to-rfq')
  @Roles('rfq_administrator', 'customer', 'supplier', 'admin')
  @ApiOperation({ summary: 'Analyze drawing and get RFQ-ready line items' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Analysis results converted to RFQ line item format' })
  async analyzeToRfqItems(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ analysis: DrawingAnalysisResult; rfqItems: any[] }> {
    const drawing = await this.drawingsService.findOne(id);

    if (drawing.mimeType !== 'application/pdf') {
      return {
        analysis: {
          success: false,
          components: [],
          errors: ['Only PDF drawings can be analyzed. This drawing is not a PDF file.'],
          warnings: [],
          metadata: {
            pageCount: 0,
            extractionMethod: 'none',
            analysisTimestamp: new Date(),
          },
        },
        rfqItems: [],
      };
    }

    const { buffer } = await this.drawingsService.downloadFile(id);
    const analysis = await this.analyzerService.analyzePdf(buffer);
    const rfqItems = this.analyzerService.convertToRfqItems(analysis.components);

    return { analysis, rfqItems };
  }
}
