import * as fs from "node:fs";
import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { bufferToMulterFile, documentPath } from "../lib/app-storage-helper";
import { SecureDocumentsService } from "../secure-documents/secure-documents.service";
import { S3StorageService } from "../storage/s3-storage.service";
import { StorageArea } from "../storage/storage.interface";
import { AiChatService } from "./ai-providers/ai-chat.service";
import { AiExtractionService } from "./ai-providers/ai-extraction.service";
import { DEFAULT_EXTRACTION_SYSTEM_PROMPT } from "./ai-providers/ai-provider.interface";
import { ProcessDocumentDto, ProcessDocumentResponseDto } from "./dto/process-document.dto";
import {
  SubmitClarificationDto,
  SubmitClarificationResponseDto,
} from "./dto/submit-clarification.dto";
import {
  ClarificationStatus,
  ClarificationType,
  NixClarification,
} from "./entities/nix-clarification.entity";
import {
  DocumentRole,
  DocumentType,
  ExtractionStatus,
  NixExtraction,
} from "./entities/nix-extraction.entity";
import { LearningSource, LearningType, NixLearning } from "./entities/nix-learning.entity";
import { NixUserPreference } from "./entities/nix-user-preference.entity";
import { NixExtractionProfileRegistry } from "./profiles";
import {
  ExcelExtractorService,
  ExtractedItem,
  ExtractionResult,
  SpecificationCellData,
} from "./services/excel-extractor.service";
import { PdfExtractorService } from "./services/pdf-extractor.service";
import { WordExtractorService } from "./services/word-extractor.service";

@Injectable()
export class NixService {
  private readonly logger = new Logger(NixService.name);

  constructor(
    @InjectRepository(NixExtraction)
    private readonly extractionRepo: Repository<NixExtraction>,
    @InjectRepository(NixLearning)
    private readonly learningRepo: Repository<NixLearning>,
    @InjectRepository(NixUserPreference)
    private readonly preferenceRepo: Repository<NixUserPreference>,
    @InjectRepository(NixClarification)
    private readonly clarificationRepo: Repository<NixClarification>,
    private readonly excelExtractor: ExcelExtractorService,
    private readonly pdfExtractor: PdfExtractorService,
    private readonly wordExtractor: WordExtractorService,
    private readonly aiExtractor: AiExtractionService,
    private readonly aiChatService: AiChatService,
    @Inject(forwardRef(() => SecureDocumentsService))
    private readonly secureDocumentsService: SecureDocumentsService,
    private readonly s3StorageService: S3StorageService,
    private readonly profileRegistry: NixExtractionProfileRegistry,
  ) {}

  private resolveSourceLinkage(dto: ProcessDocumentDto): {
    sourceModule?: string;
    sourceId?: number;
    extractionProfile?: string;
  } {
    const sourceModule = dto.sourceModule ? dto.sourceModule : dto.rfqId ? "rfq" : undefined;
    const sourceId = dto.sourceId ? dto.sourceId : dto.rfqId;
    const extractionProfile = dto.extractionProfile
      ? dto.extractionProfile
      : sourceModule === "rfq"
        ? "rfq-piping"
        : undefined;
    return { sourceModule, sourceId, extractionProfile };
  }

  /**
   * Maps a source module key (e.g. "asca", "rfq") to the StorageArea bucket
   * its uploads live under. Falls back to ANNIX_APP for unknown sources so
   * a document is never silently dropped.
   */
  private storageAreaForSource(sourceModule: string | undefined): StorageArea {
    switch (sourceModule) {
      case "asca":
        return StorageArea.STOCK_CONTROL;
      case "rfq":
        return StorageArea.ANNIX_APP;
      default:
        return StorageArea.ANNIX_APP;
    }
  }

  /**
   * Persist the uploaded file to S3 alongside the temp-disk copy that
   * Nix's extractors consume. The temp file is still required by the
   * extractors during this request; the S3 key is the durable reference
   * for everything after — audit playback, the draft review page, retention
   * tied to the parent session/quote.
   *
   * Failures here are logged but do NOT block extraction — the AI flow
   * still has the temp file. Storage remains best-effort while the disk
   * copy is the ground truth for the in-flight call.
   */
  private async persistToObjectStorage(
    extraction: NixExtraction,
    tempPath: string,
    originalName: string,
    sourceModule: string | undefined,
  ): Promise<void> {
    try {
      const buffer = fs.readFileSync(tempPath);
      const area = this.storageAreaForSource(sourceModule);
      const subPath = documentPath(
        area,
        "extractions",
        extraction.id,
        extraction.documentRole ?? "unrolled",
        originalName,
      );
      const mimeType = this.mimeTypeForName(originalName);
      const file = bufferToMulterFile(buffer, originalName, mimeType);
      const result = await this.s3StorageService.upload(file, subPath);

      extraction.storagePath = result.path;
      extraction.storageArea = area;
      extraction.storageSizeBytes = result.size;
      extraction.storageMimeType = result.mimeType;
      await this.extractionRepo.save(extraction);

      this.logger.log(
        `Persisted extraction #${extraction.id} source to ${result.path} (${result.size} bytes)`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to persist extraction #${extraction.id} source to S3: ${
          err instanceof Error ? err.message : "unknown"
        }. Extraction will continue against the temp file but the source will not be available for later audit.`,
      );
    }
  }

  private mimeTypeForName(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      pdf: "application/pdf",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      csv: "text/csv",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    };
    return map[ext] ?? "application/octet-stream";
  }

  /**
   * Returns a short-lived presigned URL the user can use to view the original
   * source document of a Nix extraction. Used by the draft review UI's
   * "View original" links so the user can audit Nix's reading against the
   * actual drawing or specification.
   *
   * Returns null if the extraction has no S3-persisted source (typically a
   * legacy row created before #253 task E).
   */
  async extractionDocumentUrl(
    extraction: NixExtraction,
    expiresInSeconds = 600,
  ): Promise<string | null> {
    if (!extraction.storagePath) return null;
    return this.s3StorageService.presignedUrl(extraction.storagePath, expiresInSeconds);
  }

  /**
   * Re-runs extraction against an existing extraction's stored source. Used by
   * the draft review UI's per-row 'Retry' button — the original upload may
   * have failed (Word extractor crash, prompt mismatch, transient API error),
   * or the prompt has since been improved and the user wants to re-extract
   * against the persisted source without uploading the same file again.
   *
   * Reuses the same extraction record — does NOT create a duplicate row, so
   * the draft view stays clean. Requires storagePath; legacy rows persisted
   * before #253 task E can't be retried via this path (no source on file).
   */
  async retryExtraction(extractionId: number): Promise<NixExtraction> {
    const extraction = await this.extractionRepo.findOne({ where: { id: extractionId } });
    if (!extraction) {
      throw new Error("Extraction not found");
    }
    if (!extraction.storagePath) {
      throw new Error(
        "No source document on file for this extraction (predates S3 persistence). Re-upload the file instead.",
      );
    }

    const buffer = await this.s3StorageService.download(extraction.storagePath);
    const tempPath = `${process.env.TEMP || process.env.TMPDIR || "/tmp"}/nix-retry-${extractionId}-${Date.now()}-${extraction.documentName}`;
    fs.writeFileSync(tempPath, buffer);

    extraction.status = ExtractionStatus.PROCESSING;
    extraction.errorMessage = undefined;
    await this.extractionRepo.save(extraction);

    const startTime = Date.now();
    const documentType = this.detectDocumentType(extraction.documentName);
    const profileHandler = extraction.extractionProfile
      ? this.profileRegistry.handler(extraction.extractionProfile)
      : null;
    const sessionSiblings = await this.findSessionSiblings(
      extraction.sessionId,
      extraction.sourceModule,
      extraction.sourceId,
      extraction.id,
    );
    const profileSystemPrompt = profileHandler?.systemPrompt
      ? profileHandler.systemPrompt({
          role: extraction.documentRole,
          siblings: sessionSiblings,
        })
      : undefined;

    try {
      let extractedData: Record<string, any> = {};
      let extractedItems: any[] = [];
      let specificationCells: SpecificationCellData[] = [];

      switch (documentType) {
        case DocumentType.PDF:
          ({ extractedData, extractedItems, specificationCells } = await this.extractFromPdf(
            tempPath,
            extraction.documentName,
            undefined,
            profileSystemPrompt,
            extraction.documentRole,
          ));
          break;
        case DocumentType.WORD:
          ({ extractedData, extractedItems, specificationCells } = await this.extractFromWord(
            tempPath,
            extraction.documentName,
            undefined,
            profileSystemPrompt,
            extraction.documentRole,
          ));
          break;
        case DocumentType.EXCEL:
          ({ extractedData, extractedItems, specificationCells } =
            await this.extractFromExcel(tempPath));
          break;
        default:
          throw new Error(`Unsupported document type for retry: ${documentType}`);
      }

      const relevanceFiltered = await this.filterByRelevance(extractedItems, undefined);
      const relevantItems = this.dropPseudoItemsForSpec(relevanceFiltered, extraction.documentRole);

      extraction.extractedData = extractedData;
      extraction.extractedItems = relevantItems;
      extraction.relevanceScore = this.calculateOverallRelevance(relevantItems);
      extraction.processingTimeMs = Date.now() - startTime;
      extraction.status = ExtractionStatus.COMPLETED;
      extraction.errorMessage = undefined;

      if (profileHandler) {
        try {
          await profileHandler.postExtract(extraction, {
            documentName: extraction.documentName,
            documentPath: tempPath,
            documentRole: extraction.documentRole,
            extractedItems: relevantItems,
            specificationCells,
            sourceModule: extraction.sourceModule,
            sourceId: extraction.sourceId,
            sessionSiblings,
          });
        } catch (err) {
          this.logger.error(
            `Profile postExtract failed during retry for #${extractionId}: ${err instanceof Error ? err.message : "unknown"}`,
          );
        }
      }

      await this.extractionRepo.save(extraction);
      this.logger.log(
        `Retried extraction #${extractionId} successfully — ${relevantItems.length} items in ${extraction.processingTimeMs}ms`,
      );
      return extraction;
    } catch (err) {
      extraction.status = ExtractionStatus.FAILED;
      extraction.errorMessage = err instanceof Error ? err.message : "Unknown error";
      extraction.processingTimeMs = Date.now() - startTime;
      await this.extractionRepo.save(extraction);
      this.logger.error(`Retry of extraction #${extractionId} failed: ${extraction.errorMessage}`);
      throw err;
    } finally {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Temp cleanup is best-effort; OS will reclaim eventually.
      }
    }
  }

  async processDocument(dto: ProcessDocumentDto): Promise<ProcessDocumentResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Processing document: ${dto.documentPath} (${dto.documentName})`);

    const documentType = this.detectDocumentType(dto.documentName || dto.documentPath);
    const { sourceModule, sourceId, extractionProfile } = this.resolveSourceLinkage(dto);

    const extraction = this.extractionRepo.create({
      documentName: dto.documentName || dto.documentPath.split("/").pop() || "unknown",
      documentPath: dto.documentPath,
      documentType,
      status: ExtractionStatus.PROCESSING,
      userId: dto.userId,
      rfqId: dto.rfqId,
      sourceModule,
      sourceId,
      extractionProfile,
      documentRole: dto.documentRole,
      sessionId: dto.sessionId,
    });

    await this.extractionRepo.save(extraction);

    // Persist the uploaded file to S3 so the source document survives the
    // request. Best-effort — does not block extraction even if S3 is down.
    if (dto.documentPath) {
      await this.persistToObjectStorage(
        extraction,
        dto.documentPath,
        extraction.documentName,
        sourceModule,
      );
    }

    const profileHandler = extractionProfile
      ? this.profileRegistry.handler(extractionProfile)
      : null;

    // Sibling extractions used by role-aware prompts (e.g. specification
    // prompt cross-references already-extracted drawings) and by
    // post-extract handlers. Prefers session_id when supplied (#253 task B
    // primary path), falls back to (sourceModule, sourceId) for callers
    // that haven't created a session yet. Returns [] when neither is
    // available, so legacy callers stay unchanged.
    const sessionSiblings = await this.findSessionSiblings(
      dto.sessionId,
      sourceModule,
      sourceId,
      extraction.id,
    );

    const profileSystemPrompt = profileHandler?.systemPrompt?.({
      role: dto.documentRole,
      siblings: sessionSiblings,
    });

    try {
      let extractedData: Record<string, any>;
      let extractedItems: Array<any> = [];
      let specificationCells: SpecificationCellData[] = [];

      switch (documentType) {
        case DocumentType.PDF:
          ({ extractedData, extractedItems, specificationCells } = await this.extractFromPdf(
            dto.documentPath,
            dto.documentName,
            dto.productTypes,
            profileSystemPrompt,
            dto.documentRole,
          ));
          break;
        case DocumentType.EXCEL:
          ({ extractedData, extractedItems, specificationCells } = await this.extractFromExcel(
            dto.documentPath,
          ));
          break;
        case DocumentType.WORD:
          ({ extractedData, extractedItems, specificationCells } = await this.extractFromWord(
            dto.documentPath,
            dto.documentName,
            dto.productTypes,
            profileSystemPrompt,
            dto.documentRole,
          ));
          break;
        default:
          throw new Error(`Unsupported document type: ${documentType}`);
      }

      const relevanceFiltered = await this.filterByRelevance(extractedItems, dto.productTypes);
      const relevantItems = this.dropPseudoItemsForSpec(relevanceFiltered, dto.documentRole);
      const specClarifications = await this.generateSpecificationClarifications(
        extraction,
        specificationCells,
        documentType,
      );
      const itemClarifications = await this.generateClarifications(
        extraction,
        relevantItems,
        documentType,
      );
      const clarifications = [...specClarifications, ...itemClarifications];

      extraction.extractedData = extractedData;
      extraction.extractedItems = relevantItems;
      extraction.relevanceScore = this.calculateOverallRelevance(relevantItems);
      extraction.processingTimeMs = Date.now() - startTime;
      extraction.status =
        clarifications.length > 0
          ? ExtractionStatus.NEEDS_CLARIFICATION
          : ExtractionStatus.COMPLETED;

      if (extractionProfile) {
        if (profileHandler) {
          try {
            const profileResult = await profileHandler.postExtract(extraction, {
              documentName: extraction.documentName,
              documentPath: extraction.documentPath,
              documentRole: dto.documentRole,
              extractedItems: relevantItems,
              specificationCells,
              sourceModule,
              sourceId,
              userId: dto.userId,
              productTypes: dto.productTypes,
              sessionSiblings,
            });
            if (profileResult.metadata) {
              extraction.extractedData = {
                ...(extraction.extractedData || {}),
                profileMetadata: profileResult.metadata,
              };
            }
          } catch (handlerError) {
            this.logger.error(
              `Extraction profile "${extractionProfile}" postExtract threw: ${
                handlerError instanceof Error ? handlerError.message : "unknown"
              }`,
            );
          }
        } else {
          this.logger.warn(
            `Extraction profile "${extractionProfile}" requested but no handler registered; skipping post-extract.`,
          );
        }
      }

      await this.extractionRepo.save(extraction);

      const profileMetadata =
        (extraction.extractedData?.profileMetadata as Record<string, unknown> | undefined) ??
        undefined;

      return {
        extractionId: extraction.id,
        status: extraction.status,
        items: relevantItems,
        pendingClarifications: clarifications.map((c) => ({
          id: c.id,
          question: c.question,
          context: c.context || {},
        })),
        ...(profileMetadata ? { profileMetadata } : {}),
      };
    } catch (error) {
      extraction.status = ExtractionStatus.FAILED;
      extraction.errorMessage = error instanceof Error ? error.message : "Unknown error";
      extraction.processingTimeMs = Date.now() - startTime;
      await this.extractionRepo.save(extraction);

      this.logger.error(`Document processing failed: ${extraction.errorMessage}`);

      return {
        extractionId: extraction.id,
        status: extraction.status,
        error: extraction.errorMessage,
      };
    }
  }

  /**
   * Returns sibling extractions used by role-aware system prompts (the
   * specification prompt cross-references already-extracted drawings) and
   * by post-extract handlers. Excludes the current extraction.
   *
   * Lookup order:
   *   1. By session_id when supplied — the post-#253-task-B primary path,
   *      maps directly to the user's quote-pack upload session.
   *   2. By (source_module, source_id) tuple — fallback for callers that
   *      haven't created a session (e.g. one-off RFQ wizard uploads).
   *   3. Empty array when neither linkage is available.
   *
   * Only returns siblings whose extraction has reached a useful state —
   * COMPLETED or NEEDS_CLARIFICATION. In-flight siblings are ignored so
   * the prompt isn't misled by partial data.
   */
  private async findSessionSiblings(
    sessionId: number | undefined,
    sourceModule: string | undefined,
    sourceId: number | undefined,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]> {
    const completedStatuses = [ExtractionStatus.COMPLETED, ExtractionStatus.NEEDS_CLARIFICATION];

    if (sessionId) {
      return this.extractionRepo
        .createQueryBuilder("extraction")
        .where("extraction.session_id = :sessionId", { sessionId })
        .andWhere("extraction.id <> :excludeId", { excludeId: excludeExtractionId })
        .andWhere("extraction.status IN (:...completedStatuses)", { completedStatuses })
        .orderBy("extraction.created_at", "ASC")
        .getMany();
    }

    if (!sourceModule || !sourceId) return [];
    return this.extractionRepo
      .createQueryBuilder("extraction")
      .where("extraction.source_module = :sourceModule", { sourceModule })
      .andWhere("extraction.source_id = :sourceId", { sourceId })
      .andWhere("extraction.id <> :excludeId", { excludeId: excludeExtractionId })
      .andWhere("extraction.status IN (:...completedStatuses)", { completedStatuses })
      .orderBy("extraction.created_at", "ASC")
      .getMany();
  }

  async submitClarification(dto: SubmitClarificationDto): Promise<SubmitClarificationResponseDto> {
    const clarification = await this.clarificationRepo.findOne({
      where: { id: dto.clarificationId },
      relations: ["extraction"],
    });

    if (!clarification) {
      return { success: false };
    }

    clarification.responseType = dto.responseType;
    clarification.responseText = dto.responseText;
    clarification.responseScreenshotPath = dto.screenshotPath;
    clarification.responseDocumentRef = dto.documentRef;
    clarification.status = ClarificationStatus.ANSWERED;
    clarification.answeredAt = new Date();

    await this.clarificationRepo.save(clarification);

    if (dto.allowLearning !== false) {
      await this.learnFromClarification(clarification);
    }

    const remainingCount = await this.clarificationRepo.count({
      where: {
        extractionId: clarification.extractionId,
        status: ClarificationStatus.PENDING,
      },
    });

    if (remainingCount === 0 && clarification.extraction) {
      clarification.extraction.status = ExtractionStatus.COMPLETED;
      await this.extractionRepo.save(clarification.extraction);
    }

    return {
      success: true,
      updatedExtraction: clarification.extraction
        ? {
            extractionId: clarification.extraction.id,
            status: clarification.extraction.status,
            items: clarification.extraction.extractedItems,
          }
        : undefined,
      remainingClarifications: remainingCount,
    };
  }

  async extraction(id: number): Promise<NixExtraction | null> {
    return this.extractionRepo.findOne({
      where: { id },
      relations: ["user", "rfq"],
    });
  }

  async pendingClarifications(extractionId: number): Promise<NixClarification[]> {
    return this.clarificationRepo.find({
      where: {
        extractionId,
        status: ClarificationStatus.PENDING,
      },
      order: { createdAt: "ASC" },
    });
  }

  async userExtractions(userId: number): Promise<NixExtraction[]> {
    return this.extractionRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  private detectDocumentType(path: string): DocumentType {
    const extension = path.split(".").pop()?.toLowerCase();

    const typeMap: Record<string, DocumentType> = {
      pdf: DocumentType.PDF,
      xlsx: DocumentType.EXCEL,
      xls: DocumentType.EXCEL,
      csv: DocumentType.EXCEL,
      doc: DocumentType.WORD,
      docx: DocumentType.WORD,
      dwg: DocumentType.CAD,
      dxf: DocumentType.CAD,
      sldprt: DocumentType.SOLIDWORKS,
      sldasm: DocumentType.SOLIDWORKS,
      png: DocumentType.IMAGE,
      jpg: DocumentType.IMAGE,
      jpeg: DocumentType.IMAGE,
      tiff: DocumentType.IMAGE,
    };

    return typeMap[extension || ""] || DocumentType.UNKNOWN;
  }

  private async extractFromPdf(
    documentPath: string,
    documentName?: string,
    productTypes?: string[],
    systemPrompt?: string,
    documentRole?: DocumentRole,
  ): Promise<{
    extractedData: Record<string, any>;
    extractedItems: Array<any>;
    specificationCells: SpecificationCellData[];
  }> {
    this.logger.log(`PDF extraction starting for: ${documentPath}`);

    const availableProviders = await this.aiExtractor.getAvailableProviders();
    this.logger.log(`Available AI providers: ${availableProviders.join(", ") || "none"}`);

    if (availableProviders.length > 0) {
      try {
        this.logger.log("Attempting AI-powered extraction...");

        const fs = await import("node:fs");
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParseModule = require("pdf-parse");
        const pdfParse = pdfParseModule.default ?? pdfParseModule;
        const dataBuffer = fs.readFileSync(documentPath);
        const pdfData = await pdfParse(dataBuffer);
        const pdfText = pdfData.text || "";
        const pdfInfo = { numPages: pdfData.numpages };

        const aiResult = await this.aiExtractor.extractWithAi(
          pdfText,
          documentName || documentPath.split("/").pop(),
          undefined,
          productTypes,
          systemPrompt,
        );

        this.logger.log(
          `AI extracted ${aiResult.items.length} items using ${aiResult.providerUsed}`,
        );
        this.logger.log(
          `Tokens used: ${aiResult.tokensUsed}, Processing time: ${aiResult.processingTimeMs}ms`,
        );

        // Engineering drawings are typically image-based — pdf-parse returns
        // little to no text and the text-only Gemini call extracts nothing.
        // When we hit that case, retry with the multimodal vision API
        // (chatWithImage with PDF media type) so Gemini reads the rendered
        // pages directly. Text-first stays as the fast path when text is
        // available; vision fallback only triggers when we need it.
        //
        // For specifications role, items=[] is the CORRECT answer (clauses
        // go under specifications, not items) — do NOT trigger vision retry
        // there, it's a 60-90s waste per spec.
        const isImageOnlyPdf = pdfText.trim().length < 200;
        const drawingWithNoItems =
          documentRole === DocumentRole.DRAWING && aiResult.items.length === 0;
        const visionWorthRetrying = isImageOnlyPdf || drawingWithNoItems;
        if (visionWorthRetrying) {
          this.logger.log(
            `Text extraction yielded ${pdfText.trim().length} chars / ${aiResult.items.length} items — retrying via vision (chatWithImage, application/pdf).`,
          );
          const visionResult = await this.extractFromPdfWithVision(
            dataBuffer,
            documentName || documentPath.split("/").pop() || "document.pdf",
            systemPrompt,
          );
          if (visionResult && visionResult.items.length > aiResult.items.length) {
            this.logger.log(
              `Vision extraction won: ${visionResult.items.length} items (vs text's ${aiResult.items.length}).`,
            );
            return {
              extractedData: {
                totalLines: pdfInfo.numPages || 0,
                itemCount: visionResult.items.length,
                clarificationsNeeded: visionResult.items.filter((i) => i.needsClarification).length,
                metadata: visionResult.metadata,
                specifications: visionResult.specifications ?? {},
                specificationCells: visionResult.specificationCells,
                hasText: pdfText.trim().length > 0,
                hasTables: false,
                hasImages: true,
                aiProvider: `${visionResult.providerUsed} (vision)`,
                aiProcessingTimeMs: visionResult.processingTimeMs,
              },
              extractedItems: visionResult.items,
              specificationCells: visionResult.specificationCells,
            };
          }
        }

        const clarificationsNeeded = aiResult.items.filter((i) => i.needsClarification).length;

        return {
          extractedData: {
            totalLines: pdfInfo.numPages || 0,
            itemCount: aiResult.items.length,
            clarificationsNeeded,
            metadata: aiResult.metadata,
            specifications: aiResult.specifications ?? {},
            specificationCells: aiResult.specificationCells,
            hasText: true,
            hasTables: false,
            hasImages: false,
            aiProvider: aiResult.providerUsed,
            tokensUsed: aiResult.tokensUsed,
            aiProcessingTimeMs: aiResult.processingTimeMs,
          },
          extractedItems: aiResult.items,
          specificationCells: aiResult.specificationCells,
        };
      } catch (error) {
        this.logger.warn(
          `AI extraction failed, falling back to pattern matching: ${error.message}`,
        );
      }
    }

    this.logger.log("Using pattern-based extraction (no AI available or AI failed)");
    const result = await this.pdfExtractor.extractFromPdf(documentPath);

    this.logger.log(`Extracted ${result.items.length} items from PDF (pattern-based)`);
    this.logger.log(`Items needing clarification: ${result.clarificationsNeeded}`);
    this.logger.log(`Found ${result.specificationCells.length} specification headers`);

    return {
      extractedData: {
        totalLines: result.totalRows,
        itemCount: result.items.length,
        clarificationsNeeded: result.clarificationsNeeded,
        metadata: result.metadata,
        specificationCells: result.specificationCells,
        hasText: true,
        hasTables: false,
        hasImages: false,
        aiProvider: "none (pattern-based)",
      },
      extractedItems: result.items,
      specificationCells: result.specificationCells,
    };
  }

  /**
   * Parse a JSON extraction response defensively. With responseFormat: 'json'
   * the model SHOULD return a clean JSON document, but vision responses can
   * still get truncated when an item-rich drawing approaches the output cap.
   * If JSON.parse fails we fall back to truncating at the last comma boundary
   * we can trust and re-trying — a partial result with N items beats throwing
   * the whole extraction away.
   */
  private parseExtractionJson(raw: string): Record<string, unknown> | null {
    if (!raw || raw.trim().length === 0) return null;
    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      // truncated response — find the last `}` we can parse to and try
      const lastBrace = cleaned.lastIndexOf("}");
      if (lastBrace > 0) {
        const trimmed = `${cleaned.slice(0, lastBrace + 1)}`;
        try {
          return JSON.parse(trimmed);
        } catch {
          // still bad — try slicing to the last closed item in `items: [...]`
          const itemsClose = cleaned.lastIndexOf("]");
          if (itemsClose > 0) {
            const itemsOnly = `${cleaned.slice(0, itemsClose + 1)}}`;
            try {
              return JSON.parse(itemsOnly);
            } catch {
              return null;
            }
          }
          return null;
        }
      }
      return null;
    }
  }

  /**
   * Vision-based PDF extraction. Sends the raw PDF to Gemini's multimodal
   * API (chatWithImage with media_type "application/pdf") so it OCRs the
   * rendered pages directly — needed for image-based engineering drawings
   * where pdf-parse returns nothing useful. Returns null if the response
   * can't be parsed as JSON in the expected shape.
   */
  private async extractFromPdfWithVision(
    pdfBuffer: Buffer,
    documentName: string,
    profileSystemPrompt?: string,
  ): Promise<{
    items: ExtractedItem[];
    specifications: Record<string, unknown>;
    specificationCells: SpecificationCellData[];
    metadata: Record<string, unknown>;
    providerUsed: string;
    processingTimeMs: number;
  } | null> {
    const start = Date.now();
    const base64 = pdfBuffer.toString("base64");
    const userPrompt = `Document: ${documentName}\n\nExtract every quotable line item AND every cross-cutting specification clause you can see, following the JSON shape in the system prompt. Read the PDF visually — title blocks, dimensioned drawings, BOM tables, handwritten markups all count.`;
    const systemPrompt = profileSystemPrompt ?? DEFAULT_EXTRACTION_SYSTEM_PROMPT;

    try {
      const result = await this.aiChatService.chatWithImage(
        base64,
        "application/pdf",
        userPrompt,
        systemPrompt,
        { temperature: 0.1, maxOutputTokens: 32_768, responseFormat: "json" },
      );
      const parsed = this.parseExtractionJson(result.content);
      if (!parsed) {
        this.logger.warn(
          `Vision extraction returned no parseable JSON for ${documentName}; raw length=${result.content.length}`,
        );
        return null;
      }
      const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
      if (rawItems.length > 0) {
        const sample = rawItems[0];
        const sampleKeys = Object.keys(sample as Record<string, unknown>);
        this.logger.log(
          `Vision extraction sample item keys: [${sampleKeys.join(", ")}]; first item: ${JSON.stringify(sample).slice(0, 400)}`,
        );
      }
      const items: ExtractedItem[] = rawItems.map((item: Record<string, unknown>) =>
        this.normaliseVisionItem(item),
      );
      // 'specifications' may be an object keyed by clause code (the canonical
      // shape since #253 prompt rewrite) OR an array of cells from older
      // pipeline runs. Handle both so the dict goes to specifications and
      // the array goes to specificationCells.
      const rawSpecs = parsed.specifications;
      const specifications: Record<string, unknown> =
        rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)
          ? (rawSpecs as Record<string, unknown>)
          : {};
      const specificationCells: SpecificationCellData[] = Array.isArray(rawSpecs)
        ? (rawSpecs as SpecificationCellData[])
        : [];
      return {
        items,
        specifications,
        specificationCells,
        metadata: (parsed.metadata as Record<string, unknown>) ?? {},
        providerUsed: result.providerUsed,
        processingTimeMs: Date.now() - start,
      };
    } catch (err) {
      this.logger.error(
        `Vision extraction threw for ${documentName}: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
      return null;
    }
  }

  /**
   * Drops "items" from a specification-role extraction when they don't look
   * like real Bill of Materials rows. Specifications hold clause-level facts
   * under 'specifications', not 'items' — so we only keep an entry under
   * items if it shows positive evidence of being a quotable BOM row.
   *
   * "Real BOM row" requires AT LEAST ONE of:
   * - quantity > 1 (a clause heading is rarely "qty: 5")
   * - a numeric diameter (NB)
   * - a numeric length
   * - a recognised piping itemType (pipe / bend / reducer / tee / flange /
   *   expansion_joint / tank_chute)
   *
   * Everything else — clause titles, paragraph fragments, regex-extracted
   * spec-doc snippets from the Word path — is dropped. If the document
   * legitimately has nothing item-like, items=[] is the correct outcome and
   * the cross-linker still resolves the spec's clauses against the drawing
   * extractions. Drawings and other-role documents are unaffected.
   */
  private dropPseudoItemsForSpec<T extends Record<string, unknown>>(
    items: T[],
    role: DocumentRole | undefined,
  ): T[] {
    if (role !== DocumentRole.SPECIFICATION) return items;
    const realItemTypes = new Set([
      "pipe",
      "bend",
      "reducer",
      "tee",
      "flange",
      "expansion_joint",
      "tank_chute",
    ]);
    const kept = items.filter((item) => {
      const itemType = typeof item.itemType === "string" ? (item.itemType as string) : "";
      const qty = typeof item.quantity === "number" ? (item.quantity as number) : 1;
      const hasDimension =
        item.diameter !== null && item.diameter !== undefined && item.diameter !== "";
      const hasLength = item.length !== null && item.length !== undefined && item.length !== "";
      const looksLikeRealBomRow =
        qty > 1 || hasDimension || hasLength || realItemTypes.has(itemType);
      return looksLikeRealBomRow;
    });
    if (kept.length < items.length) {
      this.logger.log(
        `Dropped ${items.length - kept.length} pseudo-items from a specification document (kept ${kept.length})`,
      );
    }
    return kept;
  }

  /**
   * Coerces a Gemini-vision-returned item into our internal ExtractedItem
   * shape. Vision responses are looser than the strictly-structured text
   * extraction path, so we apply lenient mapping with sensible defaults
   * rather than throwing on schema drift.
   */
  private normaliseVisionItem(item: Record<string, unknown>): ExtractedItem {
    // Gemini occasionally nests dimensions, lining, and other groups despite
    // the system prompt asking for a flat schema. Flatten one level so the
    // multi-key lookup below sees them whether top-level or nested.
    const flat: Record<string, unknown> = { ...item };
    const dims = item.dimensions;
    if (dims && typeof dims === "object" && !Array.isArray(dims)) {
      Object.assign(flat, dims as Record<string, unknown>);
    }
    const lining = item.internal_lining ?? item.internalLining ?? item.lining;
    if (lining && typeof lining === "object" && !Array.isArray(lining)) {
      const liningObj = lining as Record<string, unknown>;
      if (liningObj.material && !flat.liningType) flat.liningType = liningObj.material;
      if (liningObj.thicknessMm && !flat.liningThicknessMm)
        flat.liningThicknessMm = liningObj.thicknessMm;
    }
    const drawingRef = item.drawing_reference ?? item.drawingReference;
    if (drawingRef && typeof drawingRef === "object" && !Array.isArray(drawingRef)) {
      const refObj = drawingRef as Record<string, unknown>;
      const parts = [refObj.number, refObj.mto, refObj.sheet]
        .filter((v) => typeof v === "string" && v.length > 0)
        .join(" ");
      if (parts.length > 0) flat.drawingReference = parts;
    }

    const numFrom = (...keys: string[]): number | null => {
      for (const k of keys) {
        const v = flat[k];
        if (typeof v === "number") return v;
        if (typeof v === "string" && v.trim().length > 0) {
          const parsed = Number.parseFloat(v);
          if (Number.isFinite(parsed)) return parsed;
        }
      }
      return null;
    };
    const strFrom = (...keys: string[]): string | null => {
      for (const k of keys) {
        const v = flat[k];
        if (typeof v === "string" && v.trim().length > 0) return v;
      }
      return null;
    };
    const description = strFrom("description", "desc", "itemDescription") ?? "";
    const liningType = strFrom("liningType", "lining", "internal_lining", "internalLining");
    const coatingSystem = strFrom(
      "coatingSystem",
      "paintSystem",
      "external_paint_system_ref",
      "external_paint_system_reference",
      "externalPaintSystemRef",
      "externalPaintSystem",
      "external_paint_system",
    );
    const materialClass = strFrom(
      "materialClass",
      "material_class_ref",
      "material_class_reference",
      "materialClassRef",
      "material_class",
    );
    return {
      rowNumber: numFrom("rowNumber") ?? 0,
      itemNumber:
        strFrom(
          "itemNumber",
          "mark",
          "markNumber",
          "mark_number",
          "itemNo",
          "itemMark",
          "spoolNumber",
          "spool_number",
          "no",
        ) ?? null,
      description,
      itemType: (strFrom("itemType", "type") as ExtractedItem["itemType"]) ?? "unknown",
      material: strFrom("material"),
      materialGrade: strFrom("materialGrade", "grade"),
      diameter: numFrom(
        "diameter",
        "nb",
        "NB",
        "NB_mm",
        "nb_mm",
        "nominalBore",
        "nominal_bore_mm",
        "bore",
      ),
      diameterUnit: (strFrom("diameterUnit") as ExtractedItem["diameterUnit"]) ?? "mm",
      secondaryDiameter: numFrom("secondaryDiameter"),
      length: numFrom("length", "lengthMm", "length_mm", "L", "overallLengthMm"),
      wallThickness: numFrom("wallThickness", "wt", "WT", "WT_mm", "wt_mm", "wall_thickness_mm"),
      schedule: strFrom("schedule"),
      angle: numFrom("angle"),
      flangeConfig:
        (strFrom("flangeConfig", "endConfiguration", "end_configuration", "ends") as
          | ExtractedItem["flangeConfig"]
          | undefined) ?? null,
      quantity: numFrom("quantity", "qty", "count") ?? 1,
      unit: strFrom("unit") ?? "ea",
      confidence: numFrom("confidence") ?? 0.7,
      needsClarification: false,
      clarificationReason: null,
      rawData: item as Record<string, unknown>,
      ...(liningType ? { liningType } : {}),
      ...(coatingSystem ? { coatingSystem } : {}),
      ...(materialClass ? { materialClass } : {}),
    } as ExtractedItem;
  }

  private async extractFromExcel(documentPath: string): Promise<{
    extractedData: Record<string, any>;
    extractedItems: Array<any>;
    specificationCells: SpecificationCellData[];
  }> {
    this.logger.log(`Excel extraction starting for: ${documentPath}`);

    const result = await this.excelExtractor.extractFromExcel(documentPath);

    this.logger.log(`Extracted ${result.items.length} items from sheet "${result.sheetName}"`);
    this.logger.log(`Items needing clarification: ${result.clarificationsNeeded}`);
    this.logger.log(`Found ${result.specificationCells.length} specification headers`);

    return {
      extractedData: {
        sheetName: result.sheetName,
        totalRows: result.totalRows,
        itemCount: result.items.length,
        clarificationsNeeded: result.clarificationsNeeded,
        metadata: result.metadata,
        specificationCells: result.specificationCells,
      },
      extractedItems: result.items,
      specificationCells: result.specificationCells,
    };
  }

  /**
   * Word document extraction. Mammoth pulls plain text out of the .docx,
   * then we route the same way as the PDF text path: Gemini extraction
   * with the role-aware system prompt, returning items + the structured
   * specifications dict the draft UI cross-links to drawing items.
   *
   * Falls back to the regex-based WordExtractorService if Gemini fails
   * or no AI provider is configured — better to surface the legacy
   * pseudo-items than nothing.
   */
  private async extractFromWord(
    documentPath: string,
    documentName?: string,
    productTypes?: string[],
    systemPrompt?: string,
    documentRole?: DocumentRole,
  ): Promise<{
    extractedData: Record<string, any>;
    extractedItems: Array<any>;
    specificationCells: SpecificationCellData[];
  }> {
    this.logger.log(`Word extraction starting for: ${documentPath}`);

    const wordResult = await this.wordExtractor.extractFromWord(documentPath);
    const rawText = wordResult.rawText ?? "";

    const availableProviders = await this.aiExtractor.getAvailableProviders();
    if (availableProviders.length === 0 || rawText.trim().length === 0) {
      this.logger.log(
        `Falling back to regex word extraction (providers=${availableProviders.length}, textLength=${rawText.length})`,
      );
      return {
        extractedData: {
          sheetName: wordResult.sheetName,
          totalRows: wordResult.totalRows,
          itemCount: wordResult.items.length,
          clarificationsNeeded: wordResult.clarificationsNeeded,
          metadata: wordResult.metadata,
          specifications: {},
          specificationCells: wordResult.specificationCells,
        },
        extractedItems: wordResult.items,
        specificationCells: wordResult.specificationCells,
      };
    }

    try {
      const aiResult = await this.aiExtractor.extractWithAi(
        rawText,
        documentName ?? documentPath.split(/[/\\]/).pop(),
        undefined,
        productTypes,
        systemPrompt,
      );
      this.logger.log(
        `Word AI extraction returned ${aiResult.items.length} items, ${
          Object.keys(aiResult.specifications ?? {}).length
        } specification clauses (provider=${aiResult.providerUsed})`,
      );
      return {
        extractedData: {
          sheetName: wordResult.sheetName,
          totalRows: wordResult.totalRows,
          itemCount: aiResult.items.length,
          clarificationsNeeded: aiResult.items.filter((i) => i.needsClarification).length,
          metadata: { ...wordResult.metadata, ...aiResult.metadata },
          specifications: aiResult.specifications ?? {},
          specificationCells: aiResult.specificationCells,
          aiProvider: aiResult.providerUsed,
          tokensUsed: aiResult.tokensUsed,
          aiProcessingTimeMs: aiResult.processingTimeMs,
          documentRole,
        },
        extractedItems: aiResult.items,
        specificationCells: aiResult.specificationCells,
      };
    } catch (err) {
      this.logger.warn(
        `Word AI extraction failed, falling back to regex extractor: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
      return {
        extractedData: {
          sheetName: wordResult.sheetName,
          totalRows: wordResult.totalRows,
          itemCount: wordResult.items.length,
          clarificationsNeeded: wordResult.clarificationsNeeded,
          metadata: wordResult.metadata,
          specifications: {},
          specificationCells: wordResult.specificationCells,
        },
        extractedItems: wordResult.items,
        specificationCells: wordResult.specificationCells,
      };
    }
  }

  private async filterByRelevance(
    items: Array<any>,
    _productTypes?: string[],
  ): Promise<Array<any>> {
    const learningRules = await this.learningRepo.find({
      where: {
        learningType: LearningType.RELEVANCE_RULE,
        isActive: true,
      },
    });

    return items.map((item) => ({
      ...item,
      confidence: this.calculateItemConfidence(item, learningRules),
    }));
  }

  private calculateItemConfidence(item: any, rules: NixLearning[]): number {
    let confidence = 0.5;

    rules.forEach((rule) => {
      if (item.description?.toLowerCase().includes(rule.patternKey.toLowerCase())) {
        confidence = Math.min(1, confidence + 0.1 * rule.confidence);
      }
    });

    return confidence;
  }

  private calculateOverallRelevance(items: Array<any>): number {
    if (items.length === 0) return 0;

    const totalConfidence = items.reduce((sum, item) => sum + (item.confidence || 0.5), 0);
    return totalConfidence / items.length;
  }

  private async generateClarifications(
    extraction: NixExtraction,
    items: Array<any>,
    documentType: DocumentType,
  ): Promise<NixClarification[]> {
    const clarifications: NixClarification[] = [];
    const isPdf = documentType === DocumentType.PDF;
    const itemRef = (num: number) => (isPdf ? `Item ${num}` : `Row ${num}`);

    const itemsNeedingClarification = items.filter((item: ExtractedItem) => {
      if (!item.needsClarification && item.material && item.diameter) {
        this.logger.debug(
          `${itemRef(item.rowNumber)}: Skipping clarification - has material (${item.material}) and diameter (${item.diameter}mm)`,
        );
        return false;
      }
      return item.needsClarification;
    });

    for (const item of itemsNeedingClarification.slice(0, 10)) {
      const extractedItem = item as ExtractedItem;

      let question = "";
      let clarificationType = ClarificationType.AMBIGUOUS;

      if (!extractedItem.material) {
        question = `${itemRef(extractedItem.rowNumber)}: I couldn't determine the material type for this item.\n\nDescription: "${extractedItem.description}"\n\nIs this Stainless Steel (SS) or Mild Steel (MS)?`;
        clarificationType = ClarificationType.MISSING_INFO;
      } else if (!extractedItem.diameter) {
        question = `${itemRef(extractedItem.rowNumber)}: I couldn't determine the pipe diameter.\n\nDescription: "${extractedItem.description}"\n\nWhat is the diameter in mm?`;
        clarificationType = ClarificationType.MISSING_INFO;
      } else if (extractedItem.clarificationReason) {
        question = `${itemRef(extractedItem.rowNumber)}: ${extractedItem.clarificationReason}\n\nDescription: "${extractedItem.description}"\n\nPlease provide the missing information or correct any errors.`;
        clarificationType = ClarificationType.MISSING_INFO;
      } else {
        this.logger.debug(`${itemRef(extractedItem.rowNumber)}: Skipping - no actual missing info`);
        continue;
      }

      const clarification = this.clarificationRepo.create({
        extractionId: extraction.id,
        userId: extraction.userId,
        clarificationType,
        status: ClarificationStatus.PENDING,
        question,
        context: {
          rowNumber: extractedItem.rowNumber,
          itemNumber: extractedItem.itemNumber,
          itemDescription: extractedItem.description,
          itemType: extractedItem.itemType,
          extractedMaterial: extractedItem.material,
          extractedDiameter: extractedItem.diameter,
          extractedLength: extractedItem.length,
          extractedAngle: extractedItem.angle,
          extractedFlangeConfig: extractedItem.flangeConfig,
          extractedQuantity: extractedItem.quantity,
          confidence: extractedItem.confidence,
          clarificationReason: extractedItem.clarificationReason,
        },
      });

      clarifications.push(await this.clarificationRepo.save(clarification));
    }

    return clarifications;
  }

  private async generateSpecificationClarifications(
    extraction: NixExtraction,
    specCells: SpecificationCellData[],
    documentType: DocumentType,
  ): Promise<NixClarification[]> {
    const clarifications: NixClarification[] = [];

    for (const specCell of specCells) {
      const parsed = specCell.parsedData;
      const missingFields: string[] = [];

      if (!parsed.materialGrade) missingFields.push("material grade");
      if (!parsed.wallThickness) missingFields.push("wall thickness");
      if (!parsed.lining) missingFields.push("internal lining");
      if (!parsed.externalCoating) missingFields.push("external coating");
      if (!parsed.standard) missingFields.push("standard (e.g., API 5L, SABS)");

      if (missingFields.length > 0) {
        const extractedInfo: string[] = [];
        if (parsed.materialGrade) extractedInfo.push(`Material Grade: ${parsed.materialGrade}`);
        if (parsed.wallThickness) extractedInfo.push(`Wall Thickness: ${parsed.wallThickness}`);
        if (parsed.lining) extractedInfo.push(`Lining: ${parsed.lining}`);
        if (parsed.externalCoating)
          extractedInfo.push(`External Coating: ${parsed.externalCoating}`);
        if (parsed.standard) extractedInfo.push(`Standard: ${parsed.standard}`);
        if (parsed.schedule) extractedInfo.push(`Schedule: ${parsed.schedule}`);

        const question = `📋 SPECIFICATION HEADER (${specCell.cellRef}):\n\n"${specCell.rawText.substring(0, 200)}${specCell.rawText.length > 200 ? "..." : ""}"\n\n${extractedInfo.length > 0 ? `I extracted:\n${extractedInfo.map((i) => `• ${i}`).join("\n")}\n\n` : ""}I could not determine the following from this specification:\n${missingFields.map((f) => `• ${f}`).join("\n")}\n\nPlease provide the missing specification details.`;

        const clarification = this.clarificationRepo.create({
          extractionId: extraction.id,
          userId: extraction.userId,
          clarificationType: ClarificationType.MISSING_INFO,
          status: ClarificationStatus.PENDING,
          question,
          context: {
            isSpecificationHeader: true,
            cellRef: specCell.cellRef,
            rowNumber: specCell.rowNumber,
            rawText: specCell.rawText,
            parsedMaterialGrade: parsed.materialGrade,
            parsedWallThickness: parsed.wallThickness,
            parsedLining: parsed.lining,
            parsedExternalCoating: parsed.externalCoating,
            parsedStandard: parsed.standard,
            parsedSchedule: parsed.schedule,
            missingFields,
          },
        });

        clarifications.push(await this.clarificationRepo.save(clarification));
        this.logger.log(
          `Generated specification clarification for ${specCell.cellRef} - missing: ${missingFields.join(", ")}`,
        );
      } else {
        this.logger.log(
          `Specification at ${specCell.cellRef} fully parsed - no clarification needed`,
        );
      }
    }

    return clarifications;
  }

  private async learnFromClarification(clarification: NixClarification): Promise<void> {
    if (!clarification.responseText || !clarification.context?.itemDescription) {
      return;
    }

    const existingRule = await this.learningRepo.findOne({
      where: {
        patternKey: clarification.context.itemDescription,
        learningType: LearningType.CORRECTION,
      },
    });

    if (existingRule) {
      existingRule.learnedValue = clarification.responseText;
      existingRule.confirmationCount += 1;
      existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      await this.learningRepo.save(existingRule);
    } else {
      const newRule = this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: LearningSource.USER_CORRECTION,
        patternKey: clarification.context.itemDescription,
        originalValue: clarification.context.extractedValue,
        learnedValue: clarification.responseText,
        confidence: 0.6,
        confirmationCount: 1,
      });
      await this.learningRepo.save(newRule);
    }

    clarification.usedForLearning = true;
    await this.clarificationRepo.save(clarification);
  }

  async seedAdminRule(
    category: string,
    patternKey: string,
    learnedValue: string,
    applicableProducts?: string[],
  ): Promise<NixLearning> {
    const rule = this.learningRepo.create({
      learningType: LearningType.RELEVANCE_RULE,
      source: LearningSource.ADMIN_SEEDED,
      category,
      patternKey,
      learnedValue,
      applicableProducts,
      confidence: 0.9,
      confirmationCount: 1,
      isActive: true,
    });

    return this.learningRepo.save(rule);
  }

  async adminLearningRules(): Promise<NixLearning[]> {
    return this.learningRepo.find({
      where: { source: LearningSource.ADMIN_SEEDED },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Updates a single field on a single item inside an extraction's
   * extractedItems array, persisted in place. When the value actually
   * changes, also feeds the diff into the Nix learning system via
   * recordCorrection — so identical drawings that get re-extracted in
   * future runs benefit from the user's correction without us needing
   * to keep tightening the prompt.
   *
   * Identifies the row by item.itemNumber when present (preferred —
   * survives re-ordering), falling back to the array index. Empty-string
   * values are normalised to null so the user can clear coatingSystem
   * etc. with an empty input.
   */
  async patchExtractionItem(
    extractionId: number,
    rowKey: { itemNumber?: string; index?: number },
    field: string,
    rawValue: string | number | boolean | null,
  ): Promise<NixExtraction> {
    const extraction = await this.extractionRepo.findOne({ where: { id: extractionId } });
    if (!extraction) {
      throw new Error("Extraction not found");
    }
    const items = (extraction.extractedItems ?? []) as Array<Record<string, unknown>>;
    let targetIndex = -1;
    if (rowKey.itemNumber) {
      targetIndex = items.findIndex((it) => it.itemNumber === rowKey.itemNumber);
    }
    if (targetIndex < 0 && typeof rowKey.index === "number") {
      targetIndex = rowKey.index;
    }
    if (targetIndex < 0 || targetIndex >= items.length) {
      throw new Error(
        `Item not found in extraction #${extractionId} (itemNumber=${rowKey.itemNumber ?? "n/a"}, index=${rowKey.index ?? "n/a"})`,
      );
    }
    const target = items[targetIndex];
    const oldValue = target[field] ?? null;
    const normalisedValue =
      typeof rawValue === "string" && rawValue.trim().length === 0 ? null : rawValue;

    const updatedItems = items.map((it, idx) =>
      idx === targetIndex ? { ...it, [field]: normalisedValue } : it,
    );
    // The strict type on extractedItems is from the Excel pipeline shape,
    // but in practice it stores any JSON the AI returns — we cast to keep
    // the heterogeneous map-of-fields shape that drawings/specs produce.
    extraction.extractedItems = updatedItems as unknown as NixExtraction["extractedItems"];
    await this.extractionRepo.save(extraction);

    const oldString = oldValue == null ? null : String(oldValue);
    const newString = normalisedValue == null ? null : String(normalisedValue);
    if (oldString !== newString) {
      const description = (target.description as string | undefined) ?? "";
      const itemNumber = (target.itemNumber as string | undefined) ?? "";
      const itemDescription =
        description.length > 0
          ? description
          : itemNumber.length > 0
            ? `mark ${itemNumber}`
            : `extraction ${extractionId} item ${targetIndex}`;
      try {
        await this.recordCorrection({
          extractionId,
          itemDescription,
          fieldName: field,
          originalValue: oldString,
          correctedValue: newString ?? "",
          userId: extraction.userId,
        });
      } catch (err) {
        this.logger.error(
          `Failed to record learning correction for #${extractionId} ${field}: ${
            err instanceof Error ? err.message : "unknown"
          }`,
        );
      }
    }

    return extraction;
  }

  async recordCorrection(correction: {
    extractionId?: number;
    itemDescription: string;
    fieldName: string;
    originalValue: string | number | null;
    correctedValue: string | number;
    userId?: number;
  }): Promise<{ success: boolean }> {
    const patternKey = `${correction.itemDescription}::${correction.fieldName}`;

    const existingRule = await this.learningRepo.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
      },
    });

    if (existingRule) {
      if (existingRule.learnedValue === String(correction.correctedValue)) {
        existingRule.confirmationCount += 1;
        existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      } else {
        existingRule.learnedValue = String(correction.correctedValue);
        existingRule.originalValue =
          correction.originalValue != null ? String(correction.originalValue) : undefined;
        existingRule.confirmationCount = 1;
        existingRule.confidence = 0.6;
      }
      await this.learningRepo.save(existingRule);
      this.logger.log(`Updated learning rule for pattern: ${patternKey}`);
    } else {
      const newRule = this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: LearningSource.USER_CORRECTION,
        patternKey,
        category: correction.fieldName,
        originalValue:
          correction.originalValue != null ? String(correction.originalValue) : undefined,
        learnedValue: String(correction.correctedValue),
        confidence: 0.6,
        confirmationCount: 1,
        isActive: true,
      });
      await this.learningRepo.save(newRule);
      this.logger.log(`Created new learning rule for pattern: ${patternKey}`);
    }

    return { success: true };
  }

  async processAndSaveToSecureDocuments(
    file: Express.Multer.File,
    userId: number,
    customTitle?: string,
    customDescription?: string,
  ): Promise<{
    success: boolean;
    documentId?: string;
    documentSlug?: string;
    message?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const fileName = file.originalname;
    const filePath = file.path;

    this.logger.log(`Processing document for Secure Documents: ${fileName}`);

    try {
      const documentType = this.detectDocumentType(fileName);
      let extractedContent: string;
      let metadata: Record<string, unknown> = {};

      if (documentType === DocumentType.PDF) {
        const result = await this.pdfExtractor.extractFromPdf(filePath);
        extractedContent = this.formatPdfExtractionAsMarkdown(fileName, result);
        metadata = result.metadata || {};
      } else if (documentType === DocumentType.EXCEL) {
        const result = await this.excelExtractor.extractFromExcel(filePath);
        extractedContent = this.formatExcelExtractionAsMarkdown(fileName, result);
        metadata = result.metadata || {};
      } else if (documentType === DocumentType.WORD) {
        const result = await this.wordExtractor.extractFromWord(filePath);
        extractedContent = this.formatWordExtractionAsMarkdown(fileName, result);
        metadata = result.metadata || {};
      } else {
        const content = fs.readFileSync(filePath, "utf-8");
        extractedContent = this.formatTextAsMarkdown(fileName, content);
      }

      const title = customTitle || fileName.replace(/\.[^.]+$/, "");
      const description = customDescription || this.generateDescription(metadata, extractedContent);

      const document = await this.secureDocumentsService.create(
        {
          title,
          description,
          content: extractedContent,
          folder: "Nix",
        },
        userId,
      );

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(`Document saved to Secure Documents: ${document.id} (${processingTimeMs}ms)`);

      this.cleanupUploadedFile(filePath);

      return {
        success: true,
        documentId: document.id,
        documentSlug: document.slug,
        message: `Document processed and saved successfully in ${processingTimeMs}ms`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      this.cleanupUploadedFile(filePath);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async listNixSecureDocuments(): Promise<{
    documents: Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    const allDocuments = await this.secureDocumentsService.findAll();
    const nixDocuments = allDocuments
      .filter((doc) => doc.folder === "Nix")
      .map((doc) => ({
        id: doc.id,
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }));

    return { documents: nixDocuments };
  }

  async uploadRawToSecureDocuments(
    file: Express.Multer.File,
    userId: number,
    customTitle?: string,
    customDescription?: string,
  ): Promise<{
    success: boolean;
    documentId?: string;
    documentSlug?: string;
    message?: string;
    error?: string;
  }> {
    const startTime = Date.now();
    const fileName = file.originalname;
    const filePath = file.path;

    this.logger.log(`Uploading raw document to S3: ${fileName}`);

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const multerFile: Express.Multer.File = {
        ...file,
        buffer: fileBuffer,
      };

      const storageResult = await this.s3StorageService.upload(
        multerFile,
        documentPath(StorageArea.SECURE_DOCUMENTS, "attachments"),
      );

      const title = customTitle || fileName.replace(/\.[^.]+$/, "");
      const description = customDescription || `Uploaded file: ${fileName}`;
      const ext = fileName.split(".").pop()?.toLowerCase() || "other";

      const fileTypeMap: Record<string, string> = {
        pdf: "pdf",
        xlsx: "excel",
        xls: "excel",
        csv: "excel",
        doc: "word",
        docx: "word",
      };
      const fileType = fileTypeMap[ext] || "other";

      const content = [
        `# ${title}`,
        "",
        `> Uploaded on ${new Date().toISOString()}`,
        "",
        "## File Information",
        "",
        `- **Original filename:** ${fileName}`,
        `- **File type:** ${ext.toUpperCase()}`,
        `- **Size:** ${this.formatFileSize(storageResult.size)}`,
        `- **MIME type:** ${storageResult.mimeType}`,
        "",
        "*This is an attachment. Use the download button to get the original file, or view the preview above.*",
      ].join("\n");

      const document = await this.secureDocumentsService.create(
        {
          title,
          description,
          content,
          folder: "Attachments",
          fileType,
          originalFilename: fileName,
          attachmentPath: storageResult.path,
        },
        userId,
      );

      const processingTimeMs = Date.now() - startTime;
      this.logger.log(`Raw document uploaded: ${document.id} (${processingTimeMs}ms)`);

      this.cleanupUploadedFile(filePath);

      return {
        success: true,
        documentId: document.id,
        documentSlug: document.slug,
        message: `File uploaded successfully in ${processingTimeMs}ms`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload raw document: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      this.cleanupUploadedFile(filePath);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private formatPdfExtractionAsMarkdown(fileName: string, result: ExtractionResult): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
    ];

    if (result.metadata) {
      lines.push("## Document Metadata", "");
      const meta = result.metadata;
      if (meta.projectName) lines.push(`- **Project Name:** ${meta.projectName}`);
      if (meta.projectReference) lines.push(`- **Project Reference:** ${meta.projectReference}`);
      if (meta.projectLocation) lines.push(`- **Location:** ${meta.projectLocation}`);
      if (meta.standard) lines.push(`- **Standard:** ${meta.standard}`);
      if (meta.materialGrade) lines.push(`- **Material Grade:** ${meta.materialGrade}`);
      if (meta.coating) lines.push(`- **Coating:** ${meta.coating}`);
      if (meta.lining) lines.push(`- **Lining:** ${meta.lining}`);
      lines.push("");
    }

    if (result.items && result.items.length > 0) {
      lines.push("## Extracted Items", "");
      lines.push("| # | Description | Type | Size | Material | Qty |");
      lines.push("|---|-------------|------|------|----------|-----|");

      result.items.forEach((item, index) => {
        const description = item.description || "-";
        const type = item.itemType || "-";
        const size = item.diameter
          ? `${item.diameter}${item.diameterUnit === "mm" ? "mm" : '"'}`
          : "-";
        const material = item.materialGrade || item.material || "-";
        const qty = item.quantity || "-";
        lines.push(
          `| ${index + 1} | ${description.substring(0, 50)} | ${type} | ${size} | ${material} | ${qty} |`,
        );
      });
      lines.push("");
    }

    if (result.specificationCells && result.specificationCells.length > 0) {
      lines.push("## Specification Data", "");
      result.specificationCells.forEach((spec) => {
        lines.push(`### ${spec.rawText || "Specification"}`);
        if (spec.parsedData) {
          const parsed = spec.parsedData;
          if (parsed.materialGrade) lines.push(`- **Material Grade:** ${parsed.materialGrade}`);
          if (parsed.wallThickness) lines.push(`- **Wall Thickness:** ${parsed.wallThickness}`);
          if (parsed.lining) lines.push(`- **Lining:** ${parsed.lining}`);
          if (parsed.externalCoating) lines.push(`- **Coating:** ${parsed.externalCoating}`);
          if (parsed.standard) lines.push(`- **Standard:** ${parsed.standard}`);
          if (parsed.schedule) lines.push(`- **Schedule:** ${parsed.schedule}`);
        }
        lines.push("");
      });
    }

    lines.push("---", "");
    lines.push(`*Source file: ${fileName}*`);
    lines.push(`*Total rows processed: ${result.totalRows}*`);
    lines.push(`*Items extracted: ${result.items?.length || 0}*`);

    return lines.join("\n");
  }

  private formatExcelExtractionAsMarkdown(fileName: string, result: ExtractionResult): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
      `**Sheet:** ${result.sheetName || "Unknown"}`,
      "",
    ];

    if (result.metadata) {
      lines.push("## Document Metadata", "");
      const meta = result.metadata;
      if (meta.projectName) lines.push(`- **Project Name:** ${meta.projectName}`);
      if (meta.projectReference) lines.push(`- **Project Reference:** ${meta.projectReference}`);
      if (meta.projectLocation) lines.push(`- **Location:** ${meta.projectLocation}`);
      if (meta.standard) lines.push(`- **Standard:** ${meta.standard}`);
      if (meta.materialGrade) lines.push(`- **Material Grade:** ${meta.materialGrade}`);
      lines.push("");
    }

    if (result.items && result.items.length > 0) {
      lines.push("## Extracted Items", "");
      lines.push("| # | Description | Type | Size | Material | Qty |");
      lines.push("|---|-------------|------|------|----------|-----|");

      result.items.forEach((item, index) => {
        const description = item.description || "-";
        const type = item.itemType || "-";
        const size = item.diameter
          ? `${item.diameter}${item.diameterUnit === "mm" ? "mm" : '"'}`
          : "-";
        const material = item.materialGrade || item.material || "-";
        const qty = item.quantity || "-";
        lines.push(
          `| ${index + 1} | ${description.substring(0, 50)} | ${type} | ${size} | ${material} | ${qty} |`,
        );
      });
      lines.push("");
    }

    lines.push("---", "");
    lines.push(`*Source file: ${fileName}*`);
    lines.push(`*Total rows processed: ${result.totalRows}*`);
    lines.push(`*Items extracted: ${result.items?.length || 0}*`);

    return lines.join("\n");
  }

  private formatWordExtractionAsMarkdown(
    fileName: string,
    result: ExtractionResult & { rawText?: string },
  ): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
    ];

    if (result.metadata) {
      lines.push("## Document Metadata", "");
      const meta = result.metadata;
      if (meta.projectName) lines.push(`- **Project Name:** ${meta.projectName}`);
      if (meta.projectReference) lines.push(`- **Project Reference:** ${meta.projectReference}`);
      if (meta.projectLocation) lines.push(`- **Location:** ${meta.projectLocation}`);
      if (meta.standard) lines.push(`- **Standard:** ${meta.standard}`);
      if (meta.materialGrade) lines.push(`- **Material Grade:** ${meta.materialGrade}`);
      lines.push("");
    }

    if (result.items && result.items.length > 0) {
      lines.push("## Extracted Items", "");
      lines.push("| # | Description | Type | Size | Material | Qty |");
      lines.push("|---|-------------|------|------|----------|-----|");

      result.items.forEach((item, index) => {
        const description = item.description || "-";
        const type = item.itemType || "-";
        const size = item.diameter
          ? `${item.diameter}${item.diameterUnit === "mm" ? "mm" : '"'}`
          : "-";
        const material = item.materialGrade || item.material || "-";
        const qty = item.quantity || "-";
        lines.push(
          `| ${index + 1} | ${description.substring(0, 50)} | ${type} | ${size} | ${material} | ${qty} |`,
        );
      });
      lines.push("");
    }

    if (result.rawText) {
      lines.push("## Document Content", "");
      lines.push(result.rawText);
      lines.push("");
    }

    lines.push("---", "");
    lines.push(`*Source file: ${fileName}*`);
    lines.push(`*Total lines processed: ${result.totalRows}*`);
    lines.push(`*Items extracted: ${result.items?.length || 0}*`);

    return lines.join("\n");
  }

  private formatTextAsMarkdown(fileName: string, content: string): string {
    const lines: string[] = [
      `# ${fileName.replace(/\.[^.]+$/, "")}`,
      "",
      `> Processed by Nix on ${new Date().toISOString()}`,
      "",
      "## Content",
      "",
      content,
      "",
      "---",
      `*Source file: ${fileName}*`,
    ];

    return lines.join("\n");
  }

  private generateDescription(metadata: Record<string, unknown>, content: string): string {
    const parts: string[] = [];

    if (metadata.projectName) {
      parts.push(`Project: ${metadata.projectName}`);
    }
    if (metadata.projectReference) {
      parts.push(`Ref: ${metadata.projectReference}`);
    }

    if (parts.length === 0) {
      const firstLine = content
        .split("\n")
        .find((line) => line.trim() && !line.startsWith("#") && !line.startsWith(">"));
      if (firstLine) {
        parts.push(firstLine.trim().substring(0, 100));
      }
    }

    return parts.join(" | ") || "Nix processed document";
  }

  private cleanupUploadedFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(
        `Failed to cleanup file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
