import { randomBytes } from "node:crypto";
import * as fs from "node:fs";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
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
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { PDFDocument } from "pdf-lib";
import { AdminAuthGuard, AdminRequest } from "../admin/guards/admin-auth.guard";
import { AnyUserAuthGuard, AuthenticatedUser } from "../auth/guards/any-user-auth.guard";
import { OptionalAnyUserAuthGuard } from "../auth/guards/optional-any-user-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CustomerDocumentRepository } from "../customer/customer-document.repository";
import { detectUploadSignature } from "../lib/file-magic-bytes";
import { clientIpFromRequest, hashClientIp } from "../lib/request-ip";
import { CompanyRepository } from "../platform/company.repository";
import { CompanyEmailService } from "../stock-control/services/company-email.service";
import { IStorageService, STORAGE_SERVICE } from "../storage/storage.interface";
import { SupplierDocumentRepository } from "../supplier/supplier-document.repository";
import { ConvertToJobCardDto, ConvertToJobCardResponseDto } from "./dto/convert-to-job-card.dto";
import {
  ExtractFromRegionDto,
  ExtractionRegionResponseDto,
  PdfPagesResponseDto,
  SaveCustomFieldValueDto,
  SaveExtractionRegionDto,
} from "./dto/extraction-region.dto";
import { ProcessDocumentDto, ProcessDocumentResponseDto } from "./dto/process-document.dto";
import { QuotePdfSnapshotDto } from "./dto/quote-pdf.dto";
import {
  SubmitClarificationDto,
  SubmitClarificationResponseDto,
} from "./dto/submit-clarification.dto";
import { SubmitQuoteDto } from "./dto/submit-quote.dto";
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
import { NixThrottlerGuard } from "./guards/nix-throttler.guard";
import { type NixLearningWriteTrust, NixService } from "./nix.service";
import { CustomFieldService } from "./services/custom-field.service";
import { DocumentAnnotationService } from "./services/document-annotation.service";
import type { NixFeedbackPayload } from "./services/learning-feedback.util";
import { NixAnonGeminiCeilingService } from "./services/nix-anon-gemini-ceiling.service";
import { NixExtractionSessionService } from "./services/nix-extraction-session.service";
import { NixTurnstileService } from "./services/nix-turnstile.service";
import { QuotePdfService } from "./services/quote-pdf.service";
import { QuoteToJobCardService } from "./services/quote-to-job-card.service";
import {
  ExpectedCompanyData,
  RegistrationDocumentType,
  RegistrationDocumentVerifierService,
} from "./services/registration-document-verifier.service";
import { type RoleClassification, RoleClassifierService } from "./services/role-classifier.service";

// Cost caps applied ONLY to anonymous (tokenless) uploads on the public Nix
// routes. Authenticated callers are fully exempt — sized above a real anon RFQ
// / supplier-registration session (1-5 docs) and tight for a tokenless bot.
const ANON_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const ANON_MAX_PAGES = 30;
const ANON_VISION_MAX_PAGES = 5;
const ANON_DOCUMENT_PAGES_MAX_SCALE = 1.5;
const ANON_DOCUMENT_PAGES_MAX_BASE64_BYTES = 40 * 1024 * 1024;
const ANON_MAX_REGION_DIMENSION = 5000;
const ANON_VERIFY_MAX_FILES = 5;

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
    private readonly customerDocumentRepo: CustomerDocumentRepository,
    private readonly supplierDocumentRepo: SupplierDocumentRepository,
    private readonly quotePdfService: QuotePdfService,
    private readonly roleClassifier: RoleClassifierService,
    private readonly quoteToJobCardService: QuoteToJobCardService,
    private readonly companyEmailService: CompanyEmailService,
    private readonly companyRepo: CompanyRepository,
    private readonly anonGeminiCeiling: NixAnonGeminiCeilingService,
    private readonly turnstileService: NixTurnstileService,
  ) {}

  /**
   * Invisible-Turnstile proof-of-human gate for the FIRST cost-bearing anonymous
   * action (defence in depth over the throttle + daily ceilings). NO-OP when
   * TURNSTILE_SECRET_KEY is unset (ships dormant). Skipped for authenticated
   * callers and for `exempt` flows (skipExtraction archival, magic-link /
   * anon-draft uploads that already carry a server-validated scope token). On a
   * fresh verification it sets the issued 30-min session token on the response so
   * the client can present it on subsequent anonymous calls (no re-challenge).
   */
  private async enforceAnonTurnstile(
    authUser: AuthenticatedUser | null,
    req: Request,
    res: Response,
    exempt: boolean,
  ): Promise<void> {
    if (authUser != null || exempt) {
      return;
    }
    const headers = (req as unknown as { headers: Record<string, string | string[] | undefined> })
      .headers;
    const turnstileToken = firstHeaderValue(headers["cf-turnstile-response"]);
    const sessionToken = firstHeaderValue(headers["x-nix-turnstile-session"]);
    const remoteIp = clientIpFromRequest(req as unknown as Record<string, unknown>);
    const { issuedSession } = await this.turnstileService.assertHuman({
      turnstileToken,
      sessionToken,
      remoteIp,
    });
    if (issuedSession) {
      res.setHeader("x-nix-turnstile-session", issuedSession);
    }
  }

  /**
   * Enforces the global daily ceiling on anonymous Gemini-spending requests
   * (botnet backstop the per-IP throttle can't provide). Authenticated callers
   * are never counted or blocked. Rejects with 429 + a friendly message once
   * the day's cap is exceeded.
   */
  private async enforceAnonGeminiDailyCeiling(
    authUser: AuthenticatedUser | null,
    count: number = 1,
  ): Promise<void> {
    if (authUser != null) {
      return;
    }
    const allowed = await this.anonGeminiCeiling.tryConsume(count);
    if (!allowed) {
      throw new HttpException(
        "Nix is handling a lot of requests right now — please sign in or try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Enforces the global daily ceiling on anonymous LOCAL-CPU requests
   * (Ghostscript rasterise + Tesseract OCR) — they spend no Gemini tokens but
   * exhaust the shared Fly VM CPU under a botnet. Authenticated callers exempt.
   */
  private async enforceAnonCpuDailyCeiling(
    authUser: AuthenticatedUser | null,
    count: number = 1,
  ): Promise<void> {
    if (authUser != null) {
      return;
    }
    const allowed = await this.anonGeminiCeiling.tryConsumeCpu(count);
    if (!allowed) {
      throw new HttpException(
        "Nix is handling a lot of requests right now — please sign in or try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Post("process")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Process a document for extraction" })
  @ApiResponse({
    status: 201,
    description: "Document processing started",
    type: ProcessDocumentResponseDto,
  })
  async processDocument(
    @Body() dto: ProcessDocumentDto,
    @Req() req: Request,
  ): Promise<ProcessDocumentResponseDto> {
    const authUser = req["authUser"] as AuthenticatedUser;
    return this.nixService.processDocument({ ...dto, userId: authUser.userId });
  }

  @Post("upload")
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
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
        scopeKind: { type: "string" },
        scopeRef: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Document uploaded and processing started",
  })
  async uploadDocument(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
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
    @Body("scopeKind") scopeKind?: string,
    @Body("scopeRef") scopeRef?: string,
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
    const skip = skipExtraction === "true" || skipExtraction === "1";
    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    const allowVision = await this.enforceAnonymousUploadCaps(file, authUser, skip);
    // Invisible Turnstile (dormant without keys) gates the FIRST cost-bearing
    // anonymous extract. ONLY skipExtraction archival is exempt (it never reaches
    // Gemini) — the exemption must NOT trust the client-supplied scopeKind, or an
    // attacker could send scopeKind=anon-draft to bypass the captcha and still
    // hit Gemini. The magic-link funnel is skipExtraction (covered by `skip`);
    // the anon RFQ wizard's first extract is challenged by the invisible widget.
    await this.enforceAnonTurnstile(authUser, req, res, skip);
    // Archive-only uploads never hit Gemini, so they don't count toward the
    // anonymous daily Gemini ceiling.
    if (!skip) {
      await this.enforceAnonGeminiDailyCeiling(authUser);
    }

    // Scope binding for anonymous uploads only. Two cases:
    //  - the client forwarded its own funnel ref (magic-link token) → keep it
    //    (POPIA binding; these are skipExtraction archival, no clarifications);
    //  - otherwise mint a HIGH-ENTROPY per-extraction capability token so only
    //    the uploader can later answer this extraction's clarifications. The
    //    token is returned to the uploader and is the sole anonymous clarification
    //    credential (sequential ids are NOT trusted).
    // Authenticated callers bind via userId instead.
    let scopeBinding: { scopeKind?: string; scopeRef?: string } | null = null;
    let anonAccessToken: string | null = null;
    if (authUser == null) {
      if (scopeRef) {
        scopeBinding = { scopeKind: scopeKind || undefined, scopeRef };
      } else if (!skip) {
        anonAccessToken = randomBytes(24).toString("hex");
        scopeBinding = { scopeKind: "anon-extraction-token", scopeRef: anonAccessToken };
      }
    }

    const dto: ProcessDocumentDto = {
      documentPath: file.path,
      documentName: file.originalname,
      userId: authUser ? authUser.userId : userId ? parseInt(userId, 10) : undefined,
      rfqId: rfqId ? parseInt(rfqId, 10) : undefined,
      sourceModule: sourceModule || undefined,
      sourceId: sourceId ? parseInt(sourceId, 10) : undefined,
      extractionProfile: extractionProfile || undefined,
      documentRole: role,
      sessionId: sessionId ? parseInt(sessionId, 10) : undefined,
      productTypes: parsedProductTypes,
      skipExtraction: skip,
      allowVision,
      scopeKind: scopeBinding?.scopeKind,
      scopeRef: scopeBinding?.scopeRef,
    };

    const response = await this.nixService.processDocument(dto);
    if (anonAccessToken) {
      response.anonAccessToken = anonAccessToken;
    }
    return response;
  }

  /**
   * Cheap, pre-Gemini cost caps applied ONLY to anonymous (tokenless) uploads.
   * Authenticated callers return early, fully exempt. Returns the resolved
   * `allowVision` flag (anonymous PDFs over the small-doc page threshold stay on
   * the cheap text path). Archive-only uploads (the customer magic-link drawing
   * attachment, skipExtraction:true) never reach the Gemini/vision path, so only
   * the 25 MB ceiling applies to them.
   */
  private async enforceAnonymousUploadCaps(
    file: Express.Multer.File,
    authUser: AuthenticatedUser | null,
    skipExtraction: boolean,
  ): Promise<boolean> {
    if (authUser) {
      return true;
    }

    if (file.size > ANON_MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(
        `This file is too large to upload without signing in (limit ${Math.round(
          ANON_MAX_UPLOAD_BYTES / 1024 / 1024,
        )} MB). Please sign in or upload a smaller file.`,
      );
    }

    if (skipExtraction) {
      return true;
    }

    const buffer = fs.readFileSync(file.path);
    const kind = detectUploadSignature(buffer);
    if (!kind) {
      throw new BadRequestException(
        "This file type isn't supported here. Please upload a PDF, image (PNG/JPG) or Office document.",
      );
    }

    if (kind !== "pdf") {
      return true;
    }

    let pageCount: number;
    try {
      const pdf = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      pageCount = pdf.getPageCount();
    } catch {
      return false;
    }

    if (pageCount > ANON_MAX_PAGES) {
      throw new BadRequestException(
        `This document has ${pageCount} pages, over the ${ANON_MAX_PAGES}-page limit for uploads without signing in. Please sign in or upload a shorter document.`,
      );
    }

    return pageCount <= ANON_VISION_MAX_PAGES;
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
    return this.sessionService.sessionsForOwner(authUser.userId, { sourceModule, status });
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

  @Post("sessions/:id/suggest-order-number")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "On-demand suggestion of the customer's PO / Order / Job reference for this session. Runs a focused Gemini call against the concatenated rawText of every extraction. Returns { suggestion: string | null }. Null when no clear customer reference is found in the documents.",
  })
  @ApiResponse({
    status: 201,
    schema: {
      type: "object",
      properties: { suggestion: { type: "string", nullable: true } },
    },
  })
  async suggestSessionOrderNumber(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ suggestion: string | null }> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.nixService.suggestCustomerOrderNumber(id);
  }

  @Post("sessions/:id/pdf")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Render the customer-facing quote PDF for download. The frontend POSTs a pre-computed snapshot (pool rows + unit prices + totals + notes) so the backend can build the HTML template without re-running pricing logic. Returns the PDF as application/pdf.",
  })
  async downloadSessionPdf(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { snapshot: QuotePdfSnapshotDto },
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    const companyId = authUser.companyId;
    if (companyId == null) {
      throw new BadRequestException(
        "Quote PDF requires a stock-control authenticated user with a companyId",
      );
    }
    const { buffer, filename } = await this.quotePdfService.generateQuotePdf(
      id,
      companyId,
      body.snapshot,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.end(buffer);
  }

  @Post("sessions/:id/email-customer")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Email the customer-facing quote PDF to the customer (or an override recipient). Reuses QuotePdfService to render the PDF, then sends via CompanyEmailService using the tenant's SMTP config. Returns { sent: boolean, to: string }.",
  })
  async emailSessionPdf(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: {
      snapshot: QuotePdfSnapshotDto;
      to?: string;
      cc?: string;
      subject?: string;
      message?: string;
    },
    @Req() req: Request,
  ): Promise<{ sent: boolean; to: string }> {
    const authUser = req["authUser"] as AuthenticatedUser;
    const session = await this.sessionService.findOneForUser(
      id,
      authUser.userId,
      authUser.type === "admin",
    );
    const companyId = authUser.companyId;
    if (companyId == null) {
      throw new BadRequestException(
        "Quote email requires a stock-control authenticated user with a companyId",
      );
    }

    let recipient = (body.to ?? "").trim();
    if (recipient.length === 0) {
      recipient = await this.resolveCustomerEmail(session);
    }
    if (recipient.length === 0) {
      throw new BadRequestException(
        "No recipient email available — pass `to` in the request or set the customer's email on the customer card.",
      );
    }

    const { buffer, filename } = await this.quotePdfService.generateQuotePdf(
      id,
      companyId,
      body.snapshot,
    );

    const quoteRef = session.promotedRef ?? `session-${id}`;
    const subject =
      body.subject && body.subject.trim().length > 0
        ? body.subject.trim()
        : `Quotation ${quoteRef}`;
    const messageText =
      body.message && body.message.trim().length > 0
        ? body.message.trim()
        : `Please find attached our quotation ${quoteRef}.`;

    const escapedMessage = messageText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");
    const html = `<div style="font-family:Arial,sans-serif;font-size:13px;color:#111827;line-height:1.5;">
  <p>${escapedMessage}</p>
</div>`;

    const sent = await this.companyEmailService.sendEmail(companyId, {
      to: recipient,
      ...(body.cc && body.cc.trim().length > 0 ? { cc: body.cc.trim() } : {}),
      subject,
      html,
      text: messageText,
      attachments: [
        {
          filename,
          content: buffer,
          contentType: "application/pdf",
        },
      ],
    });

    if (!sent) {
      throw new BadRequestException(
        "Email could not be sent — tenant SMTP is not configured. Configure SMTP under Settings → Email before emailing customers.",
      );
    }

    return { sent: true, to: recipient };
  }

  private async resolveCustomerEmail(session: NixExtractionSession): Promise<string> {
    const customerCompanyId = session.customerCompanyId;
    if (customerCompanyId != null) {
      const live = await this.companyRepo.findById(customerCompanyId);
      const liveEmail = live ? (live.contact?.email ?? null) : null;
      if (liveEmail && liveEmail.trim().length > 0) return liveEmail.trim();
    }
    const snap = session.customerSnapshot;
    if (snap && typeof snap === "object") {
      const candidate = (snap as Record<string, unknown>).email;
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return "";
  }

  @Post("sessions/:id/submit")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Mark the quote as submitted (stamps submittedAt = NOW()). The session stays in 'promoted' status and remains editable; this is a display-only indicator for the Quotations hub.",
  })
  @ApiResponse({ status: 201, type: NixExtractionSession })
  async submitSession(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: SubmitQuoteDto,
    @Req() req: Request,
  ): Promise<NixExtractionSession> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    return this.sessionService.markSubmitted(id, dto.quoteTotalIncVat);
  }

  @Post("sessions/:id/convert-to-job-card")
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Convert a promoted Nix quote into a Job Card. Creates the JC root + line items in one transaction, stamps the session with jobCardId so the convert button locks afterwards. Body carries the same pooled-items snapshot the PDF / email endpoints use, plus job number / name / due date / location / contact overrides from the modal.",
  })
  @ApiResponse({ status: 201, type: ConvertToJobCardResponseDto })
  async convertToJobCard(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ConvertToJobCardDto,
    @Req() req: Request,
  ): Promise<ConvertToJobCardResponseDto> {
    const authUser = req["authUser"] as AuthenticatedUser;
    await this.sessionService.findOneForUser(id, authUser.userId, authUser.type === "admin");
    const companyId = authUser.companyId;
    if (companyId == null) {
      throw new BadRequestException(
        "Convert to Job Card requires a stock-control authenticated user with a companyId",
      );
    }
    return this.quoteToJobCardService.convert({
      sessionId: id,
      companyId,
      dto: body,
    });
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
  @UseGuards(AnyUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get extraction details by ID" })
  @ApiResponse({
    status: 200,
    description: "Extraction details",
    type: NixExtraction,
  })
  async extraction(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<NixExtraction> {
    const authUser = req["authUser"] as AuthenticatedUser;
    const extraction = await this.nixService.extraction(id);
    if (!extraction) {
      throw new NotFoundException(`Extraction ${id} not found`);
    }
    const isAdmin = authUser.type === "admin";
    if (!isAdmin && extraction.userId !== authUser.userId) {
      throw new NotFoundException(`Extraction ${id} not found`);
    }
    return extraction;
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
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Submit a clarification response" })
  @ApiResponse({
    status: 201,
    description: "Clarification submitted",
    type: SubmitClarificationResponseDto,
  })
  async submitClarification(
    @Req() req: Request,
    @Body() dto: SubmitClarificationDto,
  ): Promise<SubmitClarificationResponseDto> {
    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;

    if (authUser) {
      // Authenticated IDOR is fully closed: a signed-in caller may only answer a
      // clarification on an extraction they own (or admin). NotFoundException —
      // not Forbidden — so the id is not confirmed to exist for non-owners.
      const ownerUserId = await this.nixService.clarificationOwnerUserId(dto.clarificationId);
      const isAdmin = authUser.type === "admin";
      if (!isAdmin && ownerUserId !== authUser.userId) {
        throw new NotFoundException("Clarification not found");
      }
    } else {
      // Anonymous IDOR close: the answer must forward the HIGH-ENTROPY per-
      // extraction capability token minted at upload time and stored on the
      // extraction. No token, or a token that doesn't EXACTLY equal the stored
      // one → NotFound (no existence oracle). There is no sequential-id matching
      // and no unbound fallback — every new anonymous extraction carries a token,
      // so there is no legitimate no-token answer.
      const token = await this.nixService.clarificationAccessToken(dto.clarificationId);
      if (!dto.scopeRef || token == null || dto.scopeRef !== token) {
        throw new NotFoundException("Clarification not found");
      }
    }

    const trust = this.learningWriteTrust(req, authUser);
    const response = await this.nixService.submitClarification(dto, trust);

    // Item-leak defense-in-depth: never return the extraction's items to an
    // anonymous caller (the uploader already holds its own items from the upload
    // response). Return only the answer outcome.
    if (authUser == null) {
      return {
        success: response.success,
        remainingClarifications: response.remainingClarifications,
      };
    }
    return response;
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
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: "Submit a user correction for learning" })
  @ApiResponse({ status: 201, description: "Correction recorded for learning" })
  async submitCorrection(
    @Req() req: Request,
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
    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    const trust = this.learningWriteTrust(req, authUser);
    const scopedExtractionId = await this.scopedExtractionId(body.extractionId ?? null, authUser);
    return this.nixService.recordCorrection(
      {
        extractionId: scopedExtractionId ?? undefined,
        itemDescription: body.itemDescription,
        fieldName: body.fieldName,
        originalValue: body.originalValue,
        correctedValue: body.correctedValue,
        userId: trust.ownerUserId ?? undefined,
      },
      trust,
    );
  }

  /**
   * Builds the learning-write trust context from the request's authenticated
   * identity ONLY — any client-supplied body `userId` is ignored. Authenticated
   * → trusted (USER_CORRECTION, not quarantined). Anonymous → quarantined +
   * one-way IP hash so the shared learning set can't be poisoned by a tokenless
   * actor, while the write still returns 200 (the anon funnel keeps working).
   */
  private learningWriteTrust(
    req: Request,
    authUser: AuthenticatedUser | null,
  ): NixLearningWriteTrust {
    if (authUser) {
      return { ownerUserId: authUser.userId, quarantined: false, sourceIpHash: null };
    }
    const ip = clientIpFromRequest(req as unknown as Record<string, unknown>);
    return { ownerUserId: null, quarantined: true, sourceIpHash: hashClientIp(ip) };
  }

  /**
   * Only trusts a client-supplied extractionId after confirming it belongs to
   * the authenticated caller's scope (owner or admin). Anonymous callers — who
   * have no validatable scope yet — store the write WITHOUT an extractionId
   * rather than trusting the client value.
   */
  private async scopedExtractionId(
    extractionId: number | null,
    authUser: AuthenticatedUser | null,
  ): Promise<number | null> {
    if (extractionId == null || !authUser) {
      return null;
    }
    const extraction = await this.nixService.extraction(extractionId);
    if (!extraction) {
      return null;
    }
    const isAdmin = authUser.type === "admin";
    if (!isAdmin && extraction.userId !== authUser.userId) {
      return null;
    }
    return extractionId;
  }

  @Post("classify-role")
  @ApiOperation({
    summary:
      "Classify a document's role (drawing / specification / other) from its filename alone — cheap heuristics, no AI",
  })
  @ApiResponse({ status: 201, description: "Role classification" })
  classifyRoleByFilename(@Body() body: { filename: string }): RoleClassification {
    return this.roleClassifier.classifyByFilename(body.filename || "");
  }

  @Post("classify-role/content")
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary:
      "Classify a document's role with a content glance — filename heuristics first, one-shot Gemini look at ambiguous PDFs",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
      required: ["file"],
    },
  })
  @ApiResponse({ status: 201, description: "Role classification" })
  async classifyRoleByContent(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RoleClassification> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    // The Nix Multer module uses DISK storage, so file.buffer is undefined —
    // load the buffer from disk (same pattern as the upload path) before the
    // Gemini-vision glance, which otherwise throws on file.buffer.length.
    const buffer = fs.readFileSync(file.path);

    // Anonymous-only cost caps before the Gemini-vision call: size + magic-byte
    // allowlist (no page cap — the glance only reads page 1). Authenticated
    // callers are exempt.
    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    if (!authUser) {
      if (file.size > ANON_MAX_UPLOAD_BYTES) {
        throw new PayloadTooLargeException(
          `This file is too large to upload without signing in (limit ${Math.round(
            ANON_MAX_UPLOAD_BYTES / 1024 / 1024,
          )} MB). Please sign in or upload a smaller file.`,
        );
      }
      if (!detectUploadSignature(buffer)) {
        throw new BadRequestException(
          "This file type isn't supported here. Please upload a PDF, image (PNG/JPG) or Office document.",
        );
      }
    }
    await this.enforceAnonTurnstile(authUser, req, res, false);
    await this.enforceAnonGeminiDailyCeiling(authUser);

    return this.roleClassifier.classify({
      originalname: file.originalname,
      buffer,
      mimetype: file.mimetype,
    });
  }

  @Post("learning/feedback")
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary:
      "Submit a batch of Step 3 line-item corrections (diff between the Nix extraction and the customer's final items) for learning",
  })
  @ApiResponse({ status: 201, description: "Feedback corrections recorded for learning" })
  async submitLearningFeedback(
    @Req() req: Request,
    @Body() body: NixFeedbackPayload,
  ): Promise<{ success: boolean; recorded: number }> {
    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    const trust = this.learningWriteTrust(req, authUser);
    const scopedExtractionId = await this.scopedExtractionId(body.extractionId ?? null, authUser);
    const scopedPayload: NixFeedbackPayload = {
      ...body,
      extractionId: scopedExtractionId,
      userId: trust.ownerUserId,
      customerId: authUser?.customerId ?? null,
    };
    return this.nixService.recordFeedbackBatch(scopedPayload, trust);
  }

  @Post("verify-registration-document")
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @UploadedFile() file: Express.Multer.File,
    @Body("documentType") documentType: string,
    @Body("expectedData") expectedDataJson: string,
  ): Promise<VerifyRegistrationDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    await this.enforceAnonymousUploadCaps(file, authUser, false);
    await this.enforceAnonTurnstile(authUser, req, res, false);
    await this.enforceAnonGeminiDailyCeiling(authUser);

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
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @UploadedFiles() files: Express.Multer.File[],
    @Body("documentTypes") documentTypesJson: string,
    @Body("expectedData") expectedDataJson: string,
  ): Promise<VerifyRegistrationBatchResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    if (files.length > ANON_VERIFY_MAX_FILES) {
      throw new BadRequestException(
        `Too many files — verify at most ${ANON_VERIFY_MAX_FILES} documents at once.`,
      );
    }

    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    for (const file of files) {
      await this.enforceAnonymousUploadCaps(file, authUser, false);
    }
    await this.enforceAnonTurnstile(authUser, req, res, false);
    // Each file in the batch is a separate Gemini verification — count them all.
    await this.enforceAnonGeminiDailyCeiling(authUser, files.length);

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
        ? await this.customerDocumentRepo.findById(documentId)
        : await this.supplierDocumentRepo.findById(documentId);

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
        ? await this.customerDocumentRepo.findById(documentId)
        : await this.supplierDocumentRepo.findById(documentId);

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
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
    @Req() req: Request,
  ): Promise<PdfPagesResponseDto> {
    if (!file) {
      throw new BadRequestException("No file provided");
    }

    if (!file.path) {
      throw new BadRequestException(
        `File path is empty. File: ${file.originalname}, size: ${file.size}, mimetype: ${file.mimetype}`,
      );
    }

    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    // Anonymous: reject oversized / wrong-type / >30-page PDFs BEFORE the
    // Ghostscript rasterize (CPU/OOM DoS guard); authenticated callers exempt.
    await this.enforceAnonymousUploadCaps(file, authUser, false);
    // Global daily anonymous local-CPU ceiling (Ghostscript rasterise) —
    // botnet backstop beyond the per-IP throttle.
    await this.enforceAnonCpuDailyCeiling(authUser);

    const buffer = fs.readFileSync(file.path);
    const rawScale = body.scale ? parseFloat(body.scale) : 1.5;
    const safeScale = Number.isFinite(rawScale) && rawScale > 0 ? rawScale : 1.5;

    if (authUser) {
      return this.documentAnnotationService.convertPdfToImages(buffer, safeScale);
    }

    // Anonymous resource clamps: scale ≤1.5, page cap, and a total base64 byte
    // ceiling so a pre-auth browser can't be served hundreds of MB of JSON.
    return this.documentAnnotationService.convertPdfToImages(
      buffer,
      Math.min(safeScale, ANON_DOCUMENT_PAGES_MAX_SCALE),
      {
        maxPages: ANON_MAX_PAGES,
        maxTotalBase64Bytes: ANON_DOCUMENT_PAGES_MAX_BASE64_BYTES,
      },
    );
  }

  @Post("extract-from-region")
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
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
    @Req() req: Request,
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

    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    if (!authUser) {
      this.assertAnonymousRegionRequest(file, buffer, coordinates);
    }
    // Global daily anonymous local-CPU ceiling (Ghostscript + Tesseract OCR).
    await this.enforceAnonCpuDailyCeiling(authUser);

    return this.documentAnnotationService.extractFromRegion(buffer, coordinates, body.fieldName);
  }

  /**
   * Anonymous-only sanity caps for a region OCR request: file size + magic-byte
   * allowlist, plus a per-request region sanity cap (valid page within the
   * anon page cap, positive and bounded width/height) so a tokenless caller
   * can't drive an unbounded Tesseract/Ghostscript job. Authenticated callers
   * are exempt (the caller already checks `authUser == null`).
   */
  private assertAnonymousRegionRequest(
    file: Express.Multer.File,
    buffer: Buffer,
    coordinates: unknown,
  ): void {
    if (file.size > ANON_MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException(
        `This file is too large to use without signing in (limit ${Math.round(
          ANON_MAX_UPLOAD_BYTES / 1024 / 1024,
        )} MB). Please sign in or upload a smaller file.`,
      );
    }
    if (!detectUploadSignature(buffer)) {
      throw new BadRequestException(
        "This file type isn't supported here. Please upload a PDF, image (PNG/JPG) or Office document.",
      );
    }
    const region = (coordinates ?? {}) as {
      pageNumber?: unknown;
      width?: unknown;
      height?: unknown;
    };
    const pageNumber = Number(region.pageNumber);
    const width = Number(region.width);
    const height = Number(region.height);
    const pageValid =
      Number.isFinite(pageNumber) && pageNumber >= 1 && pageNumber <= ANON_MAX_PAGES;
    const dimsValid =
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0 &&
      width <= ANON_MAX_REGION_DIMENSION &&
      height <= ANON_MAX_REGION_DIMENSION;
    if (!pageValid || !dimsValid) {
      throw new BadRequestException("Invalid region — page or selection size is out of range.");
    }
  }

  @Post("save-extraction-region")
  @UseGuards(OptionalAnyUserAuthGuard, NixThrottlerGuard)
  @SkipThrottle({ upload: true })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: "Save a learned extraction region from portal user",
  })
  @ApiResponse({ status: 201, description: "Region saved successfully" })
  async saveExtractionRegionFromPortal(
    @Body() dto: SaveExtractionRegionDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; id: number }> {
    const authUser = (req["authUser"] ?? null) as AuthenticatedUser | null;
    // Lane-isolate: anonymous (tokenless) region writes are quarantined so they
    // can never overwrite an admin-trained region that feeds the cross-tenant
    // registration-document verifier (findActiveForCategory excludes quarantined).
    const region = await this.documentAnnotationService.saveExtractionRegion(
      dto,
      authUser?.userId ?? null,
      authUser == null,
    );
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

function firstHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
