import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Inject,
  Req,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { NixService } from './nix.service';
import {
  ProcessDocumentDto,
  ProcessDocumentResponseDto,
} from './dto/process-document.dto';
import {
  SubmitClarificationDto,
  SubmitClarificationResponseDto,
} from './dto/submit-clarification.dto';
import {
  VerifyRegistrationDocumentResponseDto,
  VerifyRegistrationBatchResponseDto,
} from './dto/verify-registration-document.dto';
import {
  SaveExtractionRegionDto,
  ExtractFromRegionDto,
  PdfPagesResponseDto,
  ExtractionRegionResponseDto,
} from './dto/extraction-region.dto';
import { NixExtraction } from './entities/nix-extraction.entity';
import { NixClarification } from './entities/nix-clarification.entity';
import { NixLearning } from './entities/nix-learning.entity';
import {
  RegistrationDocumentVerifierService,
  RegistrationDocumentType,
  ExpectedCompanyData,
} from './services/registration-document-verifier.service';
import { DocumentAnnotationService } from './services/document-annotation.service';
import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerDocument } from '../customer/entities/customer-document.entity';
import { SupplierDocument } from '../supplier/entities/supplier-document.entity';

@ApiTags('Nix AI Assistant')
@Controller('nix')
export class NixController {
  constructor(
    private readonly nixService: NixService,
    private readonly registrationVerifier: RegistrationDocumentVerifierService,
    private readonly documentAnnotationService: DocumentAnnotationService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @InjectRepository(CustomerDocument)
    private readonly customerDocumentRepo: Repository<CustomerDocument>,
    @InjectRepository(SupplierDocument)
    private readonly supplierDocumentRepo: Repository<SupplierDocument>,
  ) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a document for extraction' })
  @ApiResponse({
    status: 201,
    description: 'Document processing started',
    type: ProcessDocumentResponseDto,
  })
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
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and processing started',
  })
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
  @ApiResponse({
    status: 200,
    description: 'Extraction details',
    type: NixExtraction,
  })
  async extraction(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<NixExtraction | null> {
    return this.nixService.extraction(id);
  }

  @Get('extraction/:id/clarifications')
  @ApiOperation({ summary: 'Get pending clarifications for an extraction' })
  @ApiResponse({
    status: 200,
    description: 'Pending clarifications',
    type: [NixClarification],
  })
  async pendingClarifications(
    @Param('id', ParseIntPipe) extractionId: number,
  ): Promise<NixClarification[]> {
    return this.nixService.pendingClarifications(extractionId);
  }

  @Post('clarification')
  @ApiOperation({ summary: 'Submit a clarification response' })
  @ApiResponse({
    status: 201,
    description: 'Clarification submitted',
    type: SubmitClarificationResponseDto,
  })
  async submitClarification(
    @Body() dto: SubmitClarificationDto,
  ): Promise<SubmitClarificationResponseDto> {
    return this.nixService.submitClarification(dto);
  }

  @Get('user/:userId/extractions')
  @ApiOperation({ summary: 'Get extractions for a user' })
  @ApiResponse({
    status: 200,
    description: 'User extractions',
    type: [NixExtraction],
  })
  async userExtractions(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<NixExtraction[]> {
    return this.nixService.userExtractions(userId);
  }

  @Post('admin/seed-rule')
  @ApiOperation({ summary: 'Seed an admin learning rule' })
  @ApiResponse({ status: 201, description: 'Rule created', type: NixLearning })
  async seedAdminRule(
    @Body()
    body: {
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
  @ApiResponse({
    status: 200,
    description: 'Admin learning rules',
    type: [NixLearning],
  })
  async adminLearningRules(): Promise<NixLearning[]> {
    return this.nixService.adminLearningRules();
  }

  @Post('learning/correction')
  @ApiOperation({ summary: 'Submit a user correction for learning' })
  @ApiResponse({ status: 201, description: 'Correction recorded for learning' })
  async submitCorrection(
    @Body()
    body: {
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

  @Post('verify-registration-document')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Verify a registration document against expected company data',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', enum: ['vat', 'registration', 'bee'] },
        expectedData: {
          type: 'string',
          description: 'JSON stringified ExpectedCompanyData',
        },
      },
      required: ['file', 'documentType', 'expectedData'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document verification result',
    type: VerifyRegistrationDocumentResponseDto,
  })
  async verifyRegistrationDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @Body('expectedData') expectedDataJson: string,
  ): Promise<VerifyRegistrationDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!['vat', 'registration', 'bee'].includes(documentType)) {
      throw new BadRequestException(
        'Invalid document type. Must be one of: vat, registration, bee',
      );
    }

    let expectedData: ExpectedCompanyData;
    try {
      expectedData = JSON.parse(expectedDataJson);
    } catch {
      throw new BadRequestException('Invalid expectedData JSON');
    }

    const result = await this.registrationVerifier.verifyDocument(
      file,
      documentType as RegistrationDocumentType,
      expectedData,
    );

    return {
      ...result,
      mismatchReport: this.registrationVerifier.generateMismatchReport(result),
    };
  }

  @Post('verify-registration-batch')
  @UseInterceptors(FilesInterceptor('files', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Verify multiple registration documents at once' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        documentTypes: {
          type: 'string',
          description: 'JSON array of document types matching files order',
        },
        expectedData: {
          type: 'string',
          description: 'JSON stringified ExpectedCompanyData',
        },
      },
      required: ['files', 'documentTypes', 'expectedData'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Batch verification result',
    type: VerifyRegistrationBatchResponseDto,
  })
  async verifyRegistrationBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('documentTypes') documentTypesJson: string,
    @Body('expectedData') expectedDataJson: string,
  ): Promise<VerifyRegistrationBatchResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    let documentTypes: RegistrationDocumentType[];
    try {
      documentTypes = JSON.parse(documentTypesJson);
    } catch {
      throw new BadRequestException('Invalid documentTypes JSON');
    }

    if (documentTypes.length !== files.length) {
      throw new BadRequestException(
        'Number of document types must match number of files',
      );
    }

    let expectedData: ExpectedCompanyData;
    try {
      expectedData = JSON.parse(expectedDataJson);
    } catch {
      throw new BadRequestException('Invalid expectedData JSON');
    }

    const fileDocuments = files.map((file, index) => ({
      file,
      documentType: documentTypes[index],
    }));

    const results = await this.registrationVerifier.verifyBatch(
      fileDocuments,
      expectedData,
    );

    const resultsWithReports = results.map((result) => ({
      ...result,
      mismatchReport: this.registrationVerifier.generateMismatchReport(result),
    }));

    const combinedAutoCorrections = resultsWithReports
      .flatMap((r) => r.autoCorrections)
      .reduce(
        (acc, correction) => {
          const existing = acc.find((c) => c.field === correction.field);
          if (!existing) {
            acc.push(correction);
          }
          return acc;
        },
        [] as Array<{ field: string; value: string | number }>,
      );

    return {
      results: resultsWithReports,
      allSuccess: resultsWithReports.every((r) => r.success),
      allFieldsMatch: resultsWithReports.every((r) => r.allFieldsMatch),
      combinedAutoCorrections,
      totalProcessingTimeMs: resultsWithReports.reduce(
        (sum, r) => sum + r.processingTimeMs,
        0,
      ),
    };
  }

  @Post('admin/upload-document')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Upload and process a document, saving extracted content to Secure Documents',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: {
          type: 'string',
          description: 'Optional title for the document',
        },
        description: { type: 'string', description: 'Optional description' },
        processWithNix: {
          type: 'string',
          description: 'Whether to process with Nix (default: true)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document processed and saved to Secure Documents',
  })
  async uploadAndSaveDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('userId') userId?: string,
    @Body('processWithNix') processWithNix?: string,
  ): Promise<{
    success: boolean;
    documentId?: string;
    documentSlug?: string;
    message?: string;
    error?: string;
  }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const adminUserId = userId ? parseInt(userId, 10) : 1;
    const shouldProcess = processWithNix !== 'false';

    if (shouldProcess) {
      return this.nixService.processAndSaveToSecureDocuments(
        file,
        adminUserId,
        title,
        description,
      );
    } else {
      return this.nixService.uploadRawToSecureDocuments(
        file,
        adminUserId,
        title,
        description,
      );
    }
  }

  @Get('admin/documents')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all Nix-processed documents in Secure Documents',
  })
  @ApiResponse({ status: 200, description: 'List of Nix folder documents' })
  async listNixDocuments(): Promise<{
    documents: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return this.nixService.listNixSecureDocuments();
  }

  @Get('admin/document-pages/:entityType/:documentId')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch stored document as page images for training' })
  @ApiResponse({ status: 200, description: 'PDF pages as base64 images', type: PdfPagesResponseDto })
  async documentPagesForTraining(
    @Param('entityType') entityType: 'customer' | 'supplier',
    @Param('documentId', ParseIntPipe) documentId: number,
  ): Promise<PdfPagesResponseDto> {
    const document = entityType === 'customer'
      ? await this.customerDocumentRepo.findOne({ where: { id: documentId } })
      : await this.supplierDocumentRepo.findOne({ where: { id: documentId } });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    const buffer = await this.storageService.download(document.filePath);
    return this.documentAnnotationService.convertPdfToImages(buffer);
  }

  @Post('admin/extract-from-region/:entityType/:documentId')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extract text from a drawn bounding box region' })
  @ApiResponse({ status: 201, description: 'Extraction result' })
  async extractFromRegion(
    @Param('entityType') entityType: 'customer' | 'supplier',
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: ExtractFromRegionDto,
  ): Promise<{ text: string; confidence: number }> {
    const document = entityType === 'customer'
      ? await this.customerDocumentRepo.findOne({ where: { id: documentId } })
      : await this.supplierDocumentRepo.findOne({ where: { id: documentId } });

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    const buffer = await this.storageService.download(document.filePath);
    return this.documentAnnotationService.extractFromRegion(
      buffer,
      dto.regionCoordinates,
      dto.fieldName,
    );
  }

  @Post('admin/extraction-regions')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a trained extraction region mapping' })
  @ApiResponse({ status: 201, description: 'Region saved successfully' })
  async saveExtractionRegion(
    @Body() dto: SaveExtractionRegionDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; id: number }> {
    const adminUser = (req as any).user;
    const region = await this.documentAnnotationService.saveExtractionRegion(
      dto,
      adminUser?.id,
    );
    return { success: true, id: region.id };
  }

  @Get('admin/extraction-regions/:documentCategory')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List extraction regions for a document category' })
  @ApiResponse({ status: 200, description: 'List of regions', type: [ExtractionRegionResponseDto] })
  async listExtractionRegions(
    @Param('documentCategory') documentCategory: string,
  ): Promise<ExtractionRegionResponseDto[]> {
    const regions = await this.documentAnnotationService.findRegionsForDocument(documentCategory);
    return regions.map((r) => ({
      id: r.id,
      documentCategory: r.documentCategory,
      fieldName: r.fieldName,
      regionCoordinates: r.regionCoordinates,
      extractionPattern: r.extractionPattern || undefined,
      sampleValue: r.sampleValue || undefined,
      useCount: r.useCount,
      successCount: r.successCount,
    }));
  }

  @Get('admin/extraction-regions')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all extraction regions' })
  @ApiResponse({ status: 200, description: 'List of all regions', type: [ExtractionRegionResponseDto] })
  async listAllExtractionRegions(): Promise<ExtractionRegionResponseDto[]> {
    const regions = await this.documentAnnotationService.allRegions();
    return regions.map((r) => ({
      id: r.id,
      documentCategory: r.documentCategory,
      fieldName: r.fieldName,
      regionCoordinates: r.regionCoordinates,
      extractionPattern: r.extractionPattern || undefined,
      sampleValue: r.sampleValue || undefined,
      useCount: r.useCount,
      successCount: r.successCount,
    }));
  }

  @Delete('admin/extraction-regions/:id')
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate an extraction region' })
  @ApiResponse({ status: 200, description: 'Region deactivated' })
  async deleteExtractionRegion(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.documentAnnotationService.deleteRegion(id);
    return { success: true };
  }
}
