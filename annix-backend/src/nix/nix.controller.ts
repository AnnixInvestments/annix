import * as fs from "node:fs";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AdminAuthGuard, AdminRequest } from "../admin/guards/admin-auth.guard";
import { AnyUserAuthGuard, AuthenticatedUser } from "../auth/guards/any-user-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CustomerDocument } from "../customer/entities/customer-document.entity";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { SupplierDocument } from "../supplier/entities/supplier-document.entity";
import {
  ExtractFromRegionDto,
  ExtractionRegionResponseDto,
  PdfPagesResponseDto,
  SaveCustomFieldValueDto,
  SaveExtractionRegionDto,
} from "./dto/extraction-region.dto";
import { ProcessDocumentDto, ProcessDocumentResponseDto } from "./dto/process-document.dto";
import {
  SubmitClarificationDto,
  SubmitClarificationResponseDto,
} from "./dto/submit-clarification.dto";
import {
  VerifyRegistrationBatchResponseDto,
  VerifyRegistrationDocumentResponseDto,
} from "./dto/verify-registration-document.dto";
import { NixClarification } from "./entities/nix-clarification.entity";
import { DocumentRole, NixExtraction } from "./entities/nix-extraction.entity";
import {
  NixExtractionSession,
  NixExtractionSessionStatus,
} from "./entities/nix-extraction-session.entity";
import { NixLearning } from "./entities/nix-learning.entity";
import { NixService } from "./nix.service";
import { CustomFieldService } from "./services/custom-field.service";
import { DocumentAnnotationService } from "./services/document-annotation.service";
import { NixExtractionSessionService } from "./services/nix-extraction-session.service";
import {
  ExpectedCompanyData,
  RegistrationDocumentType,
  RegistrationDocumentVerifierService,
} from "./services/registration-document-verifier.service";

@ApiTags("Nix AI Assistant")
@Controller("nix")
export class NixController {
  constructor(
    private readonly nixService: NixService,
    private readonly sessionService: NixExtractionSessionService,
    private readonly registrationVerifier: RegistrationDocumentVerifierService,
    private readonly documentAnnotationService: DocumentAnnotationService,
    private readonly customFieldService: CustomFieldService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @InjectRepository(CustomerDocument)
    private readonly customerDocumentRepo: Repository<CustomerDocument>,
    @InjectRepository(SupplierDocument)
    private readonly supplierDocumentRepo: Repository<SupplierDocument>,
  ) {}

  @Post("process")
  @ApiOperation({ summary: "Process a document for extraction" })
  @ApiResponse({
    status: 201,
    description: "Document processing started",
    type: ProcessDocumentResponseDto,
  })
  async processDocument(@Body() dto: ProcessDocumentDto): Promise<ProcessDocumentResponseDto> {
    return this.nixService.processDocument(dto);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload and process a document" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        userId: { type: "number" },
        rfqId: { type: "number" },
        sourceModule: { type: "string" },
        sourceId: { type: "number" },
        extractionProfile: { type: "string" },
        documentRole: { type: "string", enum: ["drawing", "specification", "other"] },
        sessionId: { type: "number" },
        productTypes: { type: "array", items: { type: "string" } },
        skipExtraction: { type: "boolean" },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Document uploaded and processing started",
  })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body("userId") userId?: string,
    @Body("rfqId") rfqId?: string,
    @Body("sourceModule") sourceModule?: string,
    @Body("sourceId") sourceId?: string,
    @Body("extractionProfile") extractionProfile?: string,
    @Body("documentRole") documentRole?: string,
    @Body("sessionId") sessionId?: string,
    @Body("productTypes") productTypes?: string,
    @Body("skipExtraction") skipExtraction?: string,
  ): Promise<ProcessDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    let parsedProductTypes;
    if (productTypes) {
      try {
        parsedProductTypes = JSON.parse(productTypes);
      } catch {
        throw new BadRequestException("Invalid productTypes JSON");
      }
    }

    const role = parseDocumentRole(documentRole);

    const dto: ProcessDocumentDto = {
      documentPath: file.path,
      documentName: file.originalname,
      userId: userId ? parseInt(userId, 10) : undefined,
      rfqId: rfqId ? parseInt(rfqId, 10) : undefined,
      sourceModule: sourceModule || undefined,
      sourceId: sourceId ? parseInt(sourceId, 10) : undefined,
      extractionProfile: extractionProfile || undefined,
      documentRole: role,
      sessionId: sessionId ? parseInt(sessionId, 10) : undefined,
      productTypes: parsedProductTypes,
      skipExtraction: skipExtraction === "true" || skipExtraction === "1",
    };

    return this.nixService.processDocument(dto);
  }

  @Post("sessions")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Create a new NixExtractionSession for grouping multiple uploads (drawings + specs) into a single quote pack.",
  })
  @ApiResponse({ status: 201, type: NixExtractionSession })
  async createSession(
    @Body()
    body: {
      sourceModule: string;
      extractionProfile: string;
      title?: string;
      externalReference?: string;
    },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    if (!body?.sourceModule || !body?.extractionProfile) {
      throw new BadRequestException("sourceModule and extractionProfile are required");
    }
    return this.sessionService.create({
      sourceModule: body.sourceModule,
      extractionProfile: body.extractionProfile,
      title: body.title,
      externalReference: body.externalReference,
      ownerUserId: authUser.userId,
    });
  }

  @Get("sessions")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "List the current user's Nix extraction sessions, optionally filtered by source module and/or status. Used by the Quotations list page to surface in-progress drafts above the issued quotes table so the user can resume from where they left off.",
  })
  @ApiResponse({ status: 200, type: [NixExtractionSession] })
  async listSessions(
    @Req() req: Request,
    @Query("sourceModule") sourceModule?: string,
    @Query("status") status?: NixExtractionSessionStatus,
  ): Promise<NixExtractionSession[]> {
    const authUser = req["authUser"] as AuthenticatedUser;
    const all = await this.sessionService.sessionsForOwner(authUser.userId);
    return all.filter((s) => {
      if (sourceModule && s.sourceModule !== sourceModule) return false;
      if (status && s.status !== status) return false;
      return true;
    });
  }

  @Get("sessions/:id")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get a NixExtractionSession including its extractions." })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async session(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    return this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
  }

  @Delete("sessions/:id")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Delete a NixExtractionSession. The session row is removed but its extractions are unlinked (session_id = null) rather than deleted, so they remain available for cross-quote reuse via the doc-number lookup.",
  })
  @ApiResponse({ status: 200, schema: { properties: { ok: { type: "boolean" } } } })
  async deleteSession(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ ok: true }> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    await this.sessionService.deleteSessionPreservingExtractions(id);
    return { ok: true };
  }

  @Post("sessions/:id/status")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a session's status (draft → reviewing → promoted/archived)." })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async setSessionStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { status: NixExtractionSessionStatus; promotedRef?: string },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    if (
      body.status === NixExtractionSessionStatus.PROMOTED &&
      typeof body.promotedRef === "string" &&
      body.promotedRef.length > 0
    ) {
      return this.sessionService.promote(id, body.promotedRef);
    }
    return this.sessionService.setStatus(id, body.status);
  }

  @Post("sessions/:id/quote-state")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Persist the QuoteSpecsEditor state bundle (supplier overrides, rates, attachment metadata) for this session. Debounce-saved on every edit by the promoted-quote page so a refresh / re-open lands the quoter back where they left off. Body is opaque to the backend — the frontend owns the shape.",
  })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async setSessionQuoteEditorState(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { quoteEditorState: Record<string, unknown> | null },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.sessionService.setQuoteEditorState(id, body.quoteEditorState ?? null);
  }

  @Post("sessions/:id/order-number")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Set the customer's PO / order-number for the quote header. Empty string clears it. Debounce-saved by the quote-meta input on the promoted-quote page.",
  })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async setSessionCustomerOrderNumber(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { orderNumber: string | null },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.sessionService.setCustomerOrderNumber(id, body.orderNumber ?? null);
  }

  @Post("sessions/:id/delivery-note-ref")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Set the delivery-note reference printed on the quote header. Empty string clears it.",
  })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async setSessionDeliveryNoteRef(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { ref: string | null },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.sessionService.setDeliveryNoteRef(id, body.ref ?? null);
  }

  @Post("sessions/:id/notes")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Persist the free-text notes bundle (per-pool + general) for the customer-facing PDF. Debounce-saved by the QuoteView's notes inputs.",
  })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async setSessionQuoteNotes(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { quoteNotes: Record<string, unknown> | null },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.sessionService.setQuoteNotes(id, body.quoteNotes ?? null);
  }

  @Post("sessions/:id/customer")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Assign (or clear) the customer for this quote session. companyId is the FK to companies for picks from the master list (or after 'Save for future use'); snapshot is the point-in-time customer-details copy that powers the PDF header. Pass both as null to clear.",
  })
  @ApiResponse({ status: 200, type: NixExtractionSession })
  async setSessionCustomer(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: {
      companyId: number | null;
      snapshot: Record<string, unknown> | null;
    },
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.sessionService.setCustomer(id, {
      companyId: body.companyId ?? null,
      snapshot: body.snapshot ?? null,
    });
  }

  @Get("extraction/:id")
  @ApiOperation({ summary: "Get extraction details by ID" })
  @ApiResponse({
    status: 200,
    description: "Extraction details",
    type: NixExtraction,
  })
  async extraction(@Param("id", ParseIntPipe) id: number): Promise<NixExtraction | null> {
    return this.nixService.extraction(id);
  }

  @Get("extraction/:id/document-url")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Presigned URL for the original source document of an extraction (10 min expiry).",
  })
  @ApiResponse({
    status: 200,
    description: "Presigned URL or null when no S3 source is persisted.",
  })
  async extractionDocumentUrl(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ url: string | null; expiresInSeconds: number }> {
    const authUser = req["authUser"] as AuthenticatedUser;
    const extraction = await this.nixService.extraction(id);
    if (!extraction) {
      throw new BadRequestException("Extraction not found");
    }

    // Owner / admin only — same gate the clarifications endpoint uses.
    const isOwner = extraction.userId === authUser.userId;
    const isAdmin = authUser.type === "admin";
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Not allowed to view this document");
    }

    const expiresInSeconds = 600;
    const url = await this.nixService.extractionDocumentUrl(extraction, expiresInSeconds);
    return { url, expiresInSeconds };
  }

  @Patch("extraction/:id/items")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Edit a single field on a single item inside an extraction. Auto-records the diff as a learning correction so future extractions improve.",
  })
  @ApiResponse({ status: 200, description: "Updated extraction", type: NixExtraction })
  async patchExtractionItem(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: {
      itemNumber?: string;
      index?: number;
      field: string;
      value: string | number | boolean | null;
    },
    @Req() req: Request,
  ): Promise<NixExtraction> {
    const authUser = req["authUser"] as AuthenticatedUser;
    const extraction = await this.nixService.extraction(id);
    if (!extraction) {
      throw new BadRequestException("Extraction not found");
    }
    const isOwner = extraction.userId === authUser.userId;
    const isAdmin = authUser.type === "admin";
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Not allowed to edit this extraction");
    }
    if (!body.field || typeof body.field !== "string") {
      throw new BadRequestException("Missing 'field' in body");
    }
    return this.nixService.patchExtractionItem(
      id,
      { itemNumber: body.itemNumber, index: body.index },
      body.field,
      body.value,
    );
  }

  @Post("extraction/:id/retry")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Re-run extraction against the existing S3-stored source document.",
  })
  @ApiResponse({ status: 200, description: "Updated extraction", type: NixExtraction })
  async retryExtraction(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<NixExtraction> {
    const authUser = req["authUser"] as AuthenticatedUser;
    const extraction = await this.nixService.extraction(id);
    if (!extraction) {
      throw new BadRequestException("Extraction not found");
    }
    const isOwner = extraction.userId === authUser.userId;
    const isAdmin = authUser.type === "admin";
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("Not allowed to retry this extraction");
    }
    return this.nixService.retryExtraction(id);
  }

  @Get("extraction/:id/clarifications")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pending clarifications for an extraction" })
  @ApiResponse({
    status: 200,
    description: "Pending clarifications",
    type: [NixClarification],
  })
  async pendingClarifications(
    @Param("id", ParseIntPipe) extractionId: number,
    @Req() req: Request,
  ): Promise<NixClarification[]> {
    const authUser = req["authUser"] as AuthenticatedUser;

    const extraction = await this.nixService.extraction(extractionId);
    if (!extraction) {
      throw new BadRequestException("Extraction not found");
    }

    const isOwner = extraction.userId === authUser.userId;
    const isAdmin = authUser.type === "admin";

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("You do not have permission to access this extraction");
    }

    return this.nixService.pendingClarifications(extractionId);
  }

  @Post("clarification")
  @ApiOperation({ summary: "Submit a clarification response" })
  @ApiResponse({
    status: 201,
    description: "Clarification submitted",
    type: SubmitClarificationResponseDto,
  })
  async submitClarification(
    @Body() dto: SubmitClarificationDto,
  ): Promise<SubmitClarificationResponseDto> {
    return this.nixService.submitClarification(dto);
  }

  @Get("user/:userId/extractions")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get extractions for a user" })
  @ApiResponse({
    status: 200,
    description: "User extractions",
    type: [NixExtraction],
  })
  async userExtractions(
    @Param("userId", ParseIntPipe) userId: number,
    @Req() req: Request,
  ): Promise<NixExtraction[]> {
    const authUser = req["authUser"] as AuthenticatedUser;

    const isOwner = authUser.userId === userId;
    const isAdmin = authUser.type === "admin";

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException("You do not have permission to access this user's extractions");
    }

    return this.nixService.userExtractions(userId);
  }

  @Post("admin/seed-rule")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Seed an admin learning rule" })
  @ApiResponse({ status: 201, description: "Rule created", type: NixLearning })
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

  @Get("admin/learning-rules")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all admin-seeded learning rules" })
  @ApiResponse({
    status: 200,
    description: "Admin learning rules",
    type: [NixLearning],
  })
  async adminLearningRules(): Promise<NixLearning[]> {
    return this.nixService.adminLearningRules();
  }

  @Post("learning/correction")
  @ApiOperation({ summary: "Submit a user correction for learning" })
  @ApiResponse({ status: 201, description: "Correction recorded for learning" })
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

  @Post("verify-registration-document")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Verify a registration document against expected company data",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        documentType: { type: "string", enum: ["vat", "registration", "bee"] },
        expectedData: {
          type: "string",
          description: "JSON stringified ExpectedCompanyData",
        },
      },
      required: ["file", "documentType", "expectedData"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Document verification result",
    type: VerifyRegistrationDocumentResponseDto,
  })
  async verifyRegistrationDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body("documentType") documentType: string,
    @Body("expectedData") expectedDataJson: string,
  ): Promise<VerifyRegistrationDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!["vat", "registration", "bee"].includes(documentType)) {
      throw new BadRequestException(
        "Invalid document type. Must be one of: vat, registration, bee",
      );
    }

    let expectedData: ExpectedCompanyData;
    try {
      expectedData = JSON.parse(expectedDataJson);
    } catch {
      throw new BadRequestException("Invalid expectedData JSON");
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

  @Post("verify-registration-batch")
  @UseInterceptors(FilesInterceptor("files", 5))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Verify multiple registration documents at once" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: { type: "array", items: { type: "string", format: "binary" } },
        documentTypes: {
          type: "string",
          description: "JSON array of document types matching files order",
        },
        expectedData: {
          type: "string",
          description: "JSON stringified ExpectedCompanyData",
        },
      },
      required: ["files", "documentTypes", "expectedData"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Batch verification result",
    type: VerifyRegistrationBatchResponseDto,
  })
  async verifyRegistrationBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("documentTypes") documentTypesJson: string,
    @Body("expectedData") expectedDataJson: string,
  ): Promise<VerifyRegistrationBatchResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    let documentTypes: RegistrationDocumentType[];
    try {
      documentTypes = JSON.parse(documentTypesJson);
    } catch {
      throw new BadRequestException("Invalid documentTypes JSON");
    }

    if (documentTypes.length !== files.length) {
      throw new BadRequestException("Number of document types must match number of files");
    }

    let expectedData: ExpectedCompanyData;
    try {
      expectedData = JSON.parse(expectedDataJson);
    } catch {
      throw new BadRequestException("Invalid expectedData JSON");
    }

    const fileDocuments = files.map((file, index) => ({
      file,
      documentType: documentTypes[index],
    }));

    const results = await this.registrationVerifier.verifyBatch(fileDocuments, expectedData);

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
      totalProcessingTimeMs: resultsWithReports.reduce((sum, r) => sum + r.processingTimeMs, 0),
    };
  }

  @Post("admin/upload-document")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Upload and process a document, saving extracted content to Secure Documents",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        title: {
          type: "string",
          description: "Optional title for the document",
        },
        description: { type: "string", description: "Optional description" },
        processWithNix: {
          type: "string",
          description: "Whether to process with Nix (default: true)",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Document processed and saved to Secure Documents",
  })
  async uploadAndSaveDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body("title") title?: string,
    @Body("description") description?: string,
    @Body("userId") userId?: string,
    @Body("processWithNix") processWithNix?: string,
  ): Promise<{
    success: boolean;
    documentId?: string;
    documentSlug?: string;
    message?: string;
    error?: string;
  }> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const adminUserId = userId ? parseInt(userId, 10) : 1;
    const shouldProcess = processWithNix !== "false";

    if (shouldProcess) {
      return this.nixService.processAndSaveToSecureDocuments(file, adminUserId, title, description);
    } else {
      return this.nixService.uploadRawToSecureDocuments(file, adminUserId, title, description);
    }
  }

  @Get("admin/documents")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List all Nix-processed documents in Secure Documents",
  })
  @ApiResponse({ status: 200, description: "List of Nix folder documents" })
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

  @Get("admin/document-pages/:entityType/:documentId")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Fetch stored document as page images for training",
  })
  @ApiResponse({
    status: 200,
    description: "PDF pages as base64 images",
    type: PdfPagesResponseDto,
  })
  async documentPagesForTraining(
    @Param("entityType") entityType: "customer" | "supplier",
    @Param("documentId", ParseIntPipe) documentId: number,
  ): Promise<PdfPagesResponseDto> {
    const document =
      entityType === "customer"
        ? await this.customerDocumentRepo.findOne({ where: { id: documentId } })
        : await this.supplierDocumentRepo.findOne({
            where: { id: documentId },
          });

    if (!document) {
      throw new BadRequestException("Document not found");
    }

    const buffer = await this.storageService.download(document.filePath);
    return this.documentAnnotationService.convertPdfToImages(buffer);
  }

  @Post("admin/extract-from-region/:entityType/:documentId")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Extract text from a drawn bounding box region" })
  @ApiResponse({ status: 201, description: "Extraction result" })
  async extractFromRegion(
    @Param("entityType") entityType: "customer" | "supplier",
    @Param("documentId", ParseIntPipe) documentId: number,
    @Body() dto: ExtractFromRegionDto,
  ): Promise<{ text: string; confidence: number }> {
    const document =
      entityType === "customer"
        ? await this.customerDocumentRepo.findOne({ where: { id: documentId } })
        : await this.supplierDocumentRepo.findOne({
            where: { id: documentId },
          });

    if (!document) {
      throw new BadRequestException("Document not found");
    }

    const buffer = await this.storageService.download(document.filePath);
    return this.documentAnnotationService.extractFromRegion(
      buffer,
      dto.regionCoordinates,
      dto.fieldName,
    );
  }

  @Post("admin/extraction-regions")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Save a trained extraction region mapping" })
  @ApiResponse({ status: 201, description: "Region saved successfully" })
  async saveExtractionRegion(
    @Body() dto: SaveExtractionRegionDto,
    @Req() req: AdminRequest,
  ): Promise<{ success: boolean; id: number }> {
    const adminUser = req.user;
    const region = await this.documentAnnotationService.saveExtractionRegion(dto, adminUser?.id);
    return { success: true, id: region.id };
  }

  @Get("admin/extraction-regions/:documentCategory")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List extraction regions for a document category" })
  @ApiResponse({
    status: 200,
    description: "List of regions",
    type: [ExtractionRegionResponseDto],
  })
  async listExtractionRegions(
    @Param("documentCategory") documentCategory: string,
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

  @Get("admin/extraction-regions")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "List all extraction regions" })
  @ApiResponse({
    status: 200,
    description: "List of all regions",
    type: [ExtractionRegionResponseDto],
  })
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

  @Delete("admin/extraction-regions/:id")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Deactivate an extraction region" })
  @ApiResponse({ status: 200, description: "Region deactivated" })
  async deleteExtractionRegion(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.documentAnnotationService.deleteRegion(id);
    return { success: true };
  }

  @Post("admin/custom-field-values")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Save a custom field value for an entity" })
  @ApiResponse({ status: 201, description: "Custom field value saved" })
  async saveCustomFieldValue(
    @Body() dto: SaveCustomFieldValueDto,
  ): Promise<{ success: boolean; id: number }> {
    const result = await this.customFieldService.saveCustomFieldValue({
      entityType: dto.entityType,
      entityId: dto.entityId,
      fieldName: dto.fieldName,
      fieldValue: dto.fieldValue ?? null,
      documentCategory: dto.documentCategory,
      extractedFromDocumentId: dto.extractedFromDocumentId,
      confidence: dto.confidence,
    });
    return { success: true, id: result.id };
  }

  @Get("admin/custom-field-values/:entityType/:entityId")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get custom field values for an entity" })
  @ApiResponse({ status: 200, description: "Custom field values" })
  async customFieldValues(
    @Param("entityType") entityType: "customer" | "supplier",
    @Param("entityId", ParseIntPipe) entityId: number,
  ): Promise<{
    fields: Array<{
      id: number;
      fieldName: string;
      fieldValue: string | null;
      documentCategory: string;
      confidence: number | null;
      isVerified: boolean;
    }>;
  }> {
    const fields = await this.customFieldService.customFieldsForEntity(entityType, entityId);
    return {
      fields: fields.map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        fieldValue: f.fieldValue,
        documentCategory: f.documentCategory,
        confidence: f.confidence,
        isVerified: f.isVerified,
      })),
    };
  }

  @Get("admin/custom-field-definitions")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all custom field definitions" })
  @ApiResponse({ status: 200, description: "Custom field definitions" })
  async customFieldDefinitions(): Promise<{
    definitions: Array<{
      fieldName: string;
      documentCategory: string;
      sampleValue: string | null;
    }>;
  }> {
    const definitions = await this.customFieldService.customFieldDefinitions();
    return { definitions };
  }

  @Get("admin/custom-field-definitions/:documentCategory")
  @UseGuards(AdminAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get custom field definitions for a document category",
  })
  @ApiResponse({ status: 200, description: "Custom field definitions" })
  async customFieldDefinitionsForCategory(
    @Param("documentCategory") documentCategory: string,
  ): Promise<{
    definitions: Array<{
      fieldName: string;
      documentCategory: string;
      sampleValue: string | null;
    }>;
  }> {
    const definitions =
      await this.customFieldService.customFieldDefinitionsForDocumentCategory(documentCategory);
    return { definitions };
  }

  @Post("document-pages")
  @ApiOperation({
    summary: "Convert uploaded document to page images for annotation",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        scale: { type: "number", default: 1.5 },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "PDF pages as base64 images",
    type: PdfPagesResponseDto,
  })
  @UseInterceptors(FileInterceptor("file"))
  async documentPagesFromUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { scale?: string },
  ): Promise<PdfPagesResponseDto> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!file.path) {
      throw new BadRequestException(
        `File path is empty. File: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`,
      );
    }

    const buffer = fs.readFileSync(file.path);
    const scale = body.scale ? parseFloat(body.scale) : 1.5;
    return this.documentAnnotationService.convertPdfToImages(buffer, scale);
  }

  @Post("extract-from-region")
  @ApiOperation({
    summary: "Extract text from a region in an uploaded document",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        regionCoordinates: {
          type: "string",
          description: "JSON string of region coordinates",
        },
        fieldName: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Extraction result" })
  @UseInterceptors(FileInterceptor("file"))
  async extractFromRegionUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { regionCoordinates: string; fieldName: string },
  ): Promise<{ text: string; confidence: number }> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    let coordinates;
    try {
      coordinates = JSON.parse(body.regionCoordinates);
    } catch {
      throw new BadRequestException("Invalid regionCoordinates JSON");
    }

    const buffer = fs.readFileSync(file.path);
    return this.documentAnnotationService.extractFromRegion(buffer, coordinates, body.fieldName);
  }

  @Post("save-extraction-region")
  @ApiOperation({
    summary: "Save a learned extraction region from portal user",
  })
  @ApiResponse({ status: 201, description: "Region saved successfully" })
  async saveExtractionRegionFromPortal(
    @Body() dto: SaveExtractionRegionDto,
  ): Promise<{ success: boolean; id: number }> {
    const region = await this.documentAnnotationService.saveExtractionRegion(dto, undefined);
    return { success: true, id: region.id };
  }

  @Post("extract-product-spec")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Extract brand + description from a product data sheet PDF/image — feeds the QuoteSpecsEditor auto-fill.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        kind: { type: "string", enum: ["coating", "lining"] },
      },
      required: ["file", "kind"],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Extracted brand + description, both nullable.",
    schema: {
      type: "object",
      properties: {
        brand: { type: "string", nullable: true },
        description: { type: "string", nullable: true },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async extractProductSpecFromUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, unknown>,
    @Req() req: { body?: Record<string, unknown> },
  ): Promise<{ brand: string | null; description: string | null }> {
    const reqAny = req as { body?: Record<string, unknown> };
    const reqBody = reqAny.body;
    const candidateKind: unknown = body?.kind ?? reqBody?.kind ?? undefined;
    console.log(
      `[extract-product-spec] file=${file ? `${file.originalname} (${file.size}B, ${file.mimetype}, path=${file.path ? "yes" : "no"})` : "MISSING"}, ` +
        `body=${JSON.stringify(body)}, ` +
        `req.body=${JSON.stringify(reqBody)}, ` +
        `candidateKind=${JSON.stringify(candidateKind)}`,
    );
    if (!file) {
      throw new BadRequestException(
        `No file provided. body keys=${JSON.stringify(Object.keys(body || {}))}`,
      );
    }
    if (!file.path) {
      throw new BadRequestException(
        `File path is empty. File: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`,
      );
    }
    const rawKind = typeof candidateKind === "string" ? candidateKind : undefined;
    if (rawKind !== "coating" && rawKind !== "lining") {
      throw new BadRequestException(
        `kind must be 'coating' or 'lining'; received body keys=${JSON.stringify(Object.keys(body || {}))}, kind=${JSON.stringify(rawKind)}`,
      );
    }
    try {
      const buffer = fs.readFileSync(file.path);
      return await this.nixService.extractProductSpec(buffer, file.mimetype, rawKind);
    } finally {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // ignore — multer cleans up after the request anyway
      }
    }
  }
}

function parseDocumentRole(input?: string): DocumentRole | undefined {
  if (!input) return undefined;
  const allowed = Object.values(DocumentRole) as string[];
  return allowed.includes(input) ? (input as DocumentRole) : undefined;
}
