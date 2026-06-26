import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { now } from "../../lib/datetime";
import { pdfToPngOffThread } from "../../lib/pdf/pdf-to-png-offthread";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { parseAiJsonObject } from "../../nix/ai-providers/ai-json";
import {
  ChatMessage,
  ImageContent,
  TextContent,
} from "../../nix/ai-providers/claude-chat.provider";
import { IStorageService, STORAGE_SERVICE } from "../../storage/storage.interface";
import { ExtractionStatus, JobCardAttachment } from "../entities/job-card-attachment.entity";
import {
  JobCardLineItem,
  type TankComponent,
  type TankComponentShape,
} from "../entities/job-card-line-item.entity";
import { JobCardRepository } from "../repositories/job-card.repository";
import { JobCardAttachmentRepository } from "../repositories/job-card-attachment.repository";
import { JobCardLineItemRepository } from "../repositories/job-card-line-item.repository";

interface ExtractedDimension {
  description: string;
  diameterMm: number | null;
  lengthM: number | null;
  quantity: number;
  itemType: string | null;
  externalSurfaceM2: number | null;
  internalSurfaceM2: number | null;
}

interface TankSection {
  mark: string;
  description: string;
  liningAreaM2: number | null;
  coatingAreaM2: number | null;
}

interface TankExtractionData {
  assemblyType: "tank" | "chute" | "hopper" | "underpan" | "custom";
  drawingReference: string | null;
  jobName: string | null;
  overallLengthMm: number | null;
  overallWidthMm: number | null;
  overallHeightMm: number | null;
  liningType: string | null;
  liningThicknessMm: number | null;
  liningAreaM2: number | null;
  coatingAreaM2: number | null;
  coatingSystem: string | null;
  surfacePrepStandard: string | null;
  sections: TankSection[];
  // Developed flat plate parts, extracted in the same vision call as the
  // sections (single extractor, one call per drawing). lengthMm/widthMm are the
  // developed cut sizes and liningThicknessMm the per-plate rubber thickness —
  // both drive the polymer rubber cutting-diagram nesting.
  plateParts: Array<{
    mark: string;
    description: string;
    thicknessMm: number;
    lengthMm: number;
    widthMm: number;
    quantity: number;
    liningThicknessMm: number;
  }>;
  // Shape-classified, dimensioned components (cylindrical shells, cones, dished
  // heads, rings, branches) that drive the GEOMETRIC tank m² (calculateTankM2) and
  // the developed-cone cutting panels. Distinct from `sections` (printed per-part
  // areas, used to cross-check) and `plateParts` (flat plate BOM).
  components: TankComponent[];
}

export interface DrawingExtractionResult {
  drawingType: "pipe" | "tank_chute";
  dimensions: ExtractedDimension[];
  tankData: TankExtractionData | null;
  totalExternalM2: number;
  totalInternalM2: number;
  totalLiningM2: number;
  totalCoatingM2: number;
  rawText: string;
  confidence: number;
}

const TANK_COMPONENT_TYPES: ReadonlyArray<TankComponent["componentType"]> = [
  "shell",
  "cone",
  "dished_head",
  "lid",
  "ring",
  "branch",
  "partition",
  "plate",
];

// Guards against hostile/garbage model output reaching persistence and the
// downstream m²/nesting math (a single crafted drawing could otherwise emit
// Infinity dimensions or billion-count quantities that DoS the browser).
const MAX_TANK_COMPONENTS = 500;
const MAX_TANK_COMPONENT_QUANTITY = 1000;
const MAX_TANK_DIMENSION_MM = 100000;
const MAX_TANK_AREA_M2 = 100000;

function finiteInRange(value: unknown, max: number): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 && n <= max ? n : null;
}

function clampQuantity(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(n, MAX_TANK_COMPONENT_QUANTITY);
}

const DRAWING_EXTRACTION_PROMPT = `You are an expert at analysing engineering drawing images. You can handle both pipe drawings and welded steel plate structure drawings (tanks, chutes, hoppers, underpans).

You are viewing high-resolution images of engineering drawing pages. Read all dimension annotations, BOM tables, title blocks, and specification notes visible in the images.

First, determine the drawing type:
- "pipe" — pipe spools, piping isometrics, pipe fabrication drawings
- "tank_chute" — welded steel plate assemblies: tanks, chutes, hoppers, underpans, bins

For PIPE drawings, return:
{
  "drawingType": "pipe",
  "dimensions": [
    {
      "description": "300NB x 6m Straight Pipe",
      "diameterMm": 300,
      "lengthM": 6,
      "quantity": 2,
      "itemType": "pipe" | "bend" | "tee" | "reducer" | "flange" | "other"
    }
  ],
  "confidence": 0.85
}

For TANK/CHUTE drawings, return:
{
  "drawingType": "tank_chute",
  "tankData": {
    "assemblyType": "tank" | "chute" | "hopper" | "underpan" | "cyclone" | "distributor" | "custom",
    "drawingReference": "GPW-017",
    "jobName": "Screen 2 Underpan",
    "overallLengthMm": 7238,
    "overallWidthMm": 5241,
    "overallHeightMm": 2852,
    "liningType": "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake" | null,
    "liningThicknessMm": 6,
    "liningAreaM2": 75.00,
    "coatingAreaM2": 82.50,
    "coatingSystem": "Epoxy primer + polyurethane topcoat",
    "surfacePrepStandard": "Sa 2.5",
    "sections": [
      { "mark": "A-A", "description": "Side Panel Left", "liningAreaM2": 12.50, "coatingAreaM2": 13.75 },
      { "mark": "B-B", "description": "End Panel", "liningAreaM2": 8.30, "coatingAreaM2": 9.15 }
    ],
    "plateParts": [
      { "mark": "P1", "description": "Side plate", "thicknessMm": 10, "lengthMm": 2400, "widthMm": 1200, "quantity": 2, "liningThicknessMm": 6 }
    ],
    "components": [
      { "mark": "S1", "description": "Shell", "componentType": "shell", "shapeType": "cylinder", "innerDiameterMm": 1000, "heightMm": 1200, "liningThicknessMm": 6, "quantity": 1 },
      { "mark": "C1", "description": "Floor cone", "componentType": "cone", "shapeType": "cone", "largeDiameterMm": 1450, "smallDiameterMm": 450, "slantHeightMm": 805, "liningThicknessMm": 10, "quantity": 1 },
      { "mark": "LID", "description": "Dished lid", "componentType": "dished_head", "shapeType": "dished_head", "outerDiameterMm": 750, "crownRadiusMm": 642, "knuckleRadiusMm": 45, "liningThicknessMm": 6, "quantity": 1 },
      { "mark": "ARM", "description": "Distributor arm", "componentType": "branch", "shapeType": "branch_wrap", "boreDiameterMm": 200, "lengthMm": 355, "liningThicknessMm": 6, "quantity": 10 }
    ]
  },
  "dimensions": [],
  "confidence": 0.90
}

Rules:
- Determine drawing type from title block, BOM content, and drawing conventions
- Tank drawings typically show: plate BOM tables, rubber lining specs (m² area, thickness), overall assembly dimensions, drawing numbers like "GPW-xxx"
- For tanks: liningAreaM2 is the TOTAL internal rubber/ceramic lining surface area
- For tanks: coatingAreaM2 is the TOTAL external paint/coating surface area
- For tanks: "sections" MUST enumerate every DISTINCT lined or coated component, sub-assembly, or section view shown on THIS drawing — each as its own entry with per-section liningAreaM2 and coatingAreaM2. NEVER return a single catch-all section for a multi-part assembly, and NEVER pad the list with assumed, inferred, or duplicated parts. Only include components that are visibly distinct on the drawing or separately itemised in the BOM; most assemblies have a handful of distinct lined components, not dozens.
- A "section" is any separately identifiable part: a labelled cross-section view (A-A, B-B, C-C…), a named component, or a distinct panel/face. Use the components the drawing actually shows, e.g. for a cyclone: cyclone body/barrel, inlet head, vortex finder/overflow, spigot/apex cone, support/underpan; for a distributor: inlet, body, outlet branches. If a component repeats identically (e.g. several identical support brackets, legs, gussets, or stiffeners), emit it ONCE with "quantity" set to the count — do NOT create a separate section for each identical repeated part.
- "mark" and "description" for each section MUST be taken from THIS drawing's own labels, BOM, or callouts. NEVER copy a section name from a different assembly type (e.g. do NOT label a cyclone section "Tank Section" or "Underflow Tank") and never invent generic names the drawing does not support.
- Calculate per-section m2 from visible dimensions in each section view. If exact per-section areas are unclear, estimate proportional splits from total area and section dimensions; leave a section's area null only when no dimensions are derivable.
- The sum of all section liningAreaM2 values should equal the total liningAreaM2
- "jobName" should be extracted from the drawing title block (e.g. "Screen 2 Underpan")
- For tanks: "plateParts" MUST list every plate in the plate BOM table. For each, give thicknessMm (plate gauge), and the DEVELOPED FLAT cut size as lengthMm x widthMm (the rolled-out plate size before forming, read from the cut/plate schedule or computed from the developed dimensions — NOT the folded assembly dimension). Set liningThicknessMm to that plate's rubber/lining thickness (fall back to the tank-level liningThicknessMm when a per-plate value is not given). These developed sizes feed the rubber cutting diagram, so they are required whenever a plate BOM is visible.
- For tanks: "components" MUST geometrically classify every lined or rolled body so its surface area can be computed. For each, set "componentType" (shell|cone|dished_head|lid|ring|branch|partition|plate) and a "shapeType" with its dimensions in mm: cylindrical shell/barrel → "cylinder" (innerDiameterMm, heightMm); conical section / reducer body / spigot or apex cone → "cone" (largeDiameterMm, smallDiameterMm, slantHeightMm — use the developed slant length or flat-pattern arc radius when shown, NOT the vertical height); dished/domed head or lid → "dished_head" (outerDiameterMm, crownRadiusMm, knuckleRadiusMm); flat ring / flange face / annular plate → "annular_ring" (outerDiameterMm, innerDiameterMm); distributor arm / outlet branch / nozzle pipe → "branch_wrap" (boreDiameterMm, lengthMm); any flat plate → "rectangle" (widthMm, heightMm). Set "liningThicknessMm" PER COMPONENT from that component's own callout — NEVER blanket-propagate one thickness across all components; use null when a component is not rubber-lined. Set "quantity" to the count of identical repeated components (e.g. 10 identical distributor arms → ONE entry with quantity 10). EXCLUDE painted-only structural parts (legs, gussets, lifting lugs, brackets, stiffeners) from "components". Omit a dimension only when it cannot be read; a component with no usable dimensions will be dropped. These components drive the geometric m² and the developed cutting panels.
- For pipes: extract diameters in NB or mm, lengths in m or mm (convert to m)
- Set confidence based on clarity of extracted data (0.0 to 1.0)
- Default quantity to 1 if not specified
- Return valid JSON only, no additional text`;

const MULTI_DOC_EXTRACTION_PROMPT = `You are an expert at analysing engineering drawing images. You are viewing pages from multiple engineering documents for the same fabrication job. Cross-reference information across documents.

You are viewing high-resolution images of engineering drawing pages. Read all dimension annotations, BOM tables, title blocks, and specification notes visible in the images.

BOM tables in one document may reference detail dimensions in another. Drawing reference numbers (e.g., GPW-017) may appear across documents — use these to link related sheets. Combine all findings into a single extraction result. Do not duplicate items that appear in multiple documents.

Prioritise BOM tables and schedules for quantities and material specs. Use detail drawings for dimensions that are not clear on GA drawings. Handle drawing number cross-references (e.g., "See Detail A on Sheet 3").

First, determine the drawing type:
- "pipe" — pipe spools, piping isometrics, pipe fabrication drawings
- "tank_chute" — welded steel plate assemblies: tanks, chutes, hoppers, underpans, bins

For PIPE drawings, return:
{
  "drawingType": "pipe",
  "dimensions": [
    {
      "description": "300NB x 6m Straight Pipe",
      "diameterMm": 300,
      "lengthM": 6,
      "quantity": 2,
      "itemType": "pipe" | "bend" | "tee" | "reducer" | "flange" | "other"
    }
  ],
  "confidence": 0.85
}

For TANK/CHUTE drawings, return:
{
  "drawingType": "tank_chute",
  "tankData": {
    "assemblyType": "tank" | "chute" | "hopper" | "underpan" | "cyclone" | "distributor" | "custom",
    "drawingReference": "GPW-017",
    "jobName": "Screen 2 Underpan",
    "overallLengthMm": 7238,
    "overallWidthMm": 5241,
    "overallHeightMm": 2852,
    "liningType": "rubber" | "ceramic" | "hdpe" | "pu" | "glass_flake" | null,
    "liningThicknessMm": 6,
    "liningAreaM2": 75.00,
    "coatingAreaM2": 82.50,
    "coatingSystem": "Epoxy primer + polyurethane topcoat",
    "surfacePrepStandard": "Sa 2.5",
    "sections": [
      { "mark": "A-A", "description": "Side Panel Left", "liningAreaM2": 12.50, "coatingAreaM2": 13.75 },
      { "mark": "B-B", "description": "End Panel", "liningAreaM2": 8.30, "coatingAreaM2": 9.15 }
    ],
    "plateParts": [
      { "mark": "P1", "description": "Side plate", "thicknessMm": 10, "lengthMm": 2400, "widthMm": 1200, "quantity": 2, "liningThicknessMm": 6 }
    ],
    "components": [
      { "mark": "S1", "description": "Shell", "componentType": "shell", "shapeType": "cylinder", "innerDiameterMm": 1000, "heightMm": 1200, "liningThicknessMm": 6, "quantity": 1 },
      { "mark": "C1", "description": "Floor cone", "componentType": "cone", "shapeType": "cone", "largeDiameterMm": 1450, "smallDiameterMm": 450, "slantHeightMm": 805, "liningThicknessMm": 10, "quantity": 1 },
      { "mark": "LID", "description": "Dished lid", "componentType": "dished_head", "shapeType": "dished_head", "outerDiameterMm": 750, "crownRadiusMm": 642, "knuckleRadiusMm": 45, "liningThicknessMm": 6, "quantity": 1 },
      { "mark": "ARM", "description": "Distributor arm", "componentType": "branch", "shapeType": "branch_wrap", "boreDiameterMm": 200, "lengthMm": 355, "liningThicknessMm": 6, "quantity": 10 }
    ]
  },
  "dimensions": [],
  "confidence": 0.90
}

Rules:
- Determine drawing type from title block, BOM content, and drawing conventions
- Tank drawings typically show: plate BOM tables, rubber lining specs (m² area, thickness), overall assembly dimensions, drawing numbers like "GPW-xxx"
- For tanks: liningAreaM2 is the TOTAL internal rubber/ceramic lining surface area
- For tanks: coatingAreaM2 is the TOTAL external paint/coating surface area
- For tanks: "sections" MUST enumerate every DISTINCT lined or coated component, sub-assembly, or section view shown on THIS drawing — each as its own entry with per-section liningAreaM2 and coatingAreaM2. NEVER return a single catch-all section for a multi-part assembly, and NEVER pad the list with assumed, inferred, or duplicated parts. Only include components that are visibly distinct on the drawing or separately itemised in the BOM; most assemblies have a handful of distinct lined components, not dozens.
- A "section" is any separately identifiable part: a labelled cross-section view (A-A, B-B, C-C…), a named component, or a distinct panel/face. Use the components the drawing actually shows, e.g. for a cyclone: cyclone body/barrel, inlet head, vortex finder/overflow, spigot/apex cone, support/underpan; for a distributor: inlet, body, outlet branches. If a component repeats identically (e.g. several identical support brackets, legs, gussets, or stiffeners), emit it ONCE with "quantity" set to the count — do NOT create a separate section for each identical repeated part.
- "mark" and "description" for each section MUST be taken from THIS drawing's own labels, BOM, or callouts. NEVER copy a section name from a different assembly type (e.g. do NOT label a cyclone section "Tank Section" or "Underflow Tank") and never invent generic names the drawing does not support.
- Calculate per-section m2 from visible dimensions in each section view. If exact per-section areas are unclear, estimate proportional splits from total area and section dimensions; leave a section's area null only when no dimensions are derivable.
- The sum of all section liningAreaM2 values should equal the total liningAreaM2
- "jobName" should be extracted from the drawing title block (e.g. "Screen 2 Underpan")
- For tanks: "plateParts" MUST list every plate in the plate BOM table. For each, give thicknessMm (plate gauge), and the DEVELOPED FLAT cut size as lengthMm x widthMm (the rolled-out plate size before forming, read from the cut/plate schedule or computed from the developed dimensions — NOT the folded assembly dimension). Set liningThicknessMm to that plate's rubber/lining thickness (fall back to the tank-level liningThicknessMm when a per-plate value is not given). These developed sizes feed the rubber cutting diagram, so they are required whenever a plate BOM is visible.
- For tanks: "components" MUST geometrically classify every lined or rolled body so its surface area can be computed. For each, set "componentType" (shell|cone|dished_head|lid|ring|branch|partition|plate) and a "shapeType" with its dimensions in mm: cylindrical shell/barrel → "cylinder" (innerDiameterMm, heightMm); conical section / reducer body / spigot or apex cone → "cone" (largeDiameterMm, smallDiameterMm, slantHeightMm — use the developed slant length or flat-pattern arc radius when shown, NOT the vertical height); dished/domed head or lid → "dished_head" (outerDiameterMm, crownRadiusMm, knuckleRadiusMm); flat ring / flange face / annular plate → "annular_ring" (outerDiameterMm, innerDiameterMm); distributor arm / outlet branch / nozzle pipe → "branch_wrap" (boreDiameterMm, lengthMm); any flat plate → "rectangle" (widthMm, heightMm). Set "liningThicknessMm" PER COMPONENT from that component's own callout — NEVER blanket-propagate one thickness across all components; use null when a component is not rubber-lined. Set "quantity" to the count of identical repeated components (e.g. 10 identical distributor arms → ONE entry with quantity 10). EXCLUDE painted-only structural parts (legs, gussets, lifting lugs, brackets, stiffeners) from "components". Omit a dimension only when it cannot be read; a component with no usable dimensions will be dropped. These components drive the geometric m² and the developed cutting panels.
- For pipes: extract diameters in NB or mm, lengths in m or mm (convert to m)
- Set confidence based on clarity of extracted data (0.0 to 1.0)
- Default quantity to 1 if not specified
- Return valid JSON only, no additional text`;

// Force Gemini's JSON mode + a generous token budget for drawing extraction.
// Without this the model returns free-form text that comes back truncated /
// malformed on large multi-document (e.g. multi-drawing .eml) responses, and
// the naive JSON.parse fails — yielding 0 rows. JSON mode guarantees valid,
// complete JSON.
const DRAWING_EXTRACTION_OPTIONS = {
  temperature: 0.1,
  maxOutputTokens: 32_768,
  responseFormat: "json" as const,
};

const DRAWING_CHUNK_PAGE_COUNT = 6;
const DRAWING_CHUNK_THRESHOLD = 10;

@Injectable()
export class DrawingExtractionService {
  private readonly logger = new Logger(DrawingExtractionService.name);

  constructor(
    private readonly attachmentRepo: JobCardAttachmentRepository,
    private readonly jobCardRepo: JobCardRepository,
    private readonly lineItemRepo: JobCardLineItemRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    private readonly aiChatService: AiChatService,
  ) {}

  async extractFromPdfBuffers(
    pdfBuffers: { buffer: Buffer; filename: string }[],
  ): Promise<DrawingExtractionResult> {
    if (pdfBuffers.length === 1) {
      const pdf = pdfBuffers[0];
      const images = await this.convertPdfToImages(pdf.buffer);
      if (images.length === 0) {
        return this.emptyResult();
      }
      if (images.length > DRAWING_CHUNK_THRESHOLD) {
        const aiResult = await this.extractLargePdfByChunks(images, pdf.filename);
        return this.buildExtractionResult(aiResult);
      }
      const aiResult = await this.extractDimensionsWithVision(images);
      return this.buildExtractionResult(aiResult);
    }

    const contentParts: (TextContent | ImageContent)[] = [];

    const pdfContentParts = await pdfBuffers.reduce(
      async (accPromise, { buffer, filename }) => {
        const acc = await accPromise;
        const images = await this.convertPdfToImages(buffer);
        const imageContents = images.map(
          (img): ImageContent => ({
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: img.toString("base64"),
            },
          }),
        );
        return [
          ...acc,
          { type: "text" as const, text: `--- Pages from: ${filename} ---` },
          ...imageContents,
        ];
      },
      Promise.resolve([] as (TextContent | ImageContent)[]),
    );
    contentParts.push(...pdfContentParts);

    if (contentParts.length === 0) {
      return this.emptyResult();
    }

    contentParts.push({
      type: "text",
      text: "Analyse all the above engineering drawing pages. Cross-reference information across documents. Respond with JSON only.",
    });

    const isMultiDoc = pdfBuffers.length > 1;
    const prompt = isMultiDoc ? MULTI_DOC_EXTRACTION_PROMPT : DRAWING_EXTRACTION_PROMPT;

    const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
    const { content: response } = await this.aiChatService.chat(
      messages,
      prompt,
      undefined,
      DRAWING_EXTRACTION_OPTIONS,
    );
    const aiResult = this.parseAiResponse(response);
    return this.buildExtractionResult(aiResult);
  }

  async uploadAttachment(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
    uploadedBy: string | null,
    notes: string | null,
  ): Promise<JobCardAttachment> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const uploadResult = await this.storageService.upload(file, "stock-control/job-card-drawings");

    const saved = await this.attachmentRepo.create({
      jobCardId,
      companyId,
      filePath: uploadResult.path,
      originalFilename: file.originalname,
      fileSizeBytes: file.size,
      mimeType: file.mimetype,
      uploadedBy,
      notes,
      extractionStatus: ExtractionStatus.PENDING,
      extractedData: {},
    });
    this.logger.log(`Uploaded attachment ${saved.id} for job card ${jobCardId}`);

    const signedUrl = await this.storageService.presignedUrl(saved.filePath, 3600);
    return { ...saved, filePath: signedUrl };
  }

  async attachments(companyId: number, jobCardId: number): Promise<JobCardAttachment[]> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const attachmentRecords = await this.attachmentRepo.findForJobCard(jobCardId, companyId);

    const attachmentsWithUrls = await Promise.all(
      attachmentRecords.map(async (attachment) => {
        const normalizedPath = this.normalizeStoragePath(attachment.filePath);
        const signedUrl = await this.storageService.presignedUrl(normalizedPath, 3600);
        return { ...attachment, filePath: signedUrl };
      }),
    );

    return attachmentsWithUrls;
  }

  async attachmentById(
    companyId: number,
    jobCardId: number,
    attachmentId: number,
  ): Promise<JobCardAttachment> {
    const attachment = await this.attachmentRepo.findOneForJobCard(
      attachmentId,
      jobCardId,
      companyId,
    );

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    return attachment;
  }

  async deleteAttachment(
    companyId: number,
    jobCardId: number,
    attachmentId: number,
  ): Promise<void> {
    const attachment = await this.attachmentById(companyId, jobCardId, attachmentId);
    await this.attachmentRepo.removeForCompany(companyId, attachment);
    this.logger.log(`Deleted attachment ${attachmentId} from job card ${jobCardId}`);
  }

  async triggerExtraction(
    companyId: number,
    jobCardId: number,
    attachmentId: number,
  ): Promise<JobCardAttachment> {
    const attachment = await this.attachmentById(companyId, jobCardId, attachmentId);

    attachment.extractionStatus = ExtractionStatus.PROCESSING;
    await this.attachmentRepo.saveForCompany(companyId, attachment);

    try {
      const result = await this.extractFromAttachment(attachment);

      attachment.extractionStatus = ExtractionStatus.ANALYSED;
      attachment.extractedData = result as unknown as Record<string, unknown>;
      attachment.extractedAt = now().toJSDate();
      attachment.extractionError = null;

      const saved = await this.attachmentRepo.saveForCompany(companyId, attachment);
      this.logger.log(
        `Extraction complete for attachment ${attachmentId}: ${result.dimensions.length} dimensions, totalExtM2=${result.totalExternalM2}`,
      );

      await this.updateLineItemsFromExtraction(companyId, jobCardId, result);

      const signedUrl = await this.storageService.presignedUrl(saved.filePath, 3600);
      return { ...saved, filePath: signedUrl };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      attachment.extractionStatus = ExtractionStatus.FAILED;
      attachment.extractionError = message;
      await this.attachmentRepo.saveForCompany(companyId, attachment);
      this.logger.error(`Extraction failed for attachment ${attachmentId}: ${message}`);
      throw err;
    }
  }

  async extractAllFromJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<DrawingExtractionResult> {
    const jobCard = await this.jobCardRepo.findOneForCompany(jobCardId, companyId);

    if (!jobCard) {
      throw new NotFoundException("Job card not found");
    }

    const allAttachments = await this.attachmentRepo.findExtractableForJobCard(
      jobCardId,
      companyId,
      [ExtractionStatus.PENDING, ExtractionStatus.ANALYSED, ExtractionStatus.FAILED],
    );

    if (allAttachments.length === 0) {
      this.logger.log(`No extractable attachments for job card ${jobCardId}`);
      return this.emptyResult();
    }

    await this.attachmentRepo.updateMany(
      allAttachments.map((a) => a.id),
      { extractionStatus: ExtractionStatus.PROCESSING },
    );

    try {
      const contentParts: (TextContent | ImageContent)[] = [];

      const attachmentParts = await allAttachments.reduce(
        async (accPromise, attachment) => {
          const acc = await accPromise;
          const isPdf = this.isPdfFile(attachment);
          const isDxf = this.isDxfFile(attachment);

          if (isPdf) {
            const normalizedPath = this.normalizeStoragePath(attachment.filePath);
            const pdfBuffer = await this.storageService.download(normalizedPath);
            const images = await this.convertPdfToImages(pdfBuffer);
            const imageContents = images.map(
              (img): ImageContent => ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: img.toString("base64"),
                },
              }),
            );
            return [
              ...acc,
              {
                type: "text" as const,
                text: `--- Pages from: ${attachment.originalFilename} ---`,
              },
              ...imageContents,
            ];
          } else if (isDxf) {
            const normalizedPath = this.normalizeStoragePath(attachment.filePath);
            const fileBuffer = await this.storageService.download(normalizedPath);
            const dxfText = this.parseDxfFile(fileBuffer);
            return [
              ...acc,
              {
                type: "text" as const,
                text: `--- DXF data from: ${attachment.originalFilename} ---\n${dxfText}`,
              },
            ];
          }
          return acc;
        },
        Promise.resolve([] as (TextContent | ImageContent)[]),
      );
      contentParts.push(...attachmentParts);

      if (contentParts.length === 0) {
        await this.attachmentRepo.updateMany(
          allAttachments.map((a) => a.id),
          { extractionStatus: ExtractionStatus.PENDING },
        );
        return this.emptyResult();
      }

      contentParts.push({
        type: "text",
        text: "Analyse all the above engineering drawing pages and DXF data. Cross-reference information across documents. Respond with JSON only.",
      });

      const isMultiDoc = allAttachments.length > 1;
      const prompt = isMultiDoc ? MULTI_DOC_EXTRACTION_PROMPT : DRAWING_EXTRACTION_PROMPT;

      const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
      const { content: response } = await this.aiChatService.chat(
        messages,
        prompt,
        undefined,
        DRAWING_EXTRACTION_OPTIONS,
      );
      const aiResult = this.parseAiResponse(response);
      const result = this.buildExtractionResult(aiResult);

      const updateTime = now().toJSDate();
      const updatedAttachments = allAttachments.map((a) => ({
        ...a,
        extractionStatus: ExtractionStatus.ANALYSED,
        extractedData: result as unknown as Record<string, unknown>,
        extractedAt: updateTime,
        extractionError: null,
      }));
      await this.attachmentRepo.saveMany(updatedAttachments);

      await this.updateLineItemsFromExtraction(companyId, jobCardId, result);

      this.logger.log(
        `Multi-doc extraction complete for job card ${jobCardId}: ${allAttachments.length} attachments processed`,
      );

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await this.attachmentRepo.updateMany(
        allAttachments.map((a) => a.id),
        {
          extractionStatus: ExtractionStatus.FAILED,
          extractionError: message,
        },
      );
      this.logger.error(`Multi-doc extraction failed for job card ${jobCardId}: ${message}`);
      throw err;
    }
  }

  private async extractFromAttachment(
    attachment: JobCardAttachment,
  ): Promise<DrawingExtractionResult> {
    const isPdf = this.isPdfFile(attachment);
    const isDxf = this.isDxfFile(attachment);

    if (!isPdf && !isDxf) {
      return this.emptyResult();
    }

    const normalizedPath = this.normalizeStoragePath(attachment.filePath);
    const fileBuffer = await this.storageService.download(normalizedPath);

    if (isDxf) {
      const dxfText = this.parseDxfFile(fileBuffer);
      const messages: ChatMessage[] = [
        {
          role: "user",
          content: `Extract dimensions from this DXF drawing data:\n\n${dxfText}\n\nRespond with JSON only.`,
        },
      ];
      const { content: response } = await this.aiChatService.chat(
        messages,
        DRAWING_EXTRACTION_PROMPT,
        undefined,
        DRAWING_EXTRACTION_OPTIONS,
      );
      const aiResult = this.parseAiResponse(response);
      return this.buildExtractionResult(aiResult);
    }

    const images = await this.convertPdfToImages(fileBuffer);
    const aiResult = await this.extractDimensionsWithVision(images);
    return this.buildExtractionResult(aiResult);
  }

  private async convertPdfToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    this.logger.log("Converting PDF to images for vision extraction...");
    const pdfInput = pdfBuffer.buffer.slice(
      pdfBuffer.byteOffset,
      pdfBuffer.byteOffset + pdfBuffer.byteLength,
    );
    const pages = await pdfToPngOffThread(pdfInput, {
      disableFontFace: true,
      useSystemFonts: true,
      viewportScale: 2.0,
    });
    this.logger.log(`Converted PDF to ${pages.length} image(s)`);

    const allImages = pages
      .filter((page) => page.content != null)
      .map((page) => page.content as Buffer);

    return allImages;
  }

  private async extractLargePdfByChunks(
    images: Buffer[],
    filename: string,
  ): Promise<{
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  }> {
    const chunks = Array.from(
      { length: Math.ceil(images.length / DRAWING_CHUNK_PAGE_COUNT) },
      (_, idx) => ({
        start: idx * DRAWING_CHUNK_PAGE_COUNT,
        images: images.slice(idx * DRAWING_CHUNK_PAGE_COUNT, (idx + 1) * DRAWING_CHUNK_PAGE_COUNT),
      }),
    );

    const results = await chunks.reduce(
      async (accPromise, chunk) => {
        const acc = await accPromise;
        const contentParts: (TextContent | ImageContent)[] = [
          {
            type: "text",
            text: `Pages ${chunk.start + 1}-${chunk.start + chunk.images.length} from ${filename}. Extract every visible BOM row, line item, spool, section, and drawing item on these pages. Do not summarise repeated rows.`,
          },
          ...chunk.images.map(
            (img): ImageContent => ({
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: img.toString("base64"),
              },
            }),
          ),
        ];
        contentParts.push({
          type: "text",
          text: "Return JSON only for these pages.",
        });
        const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
        const { content: response } = await this.aiChatService.chat(
          messages,
          DRAWING_EXTRACTION_PROMPT,
          undefined,
          DRAWING_EXTRACTION_OPTIONS,
        );
        return [...acc, this.parseAiResponse(response)];
      },
      Promise.resolve(
        [] as {
          drawingType: "pipe" | "tank_chute";
          dimensions: ExtractedDimension[];
          tankData: TankExtractionData | null;
          confidence: number;
        }[],
      ),
    );

    return this.mergeChunkResults(results);
  }

  private mergeChunkResults(
    results: {
      drawingType: "pipe" | "tank_chute";
      dimensions: ExtractedDimension[];
      tankData: TankExtractionData | null;
      confidence: number;
    }[],
  ): {
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  } {
    const pipeDimensions = results.flatMap((result) => result.dimensions || []);
    if (pipeDimensions.length > 0) {
      return {
        drawingType: "pipe",
        dimensions: pipeDimensions,
        tankData: null,
        confidence: this.averageConfidence(results),
      };
    }

    const tankResults = results.filter(
      (result): result is typeof result & { tankData: TankExtractionData } =>
        result.drawingType === "tank_chute" && result.tankData !== null,
    );
    if (tankResults.length === 0) {
      return { drawingType: "pipe", dimensions: [], tankData: null, confidence: 0 };
    }

    const first = tankResults[0].tankData;
    return {
      drawingType: "tank_chute",
      dimensions: [],
      tankData: {
        ...first,
        sections: tankResults.flatMap((result) => result.tankData.sections || []),
        plateParts: tankResults.flatMap((result) => result.tankData.plateParts || []),
        components: tankResults.flatMap((result) => result.tankData.components || []),
        liningAreaM2: this.sumNullable(tankResults.map((result) => result.tankData.liningAreaM2)),
        coatingAreaM2: this.sumNullable(tankResults.map((result) => result.tankData.coatingAreaM2)),
      },
      confidence: this.averageConfidence(tankResults),
    };
  }

  private averageConfidence(results: { confidence: number }[]): number {
    if (results.length === 0) {
      return 0;
    }
    return (
      results.reduce((sum, result) => sum + (Number(result.confidence) || 0), 0) / results.length
    );
  }

  private sumNullable(values: Array<number | null>): number | null {
    const numbers = values.filter((value): value is number => typeof value === "number");
    if (numbers.length === 0) {
      return null;
    }
    return numbers.reduce((sum, value) => sum + value, 0);
  }

  private async extractDimensionsWithVision(images: Buffer[]): Promise<{
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  }> {
    if (images.length === 0) {
      return { drawingType: "pipe", dimensions: [], tankData: null, confidence: 0 };
    }

    const contentParts: (TextContent | ImageContent)[] = images.map(
      (img): ImageContent => ({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: img.toString("base64"),
        },
      }),
    );

    contentParts.push({
      type: "text",
      text: "Analyse these engineering drawing pages. Extract all dimensions, BOM data, and specifications. Respond with JSON only.",
    });

    const messages: ChatMessage[] = [{ role: "user", content: contentParts }];
    const { content: response } = await this.aiChatService.chat(
      messages,
      DRAWING_EXTRACTION_PROMPT,
      undefined,
      DRAWING_EXTRACTION_OPTIONS,
    );

    return this.parseAiResponse(response);
  }

  private parseDxfFile(fileBuffer: Buffer): string {
    try {
      const DxfParser = require("dxf-parser");
      const dxfString = fileBuffer.toString("utf-8");
      const parser = new DxfParser();
      const dxf = parser.parseSync(dxfString);

      if (!dxf?.entities) {
        return dxfString.substring(0, 15000);
      }

      const textEntries: string[] = dxf.entities
        .filter((entity: any) => ["TEXT", "MTEXT", "DIMENSION"].includes(entity.type))
        .map((entity: any) => {
          const layer = entity.layer ? `[Layer: ${entity.layer}]` : "";
          const text = entity.text || entity.string || entity.value || "";
          return `${layer} ${text}`.trim();
        })
        .filter((text: string) => text.length > 0);

      const blockRefs: string[] = dxf.entities
        .filter((entity: any) => entity.type === "INSERT")
        .map((entity: any) => `[Block: ${entity.name || "unnamed"}]`);

      const combined = [...textEntries, ...blockRefs].join("\n");
      return combined || dxfString.substring(0, 15000);
    } catch (err) {
      this.logger.warn(
        `DXF parsing failed, using raw text: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      return fileBuffer.toString("utf-8").substring(0, 15000);
    }
  }

  private parseAiResponse(response: string): {
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  } {
    let parsed: Record<string, any>;
    try {
      parsed = parseAiJsonObject(response) as Record<string, any>;
    } catch (err) {
      this.logger.warn(
        `AI drawing JSON parse failed (${err instanceof Error ? err.message : "unknown"}) — returning empty result`,
      );
      return { drawingType: "pipe", dimensions: [], tankData: null, confidence: 0 };
    }
    const drawingType = parsed.drawingType === "tank_chute" ? "tank_chute" : "pipe";

    if (drawingType === "tank_chute" && parsed.tankData) {
      const td = parsed.tankData;
      const tankData: TankExtractionData = {
        assemblyType: td.assemblyType || "custom",
        drawingReference: td.drawingReference || null,
        jobName: td.jobName || null,
        overallLengthMm: td.overallLengthMm ?? null,
        overallWidthMm: td.overallWidthMm ?? null,
        overallHeightMm: td.overallHeightMm ?? null,
        liningType: td.liningType || null,
        liningThicknessMm: td.liningThicknessMm ?? null,
        liningAreaM2: td.liningAreaM2 ?? null,
        coatingAreaM2: td.coatingAreaM2 ?? null,
        coatingSystem: td.coatingSystem || null,
        surfacePrepStandard: td.surfacePrepStandard || null,
        sections: Array.isArray(td.sections)
          ? td.sections.map((s: any) => ({
              mark: s.mark || "",
              description: s.description || "",
              liningAreaM2: s.liningAreaM2 ?? null,
              coatingAreaM2: s.coatingAreaM2 ?? null,
            }))
          : [],
        // Developed flat plate parts — extracted in this single vision call
        // (lengthMm/widthMm are the developed cut sizes, liningThicknessMm the
        // per-plate rubber thickness) so the import needs only ONE call per
        // drawing instead of a second Nix plate take-off.
        plateParts: Array.isArray(td.plateParts)
          ? td.plateParts.map((p: any) => ({
              mark: p.mark || "",
              description: p.description || "",
              thicknessMm: p.thicknessMm ?? 0,
              lengthMm: p.lengthMm ?? 0,
              widthMm: p.widthMm ?? 0,
              quantity: p.quantity ?? 1,
              liningThicknessMm: p.liningThicknessMm ?? 0,
            }))
          : [],
        // Shape-classified components (flat AI fields → nested developed shape) that
        // drive the geometric tank m² and the developed cutting panels. Components
        // with no usable dimensions are dropped during coercion.
        components: this.coerceTankComponents(td.components),
      };

      return {
        drawingType: "tank_chute",
        dimensions: [],
        tankData,
        confidence: parsed.confidence || 0.5,
      };
    }

    const dimensions: ExtractedDimension[] = (parsed.dimensions || []).map((dim: any) => ({
      description: dim.description || "Unknown item",
      diameterMm: dim.diameterMm ?? null,
      lengthM: dim.lengthM ?? null,
      quantity: dim.quantity || 1,
      itemType: dim.itemType || "other",
      externalSurfaceM2: null,
      internalSurfaceM2: null,
    }));

    return {
      drawingType: "pipe",
      dimensions,
      tankData: null,
      confidence: parsed.confidence || 0.5,
    };
  }

  private coerceTankComponents(raw: unknown): TankComponent[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw
      .slice(0, MAX_TANK_COMPONENTS)
      .map((component) => this.coerceTankComponent(component))
      .filter((component): component is TankComponent => component !== null);
  }

  private coerceTankComponent(component: any): TankComponent | null {
    const shape = this.coerceTankComponentShape(component);
    if (!shape) {
      return null;
    }
    return {
      mark: typeof component.mark === "string" ? component.mark.slice(0, 120) : "",
      description:
        typeof component.description === "string" ? component.description.slice(0, 300) : "",
      componentType: this.coerceTankComponentType(component.componentType),
      shape,
      liningType: component.liningType || null,
      liningThicknessMm: finiteInRange(component.liningThicknessMm, MAX_TANK_DIMENSION_MM),
      liningAreaM2: finiteInRange(component.liningAreaM2, MAX_TANK_AREA_M2),
      coatingAreaM2: finiteInRange(component.coatingAreaM2, MAX_TANK_AREA_M2),
      quantity: clampQuantity(component.quantity),
      segmentCount: finiteInRange(component.segmentCount, MAX_TANK_COMPONENT_QUANTITY),
    };
  }

  private coerceTankComponentType(value: unknown): TankComponent["componentType"] {
    return TANK_COMPONENT_TYPES.includes(value as TankComponent["componentType"])
      ? (value as TankComponent["componentType"])
      : "plate";
  }

  private coerceTankComponentShape(component: any): TankComponentShape | null {
    const positive = (value: unknown): number | null => finiteInRange(value, MAX_TANK_DIMENSION_MM);
    const nonNegative = (value: unknown): number =>
      finiteInRange(value, MAX_TANK_DIMENSION_MM) ?? 0;
    const shapeType = component?.shapeType;

    if (shapeType === "rectangle") {
      const widthMm = positive(component.widthMm);
      const heightMm = positive(component.heightMm);
      return widthMm && heightMm ? { type: "rectangle", widthMm, heightMm } : null;
    }
    if (shapeType === "cylinder") {
      const innerDiameterMm = positive(component.innerDiameterMm);
      const heightMm = positive(component.heightMm);
      return innerDiameterMm && heightMm ? { type: "cylinder", innerDiameterMm, heightMm } : null;
    }
    if (shapeType === "cone") {
      const largeDiameterMm = positive(component.largeDiameterMm);
      const slantHeightMm = positive(component.slantHeightMm);
      return largeDiameterMm && slantHeightMm
        ? {
            type: "cone",
            largeDiameterMm,
            smallDiameterMm: nonNegative(component.smallDiameterMm),
            slantHeightMm,
            sweepAngleDegrees: positive(component.sweepAngleDegrees),
          }
        : null;
    }
    if (shapeType === "dished_head") {
      const outerDiameterMm = positive(component.outerDiameterMm);
      return outerDiameterMm
        ? {
            type: "dished_head",
            outerDiameterMm,
            crownRadiusMm: nonNegative(component.crownRadiusMm),
            knuckleRadiusMm: nonNegative(component.knuckleRadiusMm),
          }
        : null;
    }
    if (shapeType === "annular_ring") {
      const outerDiameterMm = positive(component.outerDiameterMm);
      return outerDiameterMm
        ? {
            type: "annular_ring",
            outerDiameterMm,
            innerDiameterMm: nonNegative(component.innerDiameterMm),
          }
        : null;
    }
    if (shapeType === "branch_wrap") {
      const boreDiameterMm = positive(component.boreDiameterMm);
      const lengthMm = positive(component.lengthMm);
      return boreDiameterMm && lengthMm
        ? { type: "branch_wrap", boreDiameterMm, lengthMm, mitred: component.mitred === true }
        : null;
    }
    return null;
  }

  private buildExtractionResult(aiResult: {
    drawingType: "pipe" | "tank_chute";
    dimensions: ExtractedDimension[];
    tankData: TankExtractionData | null;
    confidence: number;
  }): DrawingExtractionResult {
    if (aiResult.drawingType === "tank_chute" && aiResult.tankData) {
      const liningM2 = aiResult.tankData.liningAreaM2 ?? 0;
      const coatingM2 = aiResult.tankData.coatingAreaM2 ?? 0;

      return {
        drawingType: "tank_chute",
        dimensions: [],
        tankData: aiResult.tankData,
        totalExternalM2: coatingM2,
        totalInternalM2: liningM2,
        totalLiningM2: Math.round(liningM2 * 100) / 100,
        totalCoatingM2: Math.round(coatingM2 * 100) / 100,
        rawText: "",
        confidence: aiResult.confidence,
      };
    }

    const dimensionsWithSurface = aiResult.dimensions.map((dim) => this.calculateSurfaceArea(dim));

    const totalExternalM2 = dimensionsWithSurface.reduce(
      (sum, d) => sum + (d.externalSurfaceM2 ?? 0) * d.quantity,
      0,
    );
    const totalInternalM2 = dimensionsWithSurface.reduce(
      (sum, d) => sum + (d.internalSurfaceM2 ?? 0) * d.quantity,
      0,
    );

    return {
      drawingType: "pipe",
      dimensions: dimensionsWithSurface,
      tankData: null,
      totalExternalM2: Math.round(totalExternalM2 * 100) / 100,
      totalInternalM2: Math.round(totalInternalM2 * 100) / 100,
      totalLiningM2: 0,
      totalCoatingM2: 0,
      rawText: "",
      confidence: aiResult.confidence,
    };
  }

  private normalizeStoragePath(pathOrUrl: string): string {
    if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
      const urlWithoutQuery = pathOrUrl.split("?")[0];
      return urlWithoutQuery.replace(/^https?:\/\/[^/]+\//, "");
    }
    return pathOrUrl;
  }

  private isPdfFile(attachment: JobCardAttachment): boolean {
    return (
      attachment.mimeType === "application/pdf" ||
      attachment.originalFilename.toLowerCase().endsWith(".pdf")
    );
  }

  private isDxfFile(attachment: JobCardAttachment): boolean {
    return (
      attachment.mimeType === "application/dxf" ||
      attachment.mimeType === "application/x-dxf" ||
      attachment.originalFilename.toLowerCase().endsWith(".dxf")
    );
  }

  private emptyResult(): DrawingExtractionResult {
    return {
      drawingType: "pipe",
      dimensions: [],
      tankData: null,
      totalExternalM2: 0,
      totalInternalM2: 0,
      totalLiningM2: 0,
      totalCoatingM2: 0,
      rawText: "",
      confidence: 0,
    };
  }

  private calculateSurfaceArea(dim: ExtractedDimension): ExtractedDimension {
    if (!dim.diameterMm || !dim.lengthM) {
      return dim;
    }

    const diameterM = dim.diameterMm / 1000;
    const circumference = Math.PI * diameterM;
    const externalSurfaceM2 = circumference * dim.lengthM;

    const wallThicknessMm = this.estimateWallThickness(dim.diameterMm);
    const internalDiameterM = (dim.diameterMm - 2 * wallThicknessMm) / 1000;
    const internalCircumference = Math.PI * internalDiameterM;
    const internalSurfaceM2 = internalCircumference * dim.lengthM;

    return {
      ...dim,
      externalSurfaceM2: Math.round(externalSurfaceM2 * 100) / 100,
      internalSurfaceM2: Math.round(internalSurfaceM2 * 100) / 100,
    };
  }

  private estimateWallThickness(diameterMm: number): number {
    if (diameterMm <= 50) return 3.2;
    if (diameterMm <= 100) return 4.5;
    if (diameterMm <= 200) return 6.3;
    if (diameterMm <= 400) return 8.0;
    if (diameterMm <= 600) return 9.5;
    return 12.7;
  }

  private async updateLineItemsFromExtraction(
    companyId: number,
    jobCardId: number,
    result: DrawingExtractionResult,
  ): Promise<void> {
    if (result.drawingType === "tank_chute" && result.tankData) {
      await this.createTankLineItems(companyId, jobCardId, result);
      return;
    }

    if (result.dimensions.length === 0) {
      return;
    }

    const lineItems = await this.lineItemRepo.findForJobCardOrderedBySort(jobCardId, companyId);

    if (lineItems.length === 0) {
      return;
    }

    const updatedItems: JobCardLineItem[] = [];

    lineItems.forEach((lineItem) => {
      const description = (lineItem.itemDescription || "").toLowerCase();
      const matchedDim = this.findMatchingDimension(description, result.dimensions);

      if (matchedDim?.externalSurfaceM2) {
        lineItem.m2 = Math.round(matchedDim.externalSurfaceM2 * 10000) / 10000;
        updatedItems.push(lineItem);
      }
    });

    if (updatedItems.length > 0) {
      await this.lineItemRepo.saveMany(updatedItems);
      this.logger.log(
        `Updated ${updatedItems.length} line items with m² from extraction for job card ${jobCardId}`,
      );
    }
  }

  private async createTankLineItems(
    companyId: number,
    jobCardId: number,
    result: DrawingExtractionResult,
  ): Promise<void> {
    const tankData = result.tankData;
    if (!tankData) return;

    const existingItems = await this.lineItemRepo.findForJobCardOrderedBySort(jobCardId, companyId);

    const maxSortOrder = existingItems.reduce((max, item) => Math.max(max, item.sortOrder), 0);

    const assemblyLabel =
      tankData.assemblyType.charAt(0).toUpperCase() + tankData.assemblyType.slice(1);
    const drawingRef = tankData.drawingReference ? ` (${tankData.drawingReference})` : "";
    const liningSpec = [
      tankData.liningType || null,
      tankData.liningThicknessMm ? `${tankData.liningThicknessMm}mm` : null,
    ]
      .filter(Boolean)
      .join(" ");

    const newItems: Partial<JobCardLineItem>[] =
      tankData.sections.length > 0
        ? tankData.sections.reduce(
            (acc, section) => {
              const sectionLabel = `Section ${section.mark}${section.description ? ` - ${section.description}` : ""}`;

              const liningItem =
                section.liningAreaM2 && section.liningAreaM2 > 0
                  ? [
                      {
                        jobCardId,
                        companyId,
                        itemDescription: [
                          `${assemblyLabel} ${sectionLabel} - R/L${drawingRef}`,
                          liningSpec || null,
                        ]
                          .filter(Boolean)
                          .join(" - "),
                        itemCode: `R/L ${section.mark}`,
                        quantity: 1,
                        m2: Math.round(section.liningAreaM2 * 100) / 100,
                        sortOrder: acc.nextOrder,
                      },
                    ]
                  : [];

              const coatingItem =
                section.coatingAreaM2 && section.coatingAreaM2 > 0
                  ? [
                      {
                        jobCardId,
                        companyId,
                        itemDescription: [
                          `${assemblyLabel} ${sectionLabel} - External Coating${drawingRef}`,
                          tankData.coatingSystem || null,
                          tankData.surfacePrepStandard
                            ? `Prep: ${tankData.surfacePrepStandard}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" - "),
                        itemCode: `COAT ${section.mark}`,
                        quantity: 1,
                        m2: Math.round(section.coatingAreaM2 * 100) / 100,
                        sortOrder: acc.nextOrder + liningItem.length,
                      },
                    ]
                  : [];

              return {
                items: [...acc.items, ...liningItem, ...coatingItem],
                nextOrder: acc.nextOrder + liningItem.length + coatingItem.length,
              };
            },
            { items: [] as Partial<JobCardLineItem>[], nextOrder: maxSortOrder + 1 },
          ).items
        : [
            ...(tankData.liningAreaM2 && tankData.liningAreaM2 > 0
              ? [
                  {
                    jobCardId,
                    companyId,
                    itemDescription: [
                      `${assemblyLabel} Internal Lining${drawingRef}`,
                      tankData.liningType ? `Type: ${tankData.liningType}` : null,
                      tankData.liningThicknessMm ? `${tankData.liningThicknessMm}mm thick` : null,
                    ]
                      .filter(Boolean)
                      .join(" - "),
                    itemCode: tankData.drawingReference || null,
                    quantity: 1,
                    m2: Math.round(tankData.liningAreaM2 * 100) / 100,
                    sortOrder: maxSortOrder + 1,
                  },
                ]
              : []),
            ...(tankData.coatingAreaM2 && tankData.coatingAreaM2 > 0
              ? [
                  {
                    jobCardId,
                    companyId,
                    itemDescription: [
                      `${assemblyLabel} External Coating${drawingRef}`,
                      tankData.coatingSystem || null,
                      tankData.surfacePrepStandard ? `Prep: ${tankData.surfacePrepStandard}` : null,
                    ]
                      .filter(Boolean)
                      .join(" - "),
                    itemCode: tankData.drawingReference || null,
                    quantity: 1,
                    m2: Math.round(tankData.coatingAreaM2 * 100) / 100,
                    sortOrder:
                      maxSortOrder +
                      1 +
                      (tankData.liningAreaM2 && tankData.liningAreaM2 > 0 ? 1 : 0),
                  },
                ]
              : []),
          ];

    if (newItems.length > 0) {
      const plateBom = tankData.plateParts.length > 0 ? tankData.plateParts : null;
      const tankComponents = tankData.components.length > 0 ? tankData.components : null;
      const liningIndex = newItems.findIndex(
        (item) =>
          item.itemCode?.startsWith("R/L") || /Lining|R\/L/i.test(item.itemDescription || ""),
      );
      const carrierIndex = liningIndex >= 0 ? liningIndex : 0;
      const enriched =
        plateBom || tankComponents
          ? newItems.map((item, idx) =>
              idx === carrierIndex ? { ...item, plateBom, tankComponents } : item,
            )
          : newItems;
      const created = this.lineItemRepo.buildMany(enriched);
      await this.lineItemRepo.saveMany(created);
      this.logger.log(
        `Created ${enriched.length} tank line items for job card ${jobCardId} (lining: ${tankData.liningAreaM2 ?? 0} m², coating: ${tankData.coatingAreaM2 ?? 0} m², components: ${tankComponents?.length ?? 0}, plates: ${plateBom?.length ?? 0})`,
      );
    }
  }

  private findMatchingDimension(
    lineItemDescription: string,
    dimensions: ExtractedDimension[],
  ): ExtractedDimension | null {
    const nbMatch = lineItemDescription.match(/(\d+)\s*nb/i);
    const lineItemNb = nbMatch ? parseInt(nbMatch[1], 10) : null;

    const isBend = /bend/i.test(lineItemDescription);
    const isPipe = /pipe|straight/i.test(lineItemDescription);
    const isTee = /tee/i.test(lineItemDescription);
    const isReducer = /reducer/i.test(lineItemDescription);

    const lineItemType = isBend
      ? "bend"
      : isPipe
        ? "pipe"
        : isTee
          ? "tee"
          : isReducer
            ? "reducer"
            : null;

    const matches = dimensions.filter((dim) => {
      if (lineItemNb && dim.diameterMm) {
        const dimNb = dim.diameterMm;
        if (Math.abs(dimNb - lineItemNb) > 25) {
          return false;
        }
      }

      if (lineItemType && dim.itemType) {
        if (dim.itemType.toLowerCase() !== lineItemType) {
          return false;
        }
      }

      return true;
    });

    return matches.length > 0 ? matches[0] : dimensions.length > 0 ? dimensions[0] : null;
  }
}
