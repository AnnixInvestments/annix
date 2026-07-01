import * as fs from "node:fs";
import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { bufferToMulterFile, documentPath } from "../lib/app-storage-helper";
import { SecureDocumentsService } from "../secure-documents/secure-documents.service";
import { S3StorageService } from "../storage/s3-storage.service";
import { StorageArea } from "../storage/storage.interface";
import { AiChatService } from "./ai-providers/ai-chat.service";
import { AiExtractionService } from "./ai-providers/ai-extraction.service";
import { DEFAULT_EXTRACTION_SYSTEM_PROMPT } from "./ai-providers/ai-provider.interface";
import { hardenedExtractionSystemInstruction } from "./ai-providers/untrusted-content";
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
import { MineInferenceService } from "./mine-inference.service";
import { NixClarificationRepository } from "./nix-clarification.repository";
import { NixExtractionRepository } from "./nix-extraction.repository";
import { NixLearningRepository } from "./nix-learning.repository";
import { NixUserPreferenceRepository } from "./nix-user-preference.repository";
import { NixExtractionProfileRegistry } from "./profiles";
import { RevisionTrackingService, type SupersessionVerdict } from "./revision-tracking.service";
import {
  ExcelExtractorService,
  ExtractedItem,
  ExtractionResult,
  SpecificationCellData,
} from "./services/excel-extractor.service";
import { enforceExplicitDescriptionSpecs } from "./services/explicit-size-guard";
import {
  feedbackLearningRow,
  feedbackPatternKey,
  type NixFeedbackPayload,
} from "./services/learning-feedback.util";
import { PdfExtractorService } from "./services/pdf-extractor.service";
import { WordExtractorService } from "./services/word-extractor.service";

/**
 * Trust context for a learning write, derived from the request's authenticated
 * identity (never from a client-supplied body field). Authenticated writes are
 * trusted (`quarantined:false`, USER_CORRECTION); anonymous writes are
 * quarantined and tagged with a one-way IP hash for audit. Defaults to a trusted
 * system write so internal callers (e.g. patchExtractionItem auto-corrections)
 * are unaffected.
 */
export interface NixLearningWriteTrust {
  ownerUserId: number | null;
  quarantined: boolean;
  sourceIpHash: string | null;
}

export const TRUSTED_LEARNING_WRITE: NixLearningWriteTrust = {
  ownerUserId: null,
  quarantined: false,
  sourceIpHash: null,
};

@Injectable()
export class NixService {
  private readonly logger = new Logger(NixService.name);

  constructor(
    private readonly extractionRepo: NixExtractionRepository,
    private readonly learningRepo: NixLearningRepository,
    private readonly preferenceRepo: NixUserPreferenceRepository,
    private readonly clarificationRepo: NixClarificationRepository,
    private readonly excelExtractor: ExcelExtractorService,
    private readonly pdfExtractor: PdfExtractorService,
    private readonly wordExtractor: WordExtractorService,
    private readonly aiExtractor: AiExtractionService,
    private readonly aiChatService: AiChatService,
    @Inject(forwardRef(() => SecureDocumentsService))
    private readonly secureDocumentsService: SecureDocumentsService,
    private readonly s3StorageService: S3StorageService,
    private readonly profileRegistry: NixExtractionProfileRegistry,
    private readonly mineInferenceService: MineInferenceService,
    private readonly revisionTrackingService: RevisionTrackingService,
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

  /**
   * Issue #264 Phase 1 — auto-tag a completed extraction to a mine using
   * the title-block metadata Gemini wrote into extractedData. Mutates the
   * extraction in place; the caller saves it.
   *
   * Errors are caught and logged — mine tagging is opportunistic, never
   * blocks a successful extraction from being persisted. The columns stay
   * null when no signal yields a confident match.
   */
  private async attachMineInference(extraction: NixExtraction): Promise<void> {
    try {
      const inference = await this.mineInferenceService.infer(extraction);
      if (!inference) return;

      // Always persist the canonical doc number / revision when present, even
      // if no mine matched — supports global cross-quote lookup later.
      extraction.documentNumber = inference.documentNumber ?? extraction.documentNumber;
      extraction.documentRevision = inference.documentRevision ?? extraction.documentRevision;

      if (inference.mineId > 0 && inference.confidence > 0) {
        extraction.mineId = inference.mineId;
        extraction.mineCountry = inference.mineCountry ?? undefined;
        extraction.mineInferenceConfidence = inference.confidence;
        extraction.mineInferenceReason = inference.reason;
      }
    } catch (err) {
      this.logger.error(
        `Mine inference failed for extraction #${extraction.id}: ${
          err instanceof Error ? err.message : "unknown"
        }`,
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
   * On-demand suggestion of the customer's PO / order / job reference for
   * this quote session. Runs a focused Gemini call against the concatenated
   * rawText of every extraction in the session, told specifically to look
   * for labelled PO / Order / Job / Customer Ref fields and to IGNORE
   * drawing-title-block document numbers (which Nix already captures
   * separately and which mislead this lookup).
   *
   * Returns { suggestion: null } when no relevant reference can be found
   * with confidence. Email-body context isn't included yet — InboundEmail
   * doesn't persist body today and has no FK to the session.
   */
  async suggestCustomerOrderNumber(sessionId: number): Promise<{ suggestion: string | null }> {
    const extractions = await this.extractionRepo.findBySessionOrderedAsc(sessionId);
    if (extractions.length === 0) return { suggestion: null };

    const MAX_PROMPT_CHARS = 20000;
    const blocks: string[] = [];
    let total = 0;
    for (const ext of extractions) {
      const text = ext.rawText ? ext.rawText.trim() : "";
      if (text.length === 0) continue;
      const role = ext.documentRole ?? "unknown";
      const name = ext.documentName ?? `extraction ${ext.id}`;
      const header = `--- ${name} (role: ${role}) ---\n`;
      const available = MAX_PROMPT_CHARS - total - header.length;
      if (available <= 200) break;
      const slice = text.slice(0, Math.min(text.length, available));
      blocks.push(header + slice);
      total += header.length + slice.length;
    }
    if (blocks.length === 0) return { suggestion: null };

    const systemPrompt = [
      "You read extracted document text from a customer's quote-request package (drawings, specifications, cover letters, RFQ pages).",
      "Find the customer's purchase-order / order / job reference for THIS request.",
      "",
      'Return STRICT JSON only, no prose: { "suggestion": string | null, "reasoning": string | null }.',
      "Use null for suggestion when the documents don't contain a clear customer PO / order / job ref. Never invent values.",
      "",
      "What counts as a valid reference:",
      "- Labelled fields: 'PO No: ABC123', 'Order No.: XYZ', 'Job Number: 32452E', 'Customer Reference: ...', 'RFQ Ref: ...'",
      "- Project / job names that look like the END-CLIENT's job (e.g. 'STEEL AFRICA - 32452E' suggests Steel Africa's job 32452E).",
      "",
      "What does NOT count:",
      "- Drawing-title-block document numbers like 'LHU-0000-EP-2701-009-00' — these are internal drawing codes, not the customer's order ref.",
      "- Quotation / proposal numbers from the supplier side.",
      "- Generic document identifiers (revision codes, sheet numbers).",
    ].join("\n");

    try {
      const result = await this.aiChatService.chat(
        [{ role: "user", content: blocks.join("\n\n") }],
        systemPrompt,
        undefined,
        { temperature: 0.1, maxOutputTokens: 256, responseFormat: "json" },
      );
      return { suggestion: parseSuggestedOrderNumber(result.content) };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "unknown";
      this.logger.warn(`suggestCustomerOrderNumber(${sessionId}) failed: ${msg}`);
      return { suggestion: null };
    }
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
    const extraction = await this.extractionRepo.findById(extractionId);
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

      await this.attachMineInference(extraction);

      await this.extractionRepo.save(extraction);

      try {
        await this.revisionTrackingService.processIncomingExtraction(extraction);
      } catch (revErr) {
        this.logger.error(
          `Revision tracking failed during retry for #${extractionId}: ${
            revErr instanceof Error ? revErr.message : "unknown"
          }`,
        );
      }

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
    const resolvedDocumentName = dto.documentName || dto.documentPath.split("/").pop() || "unknown";

    // Same-session dedupe: when uploading into an existing draft session,
    // if a row already exists with the same filename and isn't a failed
    // attempt, return that row instead of creating a duplicate. The user
    // typically hits this by accidentally drag-dropping the same file
    // twice, or by re-running 'Send to Nix' on a bucket that already
    // has half its docs processed. Failed extractions are excluded so
    // a legitimate retry-after-failure still succeeds.
    if (dto.sessionId) {
      const existing = await this.extractionRepo.findLatestSameSessionDuplicate({
        sessionId: dto.sessionId,
        documentName: resolvedDocumentName,
      });
      if (existing) {
        this.logger.log(
          `Same-session dedupe: '${resolvedDocumentName}' already in session #${dto.sessionId} as extraction #${existing.id}; returning existing row`,
        );
        return {
          extractionId: existing.id,
          status: existing.status,
          items: (existing.extractedItems ?? []) as ProcessDocumentResponseDto["items"],
          pendingClarifications: [],
          revisionVerdict: {
            action: "duplicate-in-session",
            canonicalExtractionId: existing.id,
            canonicalRevision: existing.documentRevision ?? null,
          } as SupersessionVerdict,
        };
      }
    }

    const extraction = await this.extractionRepo.create({
      documentName: resolvedDocumentName,
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
      scopeKind: dto.scopeKind,
      scopeRef: dto.scopeRef,
    });

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

    // Archive-only mode: caller just wants the file mirrored to S3 (e.g.
    // the .eml itself, a tender-spec PDF without an extraction profile,
    // an image). Skip the extractor + profile handler and return early
    // so the file is persisted immediately on upload rather than only at
    // RFQ submission time.
    if (dto.skipExtraction) {
      extraction.extractedData = { archiveOnly: true };
      extraction.extractedItems = [];
      extraction.processingTimeMs = Date.now() - startTime;
      extraction.status = ExtractionStatus.COMPLETED;
      await this.extractionRepo.save(extraction);
      this.logger.log(
        `Document archive-only completed for extraction #${extraction.id}: ${extraction.documentName} (${extraction.storageSizeBytes ?? "?"} bytes)`,
      );
      return {
        extractionId: extraction.id,
        status: extraction.status,
        items: [],
        pendingClarifications: [],
      };
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

      const reuse = await this.mineInferenceService.findReuseTargetForUpload(
        extraction.documentName,
      );

      if (reuse) {
        this.logger.log(
          `[#264 Phase 3] Reusing extraction #${reuse.source.id} for "${extraction.documentName}" (doc ${reuse.documentNumber} rev ${reuse.documentRevision ?? "?"}) — Gemini call skipped`,
        );
        extractedData = (reuse.source.extractedData ?? {}) as Record<string, any>;
        extractedItems = (reuse.source.extractedItems ?? []) as Array<any>;
        specificationCells = [];
        extraction.rawText = reuse.source.rawText;
        extraction.pageCount = reuse.source.pageCount;
        extraction.documentNumber = reuse.documentNumber;
        extraction.documentRevision = reuse.documentRevision ?? undefined;
        extraction.mineId = reuse.mineId ?? undefined;
        extraction.mineCountry = reuse.source.mineCountry ?? undefined;
        extraction.mineInferenceConfidence = reuse.source.mineInferenceConfidence ?? undefined;
        extraction.mineInferenceReason = reuse.source.mineInferenceReason
          ? `reused from extraction #${reuse.source.id}: ${reuse.source.mineInferenceReason}`
          : `reused from extraction #${reuse.source.id}`;
      } else {
        switch (documentType) {
          case DocumentType.PDF:
            ({ extractedData, extractedItems, specificationCells } = await this.extractFromPdf(
              dto.documentPath,
              dto.documentName,
              dto.productTypes,
              profileSystemPrompt,
              dto.documentRole,
              dto.allowVision !== false,
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
          case DocumentType.TEXT:
            ({ extractedData, extractedItems, specificationCells } = await this.extractFromText(
              dto.documentPath,
              dto.documentName,
              dto.productTypes,
              profileSystemPrompt,
            ));
            break;
          default:
            throw new Error(`Unsupported document type: ${documentType}`);
        }
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

      // Mine inference always runs — for fresh extractions it works off
      // Gemini's title-block metadata, for cross-quote reuses it works off
      // the cloned metadata + filename. Without this re-run, an extraction
      // whose source had no mine attached would inherit 'no mine' forever
      // (every reuse-of-a-reuse stays unsupervised). Skipping was a
      // premature optimisation that traded correctness for a single repo
      // round-trip.
      if (!extraction.mineId) {
        await this.attachMineInference(extraction);
      }

      await this.extractionRepo.save(extraction);

      const profileMetadata =
        (extraction.extractedData?.profileMetadata as Record<string, unknown> | undefined) ??
        undefined;

      const responseMetadata =
        (extraction.extractedData?.metadata as Record<string, unknown> | undefined) ?? undefined;

      let revisionVerdict: SupersessionVerdict = { action: "first" };
      if (extraction.status === ExtractionStatus.COMPLETED) {
        try {
          revisionVerdict =
            await this.revisionTrackingService.processIncomingExtraction(extraction);
        } catch (revErr) {
          this.logger.error(
            `Revision tracking failed for #${extraction.id}: ${
              revErr instanceof Error ? revErr.message : "unknown"
            }`,
          );
        }
      }

      return {
        extractionId: extraction.id,
        status: extraction.status,
        items: relevantItems,
        pendingClarifications: clarifications.map((c) => ({
          id: c.id,
          question: c.question,
          context: c.context || {},
        })),
        ...(responseMetadata ? { metadata: responseMetadata } : {}),
        ...(profileMetadata ? { profileMetadata } : {}),
        revisionVerdict,
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
    if (sessionId) {
      return this.extractionRepo.findUsableSessionSiblings(sessionId, excludeExtractionId);
    }

    if (!sourceModule || !sourceId) return [];
    return this.extractionRepo.findUsableSourceSiblings(
      sourceModule,
      sourceId,
      excludeExtractionId,
    );
  }

  async submitClarification(
    dto: SubmitClarificationDto,
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<SubmitClarificationResponseDto> {
    const clarification = await this.clarificationRepo.findByIdWithExtraction(dto.clarificationId);

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
      await this.learnFromClarification(clarification, trust);
    }

    const remainingCount = await this.clarificationRepo.countPendingForExtraction(
      clarification.extractionId,
    );

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
    return this.extractionRepo.findByIdWithUserAndRfq(id);
  }

  /**
   * Resolves the owning userId behind a clarification (clarification →
   * extraction → userId), used to scope-check who may answer it. Returns null
   * when the clarification (or its extraction's owner) can't be resolved — e.g.
   * a clarification on an anonymously-created extraction.
   */
  async clarificationOwnerUserId(clarificationId: number): Promise<number | null> {
    const clarification = await this.clarificationRepo.findByIdWithExtraction(clarificationId);
    return clarification?.extraction?.userId ?? null;
  }

  /**
   * The high-entropy per-extraction capability token a clarification's
   * extraction was bound to at anonymous-upload time (stored in scopeRef with
   * scopeKind="anon-extraction-token"). The anonymous clarification answer must
   * forward this exact token. Null when the extraction has no token (legacy /
   * authenticated extractions) — an anonymous answer is then rejected.
   */
  async clarificationAccessToken(clarificationId: number): Promise<string | null> {
    const clarification = await this.clarificationRepo.findByIdWithExtraction(clarificationId);
    return clarification?.extraction?.scopeRef ?? null;
  }

  async pendingClarifications(extractionId: number): Promise<NixClarification[]> {
    return this.clarificationRepo.findPendingForExtractionOrdered(extractionId);
  }

  async userExtractions(userId: number): Promise<NixExtraction[]> {
    return this.extractionRepo.findRecentForUser(userId);
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
      txt: DocumentType.TEXT,
      text: DocumentType.TEXT,
      md: DocumentType.TEXT,
      eml: DocumentType.TEXT,
      msg: DocumentType.TEXT,
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
    allowVision: boolean = true,
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

        // Engineering drawings + image-heavy spec PDFs (scanned, table-as-
        // image) are typically image-based — pdf-parse returns little or
        // no text and the text-only Gemini call extracts nothing. When we
        // hit that case, retry with the multimodal vision API
        // (chatWithImage with PDF media type) so Gemini reads the rendered
        // pages directly. Text-first stays as the fast path when text is
        // available; vision fallback only triggers when we need it.
        //
        // Triggering signals:
        //   - image-only PDF (pdfText.trim().length < 200) — fires
        //     regardless of role.
        //   - drawing role with items=[] — the drawing's BOM table didn't
        //     come through as text.
        //   - specification role with text but BOTH zero items AND empty
        //     metadata/specifications — text exists but Gemini couldn't
        //     parse anything useful, meaning the scope likely sits in
        //     table-cell-as-image or scanned figures. Issue #288 Phase 8.
        const isImageOnlyPdf = pdfText.trim().length < 200;
        const drawingWithNoItems =
          documentRole === DocumentRole.DRAWING && aiResult.items.length === 0;
        const rawMetadata = aiResult.metadata;
        const metadataEmpty =
          !rawMetadata ||
          (typeof rawMetadata === "object" && Object.keys(rawMetadata).length === 0);
        const rawSpecs = aiResult.specifications;
        const specsEmpty =
          !rawSpecs || (typeof rawSpecs === "object" && Object.keys(rawSpecs).length === 0);
        const specWithNoSignal =
          documentRole === DocumentRole.SPECIFICATION &&
          aiResult.items.length === 0 &&
          metadataEmpty &&
          specsEmpty;
        const visionWorthRetrying = isImageOnlyPdf || drawingWithNoItems || specWithNoSignal;
        if (visionWorthRetrying && !allowVision) {
          this.logger.log(
            `Vision fallback suppressed for ${documentName ?? documentPath} (allowVision=false — anonymous over-threshold upload); staying text-only.`,
          );
        }
        if (visionWorthRetrying && allowVision) {
          this.logger.log(
            `Text extraction yielded ${pdfText.trim().length} chars / ${aiResult.items.length} items / metadata-empty=${metadataEmpty} / specs-empty=${specsEmpty} — retrying via vision (chatWithImage, application/pdf).`,
          );
          const visionResult = await this.extractFromPdfWithVision(
            dataBuffer,
            documentName || documentPath.split("/").pop() || "document.pdf",
            systemPrompt,
          );
          // Vision wins when it returns MORE items than text OR (for spec
          // role specifically) when it returns ANY metadata / specifications
          // richer than text. items.length=0 is the correct outcome for a
          // pure spec PDF, so the items-count threshold alone misses spec
          // wins entirely.
          const visionItems = visionResult?.items ?? [];
          const visionMetadata = visionResult?.metadata;
          const visionMetadataPopulated =
            !!visionMetadata &&
            typeof visionMetadata === "object" &&
            Object.keys(visionMetadata).length > 0;
          const visionSpecs = visionResult?.specifications;
          const visionSpecsPopulated =
            !!visionSpecs && typeof visionSpecs === "object" && Object.keys(visionSpecs).length > 0;
          const visionWonByItems = visionItems.length > aiResult.items.length;
          const visionWonBySpecData =
            documentRole === DocumentRole.SPECIFICATION &&
            (visionMetadataPopulated || visionSpecsPopulated) &&
            metadataEmpty &&
            specsEmpty;
          if (visionResult && (visionWonByItems || visionWonBySpecData)) {
            const reason = visionWonByItems
              ? `${visionResult.items.length} items (vs text's ${aiResult.items.length})`
              : "spec metadata / specifications populated where text returned nothing";
            this.logger.log(`Vision extraction won: ${reason}.`);
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
    for (const candidate of this.jsonObjectCandidates(cleaned)) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
      } catch {
        // try the next candidate slice
      }
    }
    return null;
  }

  /**
   * Ordered list of substrings to attempt JSON.parse on, most-likely-correct
   * first. Gemini sometimes wraps the JSON in a prose preamble ("Here is the
   * extracted data:\n{...}") or trailing commentary, or truncates mid-array
   * when it hits the output-token cap — each of which makes a naive
   * JSON.parse of the whole response throw. We recover by (1) the first
   * brace-balanced object, (2) first `{` to last `}`, and (3) a salvaged
   * truncated `"items": [...]` array.
   */
  private jsonObjectCandidates(text: string): string[] {
    const candidates: string[] = [text];
    const firstBrace = text.indexOf("{");
    if (firstBrace < 0) return candidates;
    const fromFirstBrace = text.slice(firstBrace);
    const balanced = this.firstBalancedJsonObject(fromFirstBrace);
    if (balanced) candidates.push(balanced);
    const lastBrace = fromFirstBrace.lastIndexOf("}");
    if (lastBrace > 0) {
      candidates.push(fromFirstBrace.slice(0, lastBrace + 1));
      // Truncated after a complete item but before the array/object closed:
      // close the items array and the root object so the items parsed so far
      // are still recovered.
      candidates.push(`${fromFirstBrace.slice(0, lastBrace + 1)}]}`);
    }
    const itemsClose = fromFirstBrace.lastIndexOf("]");
    if (itemsClose > 0) candidates.push(`${fromFirstBrace.slice(0, itemsClose + 1)}}`);
    return candidates;
  }

  /**
   * Returns the first complete, brace-balanced JSON object in the string,
   * tracking string literals and escapes so braces inside quoted values
   * don't throw off the depth count. Returns null when the object never
   * closes (a truncated response), letting the caller fall back to the
   * truncation-salvage candidates.
   */
  private firstBalancedJsonObject(text: string): string | null {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        if (inString) escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return text.slice(0, i + 1);
      }
    }
    return null;
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
    const systemPrompt = hardenedExtractionSystemInstruction(
      profileSystemPrompt ?? DEFAULT_EXTRACTION_SYSTEM_PROMPT,
    );

    try {
      // Cap the outer re-send loop: each chatWithImage already runs its own
      // transient-error retry, and re-sending the whole (large) PDF on a mere
      // JSON-parse miss rarely helps while multiplying vision cost/latency.
      // One re-send covers model non-determinism; beyond that we fail cleanly.
      const maxAttempts = 2;
      let result: Awaited<ReturnType<typeof this.aiChatService.chatWithImage>> | null = null;
      let parsed: Record<string, unknown> | null = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        result = await this.aiChatService.chatWithImage(
          base64,
          "application/pdf",
          userPrompt,
          systemPrompt,
          { temperature: 0.1, maxOutputTokens: 32_768, responseFormat: "json" },
        );
        parsed = this.parseExtractionJson(result.content);
        if (parsed) break;
        this.logger.warn(
          `Vision extraction returned no parseable JSON for ${documentName} on attempt ${attempt}/${maxAttempts}; raw length=${result.content.length}`,
        );
      }
      if (!parsed || !result) {
        this.logger.error(
          `Vision extraction failed to return parseable JSON for ${documentName} after ${maxAttempts} attempts — the drawing could not be read.`,
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
        this.guardVisionItem(this.normaliseVisionItem(item)),
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
  // Issue #294: re-assert the row's own description-derived specs after the AI
  // pass so a sub-item cannot inherit a parent's bore/material. The text path
  // does this in ai-extraction.service; the vision path (image-only drawings —
  // exactly where nested sub-items are most likely) previously skipped it.
  private guardVisionItem(item: ExtractedItem): ExtractedItem {
    const { item: guarded, corrections } = enforceExplicitDescriptionSpecs(item);
    if (corrections.length > 0) {
      this.logger.warn(
        `Vision explicit-size guard corrected row ${item.rowNumber} ("${item.description.substring(0, 80)}"): ${corrections.join("; ")}`,
      );
    }
    return guarded;
  }

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
    const liningThicknessMm = numFrom(
      "liningThicknessMm",
      "liningThickness",
      "lining_thickness_mm",
    );
    const liningFlangeFaceThicknessMm = numFrom(
      "liningFlangeFaceThicknessMm",
      "liningFlangeFaceThickness",
      "lining_flange_face_thickness_mm",
    );
    const internalCoatingDescription = strFrom(
      "internalCoatingDescription",
      "corrosionInternal",
      "corrosion_int",
      "internalPaint",
    );
    const externalCoatingDescription = strFrom(
      "externalCoatingDescription",
      "corrosionExternal",
      "corrosion_ext",
      "externalPaint",
    );
    const bandingDetails = strFrom("bandingDetails", "bands", "bandCallout");
    const flangeClass = strFrom("flangeClass", "flange_class", "flangeClassRating");
    const deviationsRaw = item["deviations"];
    const deviations = Array.isArray(deviationsRaw)
      ? (deviationsRaw.filter((d) => typeof d === "string" && d.length > 0) as string[])
      : null;
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
      ...(liningThicknessMm !== null ? { liningThicknessMm } : {}),
      ...(liningFlangeFaceThicknessMm !== null ? { liningFlangeFaceThicknessMm } : {}),
      ...(internalCoatingDescription ? { internalCoatingDescription } : {}),
      ...(externalCoatingDescription ? { externalCoatingDescription } : {}),
      ...(bandingDetails ? { bandingDetails } : {}),
      ...(flangeClass ? { flangeClass } : {}),
      ...(deviations && deviations.length > 0 ? { deviations } : {}),
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

  /**
   * Plain-text extraction (.txt / .md / a covering-email body saved out of an
   * .eml). The customer RFQ flow routes an email's covering letter here so its
   * blanket surface-protection scope ("all straight pipes rubber lined Linard
   * 60 12mm", "blast SA 3", "fittings polyurethane lined") is extracted into
   * specification metadata and merged into the wizard's global specs — for
   * RFQs whose drawings don't print lining/coating per row. Reuses the same
   * AiExtractionService text path as Word so the shared prompt does the work.
   */
  private async extractFromText(
    documentPath: string,
    documentName?: string,
    productTypes?: string[],
    systemPrompt?: string,
  ): Promise<{
    extractedData: Record<string, any>;
    extractedItems: Array<any>;
    specificationCells: SpecificationCellData[];
  }> {
    this.logger.log(`Text extraction starting for: ${documentPath}`);
    const rawText = await fs.promises.readFile(documentPath, "utf-8");
    const availableProviders = await this.aiExtractor.getAvailableProviders();
    if (availableProviders.length === 0 || rawText.trim().length === 0) {
      this.logger.log(
        `Text extraction has nothing to do (providers=${availableProviders.length}, textLength=${rawText.length})`,
      );
      return {
        extractedData: { itemCount: 0, metadata: {}, specifications: {}, specificationCells: [] },
        extractedItems: [],
        specificationCells: [],
      };
    }

    const aiResult = await this.aiExtractor.extractWithAi(
      rawText,
      documentName ?? documentPath.split(/[/\\]/).pop(),
      undefined,
      productTypes,
      systemPrompt,
    );
    // Lift the tender-spec fields (lining, coating, working pressure, valve
    // types, flange standard, NDT, hydrotest, NACE...) out of the raw text
    // with the same regex extractors the PDF path uses, so a covering-email
    // body's blanket specs populate the metadata the RFQ wizard merges into
    // global specs. AI-derived project metadata stays authoritative on top.
    const tenderMetadata = this.pdfExtractor.tenderMetadataFromText(rawText);
    const mergedMetadata = { ...tenderMetadata, ...aiResult.metadata };
    this.logger.log(
      `Text AI extraction returned ${aiResult.items.length} items, ${
        Object.keys(aiResult.specifications ?? {}).length
      } specification clauses (provider=${aiResult.providerUsed})`,
    );
    return {
      extractedData: {
        itemCount: aiResult.items.length,
        clarificationsNeeded: aiResult.items.filter((i) => i.needsClarification).length,
        metadata: mergedMetadata,
        specifications: aiResult.specifications ?? {},
        specificationCells: aiResult.specificationCells,
        aiProvider: aiResult.providerUsed,
        tokensUsed: aiResult.tokensUsed,
        aiProcessingTimeMs: aiResult.processingTimeMs,
      },
      extractedItems: aiResult.items,
      specificationCells: aiResult.specificationCells,
    };
  }

  private async filterByRelevance(
    items: Array<any>,
    _productTypes?: string[],
  ): Promise<Array<any>> {
    const learningRules = await this.learningRepo.findActiveRelevanceRules();

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

      const clarification = await this.clarificationRepo.create({
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

      clarifications.push(clarification);
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

        const clarification = await this.clarificationRepo.create({
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

        clarifications.push(clarification);
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

  private async learnFromClarification(
    clarification: NixClarification,
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<void> {
    if (!clarification.responseText || !clarification.context?.itemDescription) {
      return;
    }

    const writeSource = trust.quarantined
      ? LearningSource.ANON_UNVERIFIED
      : LearningSource.USER_CORRECTION;

    // Same trust-lane isolation as recordCorrection: an anonymous answer writes
    // a quarantined row (never feeds a prompt) and can never mutate a trusted
    // row; an authenticated answer stays in the trusted lane.
    const existing = await this.learningRepo.findCorrectionByPatternKey(
      clarification.context.itemDescription,
    );
    const existingRule =
      existing && (existing.quarantined === true) === trust.quarantined ? existing : null;

    if (existingRule) {
      existingRule.learnedValue = clarification.responseText;
      existingRule.confirmationCount += 1;
      existingRule.confidence = Math.min(1, existingRule.confidence + 0.05);
      existingRule.source = writeSource;
      existingRule.quarantined = trust.quarantined;
      if (trust.sourceIpHash != null) {
        existingRule.sourceIpHash = trust.sourceIpHash;
      }
      await this.learningRepo.save(existingRule);
    } else {
      await this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: writeSource,
        patternKey: clarification.context.itemDescription,
        originalValue: clarification.context.extractedValue,
        learnedValue: clarification.responseText,
        confidence: 0.6,
        confirmationCount: 1,
        quarantined: trust.quarantined,
        sourceIpHash: trust.sourceIpHash ?? undefined,
      });
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
    return this.learningRepo.create({
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
  }

  async adminLearningRules(): Promise<NixLearning[]> {
    return this.learningRepo.findAdminSeededOrdered();
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
    const extraction = await this.extractionRepo.findById(extractionId);
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

  async recordCorrection(
    correction: {
      extractionId?: number;
      itemDescription: string;
      fieldName: string;
      originalValue: string | number | null;
      correctedValue: string | number;
      userId?: number;
    },
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<{ success: boolean }> {
    const patternKey = `${correction.itemDescription}::${correction.fieldName}`;
    const writeSource = trust.quarantined
      ? LearningSource.ANON_UNVERIFIED
      : LearningSource.USER_CORRECTION;

    // Only ever read/mutate a row in the WRITER'S OWN trust lane: an anonymous
    // (quarantined) write must never touch a trusted row (that's the poison
    // vector), and a trusted write must never adopt a quarantined row's state.
    const existing = await this.learningRepo.findCorrectionByPatternKey(patternKey);
    const existingRule =
      existing && (existing.quarantined === true) === trust.quarantined ? existing : null;

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
      existingRule.source = writeSource;
      existingRule.quarantined = trust.quarantined;
      if (trust.sourceIpHash != null) {
        existingRule.sourceIpHash = trust.sourceIpHash;
      }
      await this.learningRepo.save(existingRule);
      this.logger.log(`Updated learning rule for pattern: ${patternKey}`);
    } else {
      await this.learningRepo.create({
        learningType: LearningType.CORRECTION,
        source: writeSource,
        patternKey,
        category: correction.fieldName,
        originalValue:
          correction.originalValue != null ? String(correction.originalValue) : undefined,
        learnedValue: String(correction.correctedValue),
        confidence: 0.6,
        confirmationCount: 1,
        isActive: true,
        quarantined: trust.quarantined,
        sourceIpHash: trust.sourceIpHash ?? undefined,
      });
      this.logger.log(`Created new learning rule for pattern: ${patternKey}`);
    }

    return { success: true };
  }

  // Issue #263: batch feedback posted at RFQ submit time — the diff
  // between what Nix extracted and what the customer ended up with at
  // Step 3 (field corrections, deleted rows, manually added rows).
  // One NixLearning row per correction; re-submitting the same diff
  // confirms the existing row instead of duplicating it.
  async recordFeedbackBatch(
    payload: NixFeedbackPayload,
    trust: NixLearningWriteTrust = TRUSTED_LEARNING_WRITE,
  ): Promise<{ success: boolean; recorded: number }> {
    const writeSource = trust.quarantined
      ? LearningSource.ANON_UNVERIFIED
      : LearningSource.USER_CORRECTION;
    const results = await Promise.all(
      (payload.corrections ?? []).map(async (correction) => {
        const patternKey = feedbackPatternKey(payload.extractionId, correction);
        const existingRow = await this.learningRepo.findCorrectionByPatternKey(patternKey);
        const existing =
          existingRow && (existingRow.quarantined === true) === trust.quarantined
            ? existingRow
            : null;
        if (existing) {
          existing.confirmationCount += 1;
          existing.confidence = 1;
          existing.source = writeSource;
          existing.quarantined = trust.quarantined;
          if (trust.sourceIpHash != null) {
            existing.sourceIpHash = trust.sourceIpHash;
          }
          await this.learningRepo.save(existing);
          return existing;
        }
        return this.learningRepo.create({
          ...feedbackLearningRow(payload, correction),
          source: writeSource,
          quarantined: trust.quarantined,
          sourceIpHash: trust.sourceIpHash ?? undefined,
        });
      }),
    );
    this.logger.log(
      `Recorded ${results.length} Step 3 feedback correction(s) for extraction ${payload.extractionId ?? "n/a"}`,
    );
    return { success: true, recorded: results.length };
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

  /**
   * Reads a single product data sheet (PDF / image) and returns the brand
   * and a quoter-friendly product description, formatted to match the
   * supplier-row layout in the QuoteSpecsEditor.
   *
   *  - For coatings: brand = manufacturer (e.g. 'Stoncor'), description =
   *    products + DFT µm (e.g. 'Carboguard 890 Aluminium @ 100-150μm,
   *    Carbothane 137 HS @ 50-100μm').
   *  - For linings: brand left blank (linings are single-product),
   *    description = thickness, hardness, colour, bond + cure method
   *    (e.g. '6 mm bore, 3 mm flange, hot-bonded, autoclave vulcanised, red').
   *
   * Used by the 'Upload data sheet' affordance on each custom supplier row
   * — the auto-fill saves the quoter from re-typing what the data sheet
   * already says, while still letting them edit the result before the
   * quote is sent.
   */
  async extractProductSpec(
    fileBuffer: Buffer,
    mimeType: string,
    kind: "coating" | "lining",
  ): Promise<{ brand: string | null; description: string | null }> {
    const base64 = fileBuffer.toString("base64");
    const mediaType = this.normaliseDataSheetMediaType(mimeType);
    if (!mediaType) {
      this.logger.warn(`Unsupported data sheet media type: ${mimeType}`);
      return { brand: null, description: null };
    }

    const systemPrompt = hardenedExtractionSystemInstruction(
      `You read product data sheets and emit a single JSON object: {"brand": string|null, "description": string|null}. No prose, no markdown — JSON only. Use null when the field is genuinely absent. Never invent values.`,
    );

    const userPrompt =
      kind === "coating" ? this.coatingDataSheetPrompt() : this.liningDataSheetPrompt();

    try {
      const result = await this.aiChatService.chatWithImage(
        base64,
        mediaType,
        userPrompt,
        systemPrompt,
        { temperature: 0.1, maxOutputTokens: 1024, responseFormat: "json" },
      );
      return this.parseProductSpecResponse(result.content);
    } catch (error) {
      this.logger.warn(
        `Product spec extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return { brand: null, description: null };
    }
  }

  private coatingDataSheetPrompt(): string {
    return [
      "Read this paint / coating product data sheet and produce ONE supplier entry suitable for a customer-facing quote.",
      "",
      'Return JSON shape: {"brand": string, "description": string}.',
      "",
      "- `brand` is the manufacturer / supplier (e.g. 'Stoncor', 'Carboline', 'Corrocoat', 'Hempel', 'Jotun', 'Sigma', 'International Paint', 'Sherwin-Williams'). Just the company name. Do NOT put the product name in `brand`.",
      "- `description` is the line a quoter would write next to that brand. Most product data sheets describe a SINGLE coat (the product), so usually one '<Product name> @ <DFT range>μm' entry. If the sheet describes a multi-coat system, list each coat separated by ', '.",
      "  - Use ranges like '100-150μm' when the sheet gives a recommended DFT range, otherwise the single recommended value.",
      "  - Append ', colour: <name>' or ', RAL <number>' ONLY if the sheet specifies a colour for THIS coat (skip generic 'available colours' lists).",
      "  - Skip product codes, certification numbers, marketing copy, ingredient breakdowns, and application instructions.",
      "",
      "Example outputs:",
      "  Single coat: 'Carboguard 890 Aluminium @ 100-150μm'",
      "  System: 'Carboguard 890 Aluminium @ 100-150μm, Carbothane 137 HS @ 50-100μm, colour: RAL 5012'",
      "",
      "If the document is genuinely not a paint product data sheet (e.g. it's a rubber lining, a generic spec, an invoice), return both fields as null.",
    ].join("\n");
  }

  private liningDataSheetPrompt(): string {
    return [
      'Read this rubber / polymer / elastomer lining or sheeting product data sheet. Return JSON: {"brand": null, "description": string}.',
      "",
      "`brand` stays null — linings are quoted as a single product and the brand is captured elsewhere as the spec code.",
      "",
      "`description` is a single comma-separated line of THIS PRODUCT'S properties, drawn ONLY from what the data sheet actually states. Include each field below only when the data sheet specifies it, in this order:",
      "  1. Hardness (e.g. '60 Shore A', '70 Shore A')",
      "  2. Cure method (e.g. 'steam cured', 'autoclave vulcanised', 'press cured', 'CSV cured')",
      "  3. Bonding compatibility (e.g. 'hot-bonded', 'cold-bonded', 'self-adhesive')",
      "  4. Polymer family (e.g. 'natural rubber', 'silica-reinforced natural rubber', 'NBR', 'EPDM', 'butyl', 'neoprene')",
      "  5. Specific gravity if given (e.g. 'SG 1.05')",
      "  6. Tensile strength if given (e.g. '24 MPa tensile')",
      "  7. Abrasion / wear resistance class if given",
      "  8. Colour (e.g. 'red', 'black', 'tan', 'natural')",
      "",
      "Example outputs:",
      "  '60 Shore A, steam cured, hot-bonded, natural rubber, red'",
      "  '50 Shore A, autoclave vulcanised, silica-reinforced natural rubber, red'",
      "  '70 Shore A, NBR, oil resistant, black'",
      "",
      "Important: bore thickness and flange thickness do NOT come from product data sheets — those are application-specific and entered elsewhere by the quoter. Don't try to extract them.",
      "",
      "Drop any field that isn't explicitly on the data sheet — don't invent values to pad the line. Most rubber data sheets give hardness + cure method + colour at minimum, so you should normally have at least three fields. Only return description as null if this is genuinely not a rubber/polymer product data sheet.",
    ].join("\n");
  }

  private normaliseDataSheetMediaType(
    mimeType: string,
  ): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf" | null {
    const lower = mimeType.toLowerCase();
    if (lower === "application/pdf") return "application/pdf";
    if (lower === "image/jpeg" || lower === "image/jpg") return "image/jpeg";
    if (lower === "image/png") return "image/png";
    if (lower === "image/gif") return "image/gif";
    if (lower === "image/webp") return "image/webp";
    return null;
  }

  private parseProductSpecResponse(raw: string): {
    brand: string | null;
    description: string | null;
  } {
    const empty = { brand: null, description: null };
    if (!raw || raw.trim().length === 0) return empty;
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    try {
      const parsed = JSON.parse(cleaned) as { brand?: unknown; description?: unknown };
      const brand =
        typeof parsed.brand === "string" && parsed.brand.trim().length > 0
          ? parsed.brand.trim()
          : null;
      const description =
        typeof parsed.description === "string" && parsed.description.trim().length > 0
          ? parsed.description.trim()
          : null;
      return { brand, description };
    } catch (error) {
      this.logger.warn(
        `Failed to parse product spec response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return empty;
    }
  }
}

function parseSuggestedOrderNumber(raw: string): string | null {
  const trimmed = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "");
  try {
    const parsed = JSON.parse(trimmed);
    const value = (parsed as { suggestion?: unknown }).suggestion;
    if (typeof value !== "string") return null;
    const cleaned = value.trim();
    if (cleaned.length === 0 || cleaned.toLowerCase() === "null") return null;
    return cleaned;
  } catch {
    return null;
  }
}
