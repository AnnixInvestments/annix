import { ApiProperty } from "@nestjs/swagger";
import { Rfq } from "../../rfq/entities/rfq.entity";
import { User } from "../../user/entities/user.entity";
import { NixExtractionSession } from "./nix-extraction-session.entity";

export enum ExtractionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  NEEDS_CLARIFICATION = "needs_clarification",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum DocumentType {
  PDF = "pdf",
  EXCEL = "excel",
  WORD = "word",
  TEXT = "text",
  CAD = "cad",
  SOLIDWORKS = "solidworks",
  IMAGE = "image",
  UNKNOWN = "unknown",
}

/**
 * Distinguishes the role of an uploaded document inside a quote/RFQ pack so
 * that downstream AI extraction can apply role-specific prompts and so the
 * cross-document linker (#253 task B) knows what to extract first vs second.
 *
 * - drawing: workshop sheets / spool sheets / isometrics / GA drawings.
 *   Extracted first; produces line items.
 * - specification: paint/lining/fabrication/scope documents. Extracted
 *   second, with the drawings' items as Gemini context, so spec clauses can
 *   be cross-linked to the items they apply to.
 * - other: anything that doesn't fit the above (correspondence, scope of
 *   work narratives, reference docs). Extracted as plain context.
 */
export enum DocumentRole {
  DRAWING = "drawing",
  SPECIFICATION = "specification",
  OTHER = "other",
}

export class NixExtraction {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Original document filename" })
  documentName: string;

  @ApiProperty({ description: "Document storage path or URL" })
  documentPath: string;

  @ApiProperty({ description: "Type of document", enum: DocumentType })
  documentType: DocumentType;

  @ApiProperty({ description: "Extraction status", enum: ExtractionStatus })
  status: ExtractionStatus;

  @ApiProperty({ description: "Raw extracted text from document" })
  rawText?: string;

  @ApiProperty({ description: "Extracted structured data as JSON" })
  extractedData?: Record<string, any>;

  @ApiProperty({ description: "Extracted items for RFQ" })
  extractedItems?: Array<{
    description: string;
    quantity?: number;
    unit?: string;
    specifications?: Record<string, any>;
    pageReference?: number;
    confidence: number;
  }>;

  @ApiProperty({ description: "Relevance score for tender processing" })
  relevanceScore?: number;

  @ApiProperty({ description: "Number of pages in document" })
  pageCount?: number;

  @ApiProperty({ description: "Processing error message if failed" })
  errorMessage?: string;

  @ApiProperty({ description: "Processing time in milliseconds" })
  processingTimeMs?: number;

  user?: User;

  userId?: number;

  rfq?: Rfq;

  rfqId?: number;

  @ApiProperty({
    description:
      "Owning module key for polymorphic source linkage (e.g. 'rfq', 'asca'). Replaces direct rfq_id FK going forward.",
    required: false,
  })
  sourceModule?: string;

  @ApiProperty({
    description: "Source entity ID within the owning module (e.g. RFQ ID, ASCA quote ID).",
    required: false,
  })
  sourceId?: number;

  @ApiProperty({
    description:
      "Extraction profile key driving prompt + post-extraction handler (e.g. 'rfq-piping', 'asca-quote-documents'). Resolved against NixExtractionProfileRegistry.",
    required: false,
  })
  extractionProfile?: string;

  @ApiProperty({
    description:
      "Role of this document within the quote/RFQ pack — drives role-specific prompts and drawings-first ordering for cross-document linking.",
    enum: DocumentRole,
    required: false,
  })
  documentRole?: DocumentRole;

  @ApiProperty({
    description:
      "Durable S3 key for the uploaded source document. Resolved against the storage service's bucket configuration and storage_area. Distinct from documentPath (which records the temporary processing path).",
    required: false,
  })
  storagePath?: string;

  @ApiProperty({
    description:
      "Top-level StorageArea (e.g. 'stock-control', 'annix-app') the storage_path lives under.",
    required: false,
  })
  storageArea?: string;

  @ApiProperty({
    description: "Size of the stored object in bytes (mirrors S3 metadata).",
    required: false,
  })
  storageSizeBytes?: number;

  @ApiProperty({
    description: "MIME type of the stored object (mirrors S3 metadata).",
    required: false,
  })
  storageMimeType?: string;

  session?: NixExtractionSession;

  @ApiProperty({
    description:
      "FK to the NixExtractionSession this extraction belongs to. Null for one-off uploads (legacy / standalone /nix/upload calls).",
    required: false,
  })
  sessionId?: number;

  @ApiProperty({
    description:
      "ID of the matched mine within its country table (issue #264). Disambiguated by mineCountry — one of botswana_mines / namibia_mines / sa_mines / zimbabwe_mines / zambia_mines / mozambique_mines. Populated by MineInferenceService when Gemini metadata yields a confident match. Null when the document couldn't be tied to a known mine.",
    required: false,
  })
  mineId?: number;

  @ApiProperty({
    description:
      "Country whose mine table mineId references — 'South Africa', 'Botswana', 'Namibia', 'Zimbabwe', 'Zambia', or 'Mozambique'. Required to dereference mineId because the FK constraint was dropped when international mine tables were added.",
    required: false,
  })
  mineCountry?: string;

  /**
   * Virtual — not persisted. NixExtractionSessionService populates this
   * with the friendly mine name (resolved via MineRegistryService against
   * the country table referenced by mineCountry) when a session is loaded,
   * so the frontend MineInferenceBadge can render 'Tagged: Langer Heinrich
   * Uranium Mine' instead of 'Tagged: Mine #2'.
   */
  mineName?: string;

  @ApiProperty({
    description:
      "Confidence score (0..1) of the mine inference. >= 0.8 = strong (auto-attached); 0.5–0.8 = weak (attached but flagged for user review); < 0.5 = no attach.",
    required: false,
  })
  mineInferenceConfidence?: number;

  @ApiProperty({
    description:
      "Human-readable explanation of why the mine inference matched. e.g. 'project name match (Langer Heinrich)' or 'document number prefix LHU-'.",
    required: false,
  })
  mineInferenceReason?: string;

  @ApiProperty({
    description:
      "Canonical document number extracted from the title block (e.g. 'LHU-0000-EP-2701-012-00'). Used by the mine library for cross-quote reuse — a future quote referencing the same number can pull this extraction's clauses directly.",
    required: false,
  })
  documentNumber?: string;

  @ApiProperty({
    description: "Document revision extracted from the title block (e.g. '00', 'AF', 'Rev A').",
    required: false,
  })
  documentRevision?: string;

  @ApiProperty({
    description:
      "Denormalised flag set false when a higher-revision extraction has been added to the library for the same (mineCountry, mineId, documentNumber). Inference / cross-quote reuse only return rows where this is true. Defaults true for first-time uploads.",
  })
  isLatestRevision: boolean;

  @ApiProperty({
    description:
      "When this extraction is no longer the latest revision (is_latest_revision = false), points to the newer-rev extraction that superseded it so the UI can render a 'see latest →' link.",
    required: false,
  })
  supersededByExtractionId?: number;

  createdAt: Date;

  updatedAt: Date;
}
