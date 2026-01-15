import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { NixService } from './nix.service';
import {
  ProcessDocumentDto,
  ProcessDocumentResponseDto,
} from './dto/process-document.dto';
import {
  SubmitClarificationDto,
  SubmitClarificationResponseDto,
} from './dto/submit-clarification.dto';
import { NixExtraction } from './entities/nix-extraction.entity';
import { NixClarification } from './entities/nix-clarification.entity';
import { NixLearning } from './entities/nix-learning.entity';

@ApiTags('Nix AI Assistant')
@Controller('nix')
export class NixController {
  constructor(private readonly nixService: NixService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a document for extraction' })
  @ApiResponse({ status: 201, description: 'Document processing started', type: ProcessDocumentResponseDto })
  async processDocument(
    @Body() dto: ProcessDocumentDto,
  ): Promise<ProcessDocumentResponseDto> {
    return this.nixService.processDocument(dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload and process a document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        userId: { type: 'number' },
        rfqId: { type: 'number' },
        productTypes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded and processing started' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId?: string,
    @Body('rfqId') rfqId?: string,
    @Body('productTypes') productTypes?: string,
  ): Promise<ProcessDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const dto: ProcessDocumentDto = {
      documentPath: file.path,
      documentName: file.originalname,
      userId: userId ? parseInt(userId, 10) : undefined,
      rfqId: rfqId ? parseInt(rfqId, 10) : undefined,
      productTypes: productTypes ? JSON.parse(productTypes) : undefined,
    };

    return this.nixService.processDocument(dto);
  }

  @Get('extraction/:id')
  @ApiOperation({ summary: 'Get extraction details by ID' })
  @ApiResponse({ status: 200, description: 'Extraction details', type: NixExtraction })
  async extraction(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NixExtraction | null> {
    return this.nixService.extraction(id);
  }

  @Get('extraction/:id/clarifications')
  @ApiOperation({ summary: 'Get pending clarifications for an extraction' })
  @ApiResponse({ status: 200, description: 'Pending clarifications', type: [NixClarification] })
  async pendingClarifications(
    @Param('id', ParseIntPipe) extractionId: number,
  ): Promise<NixClarification[]> {
    return this.nixService.pendingClarifications(extractionId);
  }

  @Post('clarification')
  @ApiOperation({ summary: 'Submit a clarification response' })
  @ApiResponse({ status: 201, description: 'Clarification submitted', type: SubmitClarificationResponseDto })
  async submitClarification(
    @Body() dto: SubmitClarificationDto,
  ): Promise<SubmitClarificationResponseDto> {
    return this.nixService.submitClarification(dto);
  }

  @Get('user/:userId/extractions')
  @ApiOperation({ summary: 'Get extractions for a user' })
  @ApiResponse({ status: 200, description: 'User extractions', type: [NixExtraction] })
  async userExtractions(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<NixExtraction[]> {
    return this.nixService.userExtractions(userId);
  }

  @Post('admin/seed-rule')
  @ApiOperation({ summary: 'Seed an admin learning rule' })
  @ApiResponse({ status: 201, description: 'Rule created', type: NixLearning })
  async seedAdminRule(
    @Body() body: {
      category: string;
      patternKey: string;
      learnedValue: string;
      applicableProducts?: string[];
    },
  ): Promise<NixLearning> {
    return this.nixService.seedAdminRule(
      body.category,
      body.patternKey,
      body.learnedValue,
      body.applicableProducts,
    );
  }

  @Get('admin/learning-rules')
  @ApiOperation({ summary: 'Get all admin-seeded learning rules' })
  @ApiResponse({ status: 200, description: 'Admin learning rules', type: [NixLearning] })
  async adminLearningRules(): Promise<NixLearning[]> {
    return this.nixService.adminLearningRules();
  }

  @Post('learning/correction')
  @ApiOperation({ summary: 'Submit a user correction for learning' })
  @ApiResponse({ status: 201, description: 'Correction recorded for learning' })
  async submitCorrection(
    @Body() body: {
      extractionId?: number;
      itemDescription: string;
      fieldName: string;
      originalValue: string | number | null;
      correctedValue: string | number;
      userId?: number;
    },
  ): Promise<{ success: boolean }> {
    return this.nixService.recordCorrection(body);
  }
}
