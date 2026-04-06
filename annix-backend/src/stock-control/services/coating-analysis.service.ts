import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { IStorageService, STORAGE_SERVICE, StorageArea } from "../../storage/storage.interface";
import { lookupCoatingProduct } from "../config/coating-products";
import {
  CoatDetail,
  CoatingAnalysisStatus,
  JobCardCoatingAnalysis,
  StockAssessmentItem,
} from "../entities/coating-analysis.entity";
import { CustomerPurchaseOrder } from "../entities/customer-purchase-order.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardExtractionCorrection } from "../entities/job-card-extraction-correction.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockItem } from "../entities/stock-item.entity";
import { INVALID_LINE_ITEM_PATTERNS } from "../lib/line-item-validation";
import {
  validateCoatingExtraction,
  validPercentage,
  validPositiveNumber,
  validString,
} from "./extraction-validation";
import { sanitizeNotes } from "./job-card-import.service";
import { M2CalculationService } from "./m2-calculation.service";

interface AiCoatResult {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
  coatRole?: "primer" | "intermediate" | "final";
  minDftUm: number;
  maxDftUm: number;
  solidsByVolumePercent: number;
}

interface AiExtractionResult {
  applicationType: string;
  surfacePrep: string | null;
  coats: AiCoatResult[];
}

const DEFAULT_SOLIDS_BY_VOLUME = 60;
const DEFAULT_DFT_UM = 125;

const COATING_SYSTEM_PROMPT = `You are an industrial coating specification parser. Extract coating details from job card notes.

The notes typically follow this format:
EXT : BLAST & PAINT [PRODUCT] [COLOR] @ [DFT RANGE]um + [PRODUCT] [COLOR] @ [DFT RANGE]um
INT : [SIMILAR FORMAT]

Return JSON only with this structure:
{
  "applicationType": "external" | "internal" | "both",
  "surfacePrep": "blast" | "sa3_blast" | "sa2_5_blast" | "sa2_blast" | "sa1_blast" | "hand_tool" | "power_tool" | "no_blasting" | null,
  "coats": [
    {
      "product": "PENGUARD EXPRESS MIO BUFF",
      "genericType": "epoxy_mio" | "polyurethane" | "zinc_rich" | "epoxy" | "alkyd" | "inorganic_zinc" | "acrylic" | "unknown",
      "area": "external" | "internal",
      "coatRole": "primer" | "intermediate" | "final",
      "minDftUm": 240,
      "maxDftUm": 250,
      "solidsByVolumePercent": 65
    }
  ]
}

Rules:
- Extract ALL coats mentioned (separated by + or similar delimiters)
- Parse DFT ranges like "240-250um" or "70-85um" into min/max values
- The um symbol may appear as "um", "μm", or "microns"
- Identify generic type from product name (e.g. "HARDTOP" products are typically polyurethane, "PENGUARD" is typically epoxy)
- Estimate solidsByVolumePercent based on generic type if not specified:
  - epoxy_mio: 65, epoxy: 70, polyurethane: 55, zinc_rich: 75, alkyd: 50, inorganic_zinc: 80, acrylic: 45, unknown: 60
- Tag each coat with "area": "external" for coats under EXT section, "internal" for coats under INT section
- If notes mention both EXT and INT, set applicationType to "both" and include all coats with their respective area tags
- Surface prep: look for "BLAST", "HAND TOOL", "POWER TOOL", "NO BLAST", "NO BLASTING" keywords. If internal rubber lining (R/L) is specified, surface prep is "sa3_blast" (SA3 abrasive blast required before rubber lining). If "NO BLAST" or "NO BLASTING" is specified, surface prep is "no_blasting"
- "R/L" or "RUBBER LINING" in INT section means internal rubber lining — set applicationType to "both" but DO NOT include rubber as a coat entry. Rubber lining is not paint.
- NEVER include rubber lining products (identified by keywords: R/L, SHORE, RUBBER, LINING, LINER, LAGGING) in the coats array — only include paint/coating products
- coatRole: Assign based on the coat's position in the system for each area (external/internal separately). First coat = "primer", last coat = "final", any coat between = "intermediate". For single-coat systems the only coat is both primer and final — use "primer". For two-coat systems: first = "primer", second = "final". For three+ coat systems: first = "primer", middle coats = "intermediate", last = "final".
- Return valid JSON only, no additional text`;

@Injectable()
export class CoatingAnalysisService {
  private readonly logger = new Logger(CoatingAnalysisService.name);

  constructor(
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly analysisRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(JobCard)
    private readonly jobCardRepo: Repository<JobCard>,
    @InjectRepository(JobCardLineItem)
    private readonly lineItemRepo: Repository<JobCardLineItem>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    @InjectRepository(StockControlCompany)
    private readonly companyRepo: Repository<StockControlCompany>,
    @InjectRepository(JobCardExtractionCorrection)
    private readonly correctionRepo: Repository<JobCardExtractionCorrection>,
    @InjectRepository(CustomerPurchaseOrder)
    private readonly cpoRepo: Repository<CustomerPurchaseOrder>,
    private readonly aiChatService: AiChatService,
    private readonly m2CalculationService: M2CalculationService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
  ) {}

  async analyseJobCards(jobCardIds: number[], companyId: number): Promise<void> {
    const results = await Promise.allSettled(
      jobCardIds.map((jobCardId) => this.analyseJobCard(jobCardId, companyId)),
    );
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        const message = result.reason instanceof Error ? result.reason.message : "Unknown error";
        this.logger.error(`Coating analysis failed for job card ${jobCardIds[idx]}: ${message}`);
      }
    });
  }

  async analyseJobCard(jobCardId: number, companyId: number): Promise<JobCardCoatingAnalysis> {
    const existing = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    const analysis =
      existing ??
      this.analysisRepo.create({
        jobCardId,
        companyId,
        status: CoatingAnalysisStatus.PENDING,
      });

    if (!existing) {
      await this.analysisRepo.save(analysis);
    }

    try {
      const jobCard = await this.jobCardRepo.findOne({
        where: { id: jobCardId, companyId },
      });

      if (!jobCard) {
        return this.markFailed(analysis, `Job card ${jobCardId} not found`);
      }

      const allLineItems = await this.lineItemRepo.find({
        where: { jobCardId, companyId },
      });

      const junkItemIds = allLineItems
        .filter((li) => {
          const code = (li.itemCode || "").trim();
          const desc = (li.itemDescription || "").trim();
          const texts = [code, desc].filter(Boolean);
          return texts.some((t) => INVALID_LINE_ITEM_PATTERNS.some((p) => p.test(t)));
        })
        .map((li) => li.id);

      if (junkItemIds.length > 0) {
        await this.lineItemRepo.delete(junkItemIds);
        this.logger.log(
          `Removed ${junkItemIds.length} junk line item(s) from job card ${jobCardId}`,
        );
      }

      const lineItems = allLineItems.filter((li) => !junkItemIds.includes(li.id));

      const PIPE_ITEM_PATTERN =
        /(?:\d+\s*NB|NB\s*\d+|^\d{2,4}\s*x\s*\d{2,4}\b|\bPIPE\b|\bBEND\b|\bELBOW\b|\bTEE\b|\bT[- ]?PIECE\b|\bREDUCER\b|\bLATERAL\b|\bFLANGE\b|\bOFFSET\b|\bVALVE\b|\bSCH(?:EDULE)?\s*\d+|\d+\s*LG\b)/i;
      const hasMissingM2 = lineItems.some((li) => {
        const desc = li.itemDescription || li.itemCode || "";
        return PIPE_ITEM_PATTERN.test(desc) && (li.m2 === null || li.m2 === 0);
      });

      let calculatedExtM2 = 0;
      let calculatedIntM2 = 0;

      if (hasMissingM2) {
        const calculated = await this.calculatePipeM2(lineItems);
        calculatedExtM2 = calculated.extM2;
        calculatedIntM2 = calculated.intM2;
      }

      const lineItemTotalM2 = this.sumLineItemM2WithQuantity(lineItems);
      const paintM2 = this.sumPaintM2(lineItems);

      const SPEC_NOTE_PATTERN =
        /INT\s*:|EXT\s*:|R\/L|rubber|lining|lagging|shore|paint|blast|coat|primer|oxide|epoxy|polyurethane|zinc|silicate|nitrile|neoprene|butadiene|\bROT\b/i;
      const noteLineItems = lineItems
        .filter((li) => {
          const code = (li.itemCode || "").trim();
          const hasNoData =
            !li.itemDescription &&
            !li.itemNo &&
            !li.jtNo &&
            (li.quantity === null || Number.isNaN(li.quantity));
          return hasNoData && (code.length > 60 || SPEC_NOTE_PATTERN.test(code));
        })
        .map((li) => (li.itemCode || "").trim());
      const lineItemNotes = [
        ...new Set(lineItems.map((li) => (li.notes || "").trim()).filter((n) => n.length > 0)),
      ];

      const DESCRIPTION_RUBBER_PATTERN = /\bROT\b|\bR\/L\b|\brubber\b/i;
      const DESCRIPTION_PAINT_PATTERN =
        /\bpaint\b|\bblast\b|\bcoat(?:ing)?\b|\bprimer\b|\bepoxy\b/i;
      const allDescriptions = lineItems
        .map((li) => (li.itemDescription || "").trim())
        .filter(Boolean);
      const descriptionHasRubber = allDescriptions.some((d) => DESCRIPTION_RUBBER_PATTERN.test(d));
      const descriptionHasPaint = allDescriptions.some((d) => DESCRIPTION_PAINT_PATTERN.test(d));

      const combinedNotes =
        sanitizeNotes(
          [jobCard.notes || "", ...noteLineItems, ...lineItemNotes].filter(Boolean).join("\n"),
        ) || "";
      analysis.rawNotes = combinedNotes || sanitizeNotes(jobCard.notes);

      if (!combinedNotes.trim() && !descriptionHasRubber && !descriptionHasPaint) {
        analysis.extM2 = 0;
        analysis.intM2 = 0;
        analysis.hasInternalLining = false;
        analysis.status = CoatingAnalysisStatus.ANALYSED;
        analysis.coats = [];
        analysis.stockAssessment = [];
        analysis.analysedAt = now().toJSDate();
        return this.analysisRepo.save(analysis);
      }

      const correctionHints = await this.correctionHintsForCustomer(
        companyId,
        jobCard.customerName,
      );
      const aiResult = combinedNotes.trim()
        ? await this.extractCoatingSpec(combinedNotes, correctionHints)
        : {
            applicationType: descriptionHasRubber ? "internal" : "external",
            surfacePrep: null,
            coats: [] as AiCoatResult[],
          };

      const hasInternalRubberLining =
        /INT\s*:\s*R\/L/i.test(combinedNotes) ||
        /\bR\/L\b/i.test(combinedNotes) ||
        /\brubber\s+lin(?:ing|er)\b/i.test(combinedNotes) ||
        /\bINT\s*:.*(?:rubber|lining|lagging|nitrile|neoprene|butadiene)/i.test(combinedNotes) ||
        /\bROT\b/i.test(combinedNotes) ||
        descriptionHasRubber;
      analysis.applicationType = aiResult.applicationType;
      analysis.surfacePrep = hasInternalRubberLining ? "sa3_blast" : aiResult.surfacePrep;
      analysis.extSurfacePrep = aiResult.surfacePrep;
      analysis.intSurfacePrep = hasInternalRubberLining ? "sa3_blast" : aiResult.surfacePrep;
      analysis.hasInternalLining = hasInternalRubberLining;

      const hasExt = aiResult.coats.some((c) => c.area === "external");
      const hasInt = aiResult.coats.some((c) => c.area === "internal");
      const needsIntM2 = hasInt || hasInternalRubberLining;

      if (lineItemTotalM2 > 0) {
        analysis.extM2 = hasExt ? lineItemTotalM2 : 0;
        analysis.intM2 = needsIntM2 ? lineItemTotalM2 : 0;
      } else if (paintM2 > 0) {
        analysis.extM2 = hasExt ? paintM2 : 0;
        analysis.intM2 = needsIntM2 ? paintM2 : 0;
      } else if (calculatedExtM2 > 0 || calculatedIntM2 > 0) {
        analysis.extM2 = hasExt ? calculatedExtM2 : 0;
        analysis.intM2 = needsIntM2 ? calculatedIntM2 : 0;
      } else {
        analysis.extM2 = 0;
        analysis.intM2 = 0;
      }

      const retentionFactor = await this.lossFactorForCompany(companyId);
      const dedupedAiCoats = aiResult.coats.reduce<typeof aiResult.coats>((acc, coat) => {
        const exists = acc.find((c) => c.product === coat.product && c.area === coat.area);
        return exists ? acc : [...acc, coat];
      }, []);
      const coatsWithRoles = CoatingAnalysisService.inferCoatRoles(dedupedAiCoats);
      const coats = coatsWithRoles.map((coat) => {
        const m2ForCoat = coat.area === "internal" ? analysis.intM2 : analysis.extM2;
        return this.calculateCoatVolume(coat, m2ForCoat, retentionFactor);
      });
      analysis.coats = coats;

      const stockAssessment = await this.assessStock(coats, companyId);
      analysis.stockAssessment = stockAssessment;

      analysis.status = CoatingAnalysisStatus.ANALYSED;
      analysis.analysedAt = now().toJSDate();
      analysis.error = null;

      const saved = await this.analysisRepo.save(analysis);
      this.logger.log(
        `Coating analysis complete for job card ${jobCardId}: ${coats.length} coat(s), extM2=${analysis.extM2}, intM2=${analysis.intM2}`,
      );
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return this.markFailed(analysis, message);
    }
  }

  async findByJobCard(
    companyId: number,
    jobCardId: number,
  ): Promise<JobCardCoatingAnalysis | null> {
    return this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });
  }

  async updateSurfacePrep(
    companyId: number,
    jobCardId: number,
    updates: { extSurfacePrep?: string; intSurfacePrep?: string },
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    if (updates.extSurfacePrep !== undefined) {
      analysis.extSurfacePrep = updates.extSurfacePrep || null;
    }
    if (updates.intSurfacePrep !== undefined) {
      analysis.intSurfacePrep = updates.intSurfacePrep || null;
    }
    analysis.surfacePrep = analysis.extSurfacePrep || analysis.intSurfacePrep;
    return this.analysisRepo.save(analysis);
  }

  async updateSurfaceArea(
    companyId: number,
    jobCardId: number,
    extM2: number,
    intM2: number,
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    analysis.extM2 = extM2;
    analysis.intM2 = intM2;

    const retentionFactor = await this.lossFactorForCompany(companyId);
    const coats = (analysis.coats || []).map((coat) => {
      const m2ForCoat = coat.area === "internal" ? intM2 : extM2;
      return this.calculateCoatVolume(coat, m2ForCoat, retentionFactor);
    });
    analysis.coats = coats;

    const stockAssessment = await this.assessStock(coats, companyId);
    analysis.stockAssessment = stockAssessment;

    return this.analysisRepo.save(analysis);
  }

  async updateCoat(
    companyId: number,
    jobCardId: number,
    coatIndex: number,
    updates: { minDftUm?: number; maxDftUm?: number },
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    const coats = analysis.coats || [];
    if (coatIndex < 0 || coatIndex >= coats.length) {
      throw new NotFoundException(`Coat index ${coatIndex} out of range`);
    }

    const coat = coats[coatIndex];
    if (updates.minDftUm !== undefined) coat.minDftUm = updates.minDftUm;
    if (updates.maxDftUm !== undefined) coat.maxDftUm = updates.maxDftUm;

    const retentionFactor = await this.lossFactorForCompany(companyId);
    const m2ForCoat = coat.area === "internal" ? analysis.intM2 : analysis.extM2;
    coats[coatIndex] = this.calculateCoatVolume(coat, m2ForCoat, retentionFactor);
    analysis.coats = coats;

    const stockAssessment = await this.assessStock(coats, companyId);
    analysis.stockAssessment = stockAssessment;

    return this.analysisRepo.save(analysis);
  }

  async removeCoat(
    companyId: number,
    jobCardId: number,
    coatIndex: number,
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    const coats = analysis.coats || [];
    if (coatIndex < 0 || coatIndex >= coats.length) {
      throw new NotFoundException(`Coat index ${coatIndex} out of range`);
    }

    analysis.coats = [...coats.slice(0, coatIndex), ...coats.slice(coatIndex + 1)];

    const stockAssessment = await this.assessStock(analysis.coats, companyId);
    analysis.stockAssessment = stockAssessment;

    return this.analysisRepo.save(analysis);
  }

  async unverifiedProducts(
    companyId: number,
    jobCardId: number,
  ): Promise<{ product: string; genericType: string | null; estimatedVolumeSolids: number }[]> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      return [];
    }

    return (analysis.coats || [])
      .filter((coat) => !coat.verified)
      .map((coat) => ({
        product: coat.product,
        genericType: coat.genericType,
        estimatedVolumeSolids: coat.solidsByVolumePercent,
      }));
  }

  async verifyFromTds(
    companyId: number,
    jobCardId: number,
    file: Express.Multer.File,
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    const unverified = (analysis.coats || []).filter((coat) => !coat.verified);
    if (unverified.length === 0) {
      return analysis;
    }

    const storagePath = `${StorageArea.STOCK_CONTROL}/coating-tds/company-${companyId}/job-${jobCardId}`;
    const stored = await this.storageService.upload(file, storagePath);

    const productNames = unverified.map((c) => c.product).join(", ");
    const tdsBase64 = file.buffer.toString("base64");

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: tdsBase64 },
          },
          {
            type: "text",
            text: `Extract the volume solids percentage from this Technical Data Sheet (TDS) PDF. I need the volume solids for: ${productNames}.\n\nReturn JSON only:\n{ "products": [{ "product": "Product Name", "volumeSolidsPercent": 85 }] }\n\nRules:\n- Look for "Volume Solids", "Solids by Volume", or similar in the datasheet\n- The value is typically a percentage (e.g., 85%, 72%)\n- Match each product name to the closest product found in the TDS\n- Return valid JSON only, no additional text`,
          },
        ],
      },
    ];

    const { content: response } = await this.aiChatService.chat(
      messages,
      "You are a technical data sheet parser. Extract volume solids data accurately.",
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract volume solids from the uploaded TDS");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const tdsProducts: { product: string; volumeSolidsPercent: number }[] = parsed.products || [];

    const retentionFactor = await this.lossFactorForCompany(companyId);
    const updatedCoats = analysis.coats.map((coat) => {
      if (coat.verified) {
        return coat;
      }

      const tdsMatch = tdsProducts.find((tp) => {
        const tpNorm = tp.product.toLowerCase().replace(/[^a-z0-9]/g, "");
        const coatNorm = coat.product.toLowerCase().replace(/[^a-z0-9]/g, "");
        return tpNorm.includes(coatNorm) || coatNorm.includes(tpNorm);
      });

      if (!tdsMatch) {
        return coat;
      }

      const midDftUm = (coat.minDftUm + coat.maxDftUm) / 2;
      const volumeSolids = tdsMatch.volumeSolidsPercent;
      const pipingLossFactor = retentionFactor;
      const coverageM2PerLiter =
        midDftUm > 0 ? ((volumeSolids * 10) / midDftUm) * pipingLossFactor : 0;
      const m2ForCoat = coat.area === "internal" ? analysis.intM2 : analysis.extM2;
      const litersRequired =
        coverageM2PerLiter > 0 ? Math.ceil((m2ForCoat / coverageM2PerLiter) * 10) / 10 : 0;

      this.logger.log(
        `TDS verified "${coat.product}" — vol solids: ${volumeSolids}% (was ${coat.solidsByVolumePercent}%)`,
      );

      return {
        ...coat,
        solidsByVolumePercent: volumeSolids,
        coverageM2PerLiter: Math.round(coverageM2PerLiter * 100) / 100,
        litersRequired,
        verified: true,
        tdsFilePath: stored.path,
      };
    });

    analysis.coats = updatedCoats;

    const stockAssessment = await this.assessStock(updatedCoats, companyId);
    analysis.stockAssessment = stockAssessment;

    return this.analysisRepo.save(analysis);
  }

  async acceptRecommendation(
    companyId: number,
    jobCardId: number,
    acceptedBy: string,
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    analysis.status = CoatingAnalysisStatus.ACCEPTED;
    analysis.acceptedBy = acceptedBy;
    analysis.acceptedAt = now().toJSDate();

    return this.analysisRepo.save(analysis);
  }

  private sumPaintM2(lineItems: JobCardLineItem[]): number {
    return lineItems
      .filter((li) => li.itemCode && /paint/i.test(li.itemCode))
      .reduce((sum, li) => {
        const m2 = Number(li.m2) || 0;
        const qty = Number(li.quantity) || 1;
        return sum + m2 * qty;
      }, 0);
  }

  private sumLineItemM2WithQuantity(lineItems: JobCardLineItem[]): number {
    return lineItems.reduce((sum, li) => {
      const m2 = Number(li.m2) || 0;
      const qty = Number(li.quantity) || 1;
      return sum + m2 * qty;
    }, 0);
  }

  async recalculateLineItemM2(companyId: number, jobCardId: number): Promise<JobCardLineItem[]> {
    const lineItems = await this.lineItemRepo.find({
      where: { jobCardId, companyId },
    });

    const PIPE_ITEM_PATTERN =
      /(?:\d+\s*NB|NB\s*\d+|^\d{2,4}\s*x\s*\d{2,4}\b|\bPIPE\b|\bBEND\b|\bELBOW\b|\bTEE\b|\bT[- ]?PIECE\b|\bREDUCER\b|\bLATERAL\b|\bFLANGE\b|\bOFFSET\b|\bVALVE\b|\bSCH(?:EDULE)?\s*\d+|\d+\s*LG\b)/i;
    const pipeItems = lineItems.filter((li) => {
      const desc = li.itemDescription || li.itemCode || "";
      return PIPE_ITEM_PATTERN.test(desc);
    });

    if (pipeItems.length === 0) {
      return lineItems;
    }

    const descriptions = pipeItems.map((li) => li.itemDescription || li.itemCode || "");
    const results = await this.m2CalculationService.calculateM2ForItems(descriptions);

    const itemsToUpdate: JobCardLineItem[] = [];
    pipeItems.forEach((li, idx) => {
      const result = results[idx];
      if (result.externalM2 && result.externalM2 > 0) {
        li.m2 = Math.round(result.externalM2 * 10000) / 10000;
        itemsToUpdate.push(li);
      }
    });

    if (itemsToUpdate.length > 0) {
      await this.lineItemRepo.save(itemsToUpdate);
      this.logger.log(
        `Force-recalculated m² on ${itemsToUpdate.length} line item(s) for job card ${jobCardId}`,
      );
    }

    return await this.lineItemRepo.find({
      where: { jobCardId, companyId },
    });
  }

  private async calculatePipeM2(
    lineItems: JobCardLineItem[],
  ): Promise<{ extM2: number; intM2: number }> {
    const PIPE_ITEM_PATTERN =
      /(?:\d+\s*NB|NB\s*\d+|^\d{2,4}\s*x\s*\d{2,4}\b|\bPIPE\b|\bBEND\b|\bELBOW\b|\bTEE\b|\bT[- ]?PIECE\b|\bREDUCER\b|\bLATERAL\b|\bFLANGE\b|\bOFFSET\b|\bVALVE\b|\bSCH(?:EDULE)?\s*\d+|\d+\s*LG\b)/i;
    const pipeItems = lineItems.filter((li) => {
      const desc = li.itemDescription || li.itemCode || "";
      return PIPE_ITEM_PATTERN.test(desc);
    });

    if (pipeItems.length === 0) {
      return { extM2: 0, intM2: 0 };
    }

    const descriptions = pipeItems.map((li) => li.itemDescription || li.itemCode || "");
    const results = await this.m2CalculationService.calculateM2ForItems(descriptions);

    const itemsToUpdate: JobCardLineItem[] = [];
    const totals = pipeItems.reduce(
      (acc, li, idx) => {
        const result = results[idx];
        const qty = Number(li.quantity) || 1;
        const ext = (result.externalM2 || 0) * qty;
        const int = (result.internalM2 || 0) * qty;

        if (result.externalM2 && result.externalM2 > 0) {
          const calculated = Math.round(result.externalM2 * 10000) / 10000;
          if (li.m2 !== calculated) {
            li.m2 = calculated;
            itemsToUpdate.push(li);
          }
        }

        return { extM2: acc.extM2 + ext, intM2: acc.intM2 + int };
      },
      { extM2: 0, intM2: 0 },
    );

    if (itemsToUpdate.length > 0) {
      await this.lineItemRepo.save(itemsToUpdate);
      this.logger.log(
        `Updated m² on ${itemsToUpdate.length} line item(s) from pipe dimension calculation`,
      );
    }

    return totals;
  }

  private async extractCoatingSpec(
    notes: string,
    correctionHints: string | null,
  ): Promise<AiExtractionResult> {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Parse the following job card coating notes and extract the coating specification:\n\n"${notes}"\n\nRespond with JSON only.`,
      },
    ];

    const systemPrompt = correctionHints
      ? `${COATING_SYSTEM_PROMPT}\n\n${correctionHints}`
      : COATING_SYSTEM_PROMPT;

    const { content: response } = await this.aiChatService.chat(messages, systemPrompt);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON");
    }

    const validated = validateCoatingExtraction(JSON.parse(jsonMatch[0]));

    const RUBBER_PATTERN = /\br\/l\b|rubber|shore|lining|liner|lagging|\brot\b/i;

    const VALID_COAT_ROLES = ["primer", "intermediate", "final"] as const;
    const parseCoatRole = (val: unknown): "primer" | "intermediate" | "final" | undefined =>
      typeof val === "string" &&
      VALID_COAT_ROLES.includes(val as "primer" | "intermediate" | "final")
        ? (val as "primer" | "intermediate" | "final")
        : undefined;

    const allCoats = validated.coats.map((coat: Record<string, unknown>) => ({
      product: validString(coat.product, "Unknown"),
      genericType: validString(coat.genericType, "unknown"),
      area: coat.area === "internal" ? ("internal" as const) : ("external" as const),
      coatRole: parseCoatRole(coat.coatRole),
      minDftUm: validPositiveNumber(coat.minDftUm, 0),
      maxDftUm: validPositiveNumber(coat.maxDftUm, 0),
      solidsByVolumePercent: validPercentage(coat.solidsByVolumePercent, DEFAULT_SOLIDS_BY_VOLUME),
    }));

    const paintCoats = allCoats.filter((coat: AiCoatResult) => !RUBBER_PATTERN.test(coat.product));

    return {
      applicationType: validated.applicationType,
      surfacePrep: validated.surfacePrep,
      coats: paintCoats,
    };
  }

  private async lossFactorForCompany(companyId: number): Promise<number> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const lossPct = company?.pipingLossFactorPct ?? 45;
    return (100 - lossPct) / 100;
  }

  static inferCoatRoles<T extends { area: string; coatRole?: "primer" | "intermediate" | "final" }>(
    coats: T[],
  ): T[] {
    const hasAnyRole = coats.some((c) => c.coatRole);
    if (hasAnyRole) {
      return coats;
    }
    const byArea = coats.reduce<Record<string, T[]>>((acc, coat) => {
      const key = coat.area;
      return { ...acc, [key]: [...(acc[key] || []), coat] };
    }, {});
    return Object.values(byArea).flatMap((areaCoats) =>
      areaCoats.map((coat, idx) => {
        const role: "primer" | "intermediate" | "final" =
          areaCoats.length === 1
            ? "primer"
            : idx === 0
              ? "primer"
              : idx === areaCoats.length - 1
                ? "final"
                : "intermediate";
        return { ...coat, coatRole: role };
      }),
    );
  }

  private calculateCoatVolume(
    coat: AiCoatResult,
    totalM2: number,
    retentionFactor: number,
  ): CoatDetail {
    const knownProduct = lookupCoatingProduct(coat.product);
    const hasDft = coat.minDftUm > 0 || coat.maxDftUm > 0;
    const effectiveMinDft = hasDft ? coat.minDftUm : knownProduct?.defaultDftUm || DEFAULT_DFT_UM;
    const effectiveMaxDft = hasDft ? coat.maxDftUm : knownProduct?.defaultDftUm || DEFAULT_DFT_UM;
    const midDftUm = (effectiveMinDft + effectiveMaxDft) / 2;
    const volumeSolids = knownProduct
      ? knownProduct.volumeSolidsPercent
      : coat.solidsByVolumePercent > 0
        ? coat.solidsByVolumePercent
        : DEFAULT_SOLIDS_BY_VOLUME;
    const verified = knownProduct !== null;

    if (knownProduct) {
      this.logger.log(
        `Coating "${coat.product}" matched to "${knownProduct.name}" — vol solids: ${knownProduct.volumeSolidsPercent}%${!hasDft && knownProduct.defaultDftUm ? ` (using default DFT: ${knownProduct.defaultDftUm}µm)` : ""}`,
      );
    } else {
      this.logger.warn(
        `Coating "${coat.product}" not found in lookup table — using AI estimate: ${volumeSolids}%`,
      );
    }

    const pipingLossFactor = retentionFactor;
    const coverageM2PerLiter =
      midDftUm > 0 ? ((volumeSolids * 10) / midDftUm) * pipingLossFactor : 0;
    const litersRequired =
      coverageM2PerLiter > 0 ? Math.ceil((totalM2 / coverageM2PerLiter) * 10) / 10 : 0;

    return {
      product: coat.product,
      genericType: coat.genericType,
      area: coat.area,
      coatRole: coat.coatRole,
      minDftUm: effectiveMinDft,
      maxDftUm: effectiveMaxDft,
      solidsByVolumePercent: volumeSolids,
      coverageM2PerLiter: Math.round(coverageM2PerLiter * 100) / 100,
      litersRequired,
      verified,
    };
  }

  private async assessStock(
    coats: CoatDetail[],
    companyId: number,
  ): Promise<StockAssessmentItem[]> {
    const stockItems = await this.stockItemRepo.find({ where: { companyId } });

    const grouped = coats.reduce<Record<string, { totalRequired: number; coat: CoatDetail }>>(
      (acc, coat) => {
        const key = coat.product;
        if (acc[key]) {
          acc[key].totalRequired = acc[key].totalRequired + coat.litersRequired;
        } else {
          acc[key] = { totalRequired: coat.litersRequired, coat };
        }
        return acc;
      },
      {},
    );

    return Object.values(grouped).map(({ totalRequired, coat }) => {
      const matched = this.fuzzyMatchStockItem(coat.product, stockItems);
      return {
        product: coat.product,
        stockItemId: matched?.id ?? null,
        stockItemName: matched?.name ?? null,
        currentStock: matched ? Number(matched.quantity) : 0,
        required: totalRequired,
        unit: "liters",
        sufficient: matched ? Number(matched.quantity) >= totalRequired : false,
      };
    });
  }

  private fuzzyMatchStockItem(productName: string, stockItems: StockItem[]): StockItem | null {
    const normalised = productName.toLowerCase().replace(/\s+/g, " ").trim();
    const words = normalised.split(" ");

    const scored = stockItems
      .map((item) => {
        const itemName = item.name.toLowerCase().replace(/\s+/g, " ").trim();
        const matchingWords = words.filter((word) => itemName.includes(word));
        return { item, score: matchingWords.length / words.length };
      })
      .filter((entry) => entry.score >= 0.5)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].item : null;
  }

  async updateStockAssessment(
    companyId: number,
    jobCardId: number,
    items: StockAssessmentItem[],
    userName: string,
  ): Promise<JobCardCoatingAnalysis> {
    const analysis = await this.analysisRepo.findOne({
      where: { jobCardId, companyId },
    });

    if (!analysis) {
      throw new NotFoundException(`Coating analysis not found for job card ${jobCardId}`);
    }

    analysis.pmEditedAssessment = items;
    analysis.pmEditedBy = userName;
    analysis.pmEditedAt = now().toJSDate();

    return this.analysisRepo.save(analysis);
  }

  private async backfillNotesFromCpo(jobCard: JobCard): Promise<void> {
    const existingNotes = (jobCard.notes || "").trim();
    if (existingNotes) return;

    const lineItems = await this.lineItemRepo.find({
      where: { jobCardId: jobCard.id, companyId: jobCard.companyId },
    });
    const lineItemNotes = lineItems.map((li) => (li.notes || "").trim()).filter(Boolean);
    const combined = sanitizeNotes(lineItemNotes.join("\n"));

    if (combined) {
      jobCard.notes = combined;
      return;
    }

    if (jobCard.cpoId) {
      const cpo = await this.cpoRepo.findOne({
        where: { id: jobCard.cpoId, companyId: jobCard.companyId },
      });
      if (cpo?.coatingSpecs) {
        jobCard.notes = sanitizeNotes(cpo.coatingSpecs);
      }
    }
  }

  async bulkReanalyse(companyId: number): Promise<{ processed: number; failed: number }> {
    const BATCH_SIZE = 5;

    const draftJobCards = await this.jobCardRepo.find({
      where: [
        { companyId, status: "draft" as any },
        { companyId, status: "active" as any },
      ],
    });

    const sanitizedCards = await Promise.all(
      draftJobCards.map(async (jc) => {
        jc.notes = sanitizeNotes(jc.notes);
        await this.backfillNotesFromCpo(jc);
        await this.jobCardRepo.save(jc);
        return jc;
      }),
    );

    const batches = Array.from({ length: Math.ceil(sanitizedCards.length / BATCH_SIZE) }, (_, i) =>
      sanitizedCards.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE),
    );

    const results = await batches.reduce(
      async (accPromise, batch) => {
        const acc = await accPromise;
        const batchResults = await Promise.allSettled(
          batch.map((jc) => this.analyseJobCard(jc.id, companyId)),
        );
        const batchProcessed = batchResults.filter((r) => r.status === "fulfilled").length;
        const batchFailed = batchResults.filter((r) => r.status === "rejected").length;

        batchResults.forEach((result, idx) => {
          if (result.status === "rejected") {
            const message =
              result.reason instanceof Error ? result.reason.message : "Unknown error";
            this.logger.error(`Bulk re-analyse failed for JC ${batch[idx].id}: ${message}`);
          }
        });

        return { processed: acc.processed + batchProcessed, failed: acc.failed + batchFailed };
      },
      Promise.resolve({ processed: 0, failed: 0 }),
    );

    this.logger.log(
      `Bulk re-analyse complete: ${results.processed} processed, ${results.failed} failed`,
    );
    return results;
  }

  async corrections(companyId: number, jobCardId: number): Promise<JobCardExtractionCorrection[]> {
    return this.correctionRepo.find({
      where: { companyId, jobCardId },
      order: { createdAt: "DESC" },
    });
  }

  async saveCorrection(
    companyId: number,
    jobCardId: number,
    fieldName: string,
    originalValue: string | null,
    correctedValue: string,
    correctedBy: number,
  ): Promise<JobCardExtractionCorrection> {
    const jobCard = await this.jobCardRepo.findOne({
      where: { id: jobCardId, companyId },
    });

    if (!jobCard) {
      throw new NotFoundException(`Job card ${jobCardId} not found`);
    }

    const correction = this.correctionRepo.create({
      companyId,
      jobCardId,
      customerName: jobCard.customerName,
      fieldName,
      originalValue,
      correctedValue,
      correctedBy,
    });

    const saved = await this.correctionRepo.save(correction);

    this.logger.log(
      `Correction saved for JC ${jobCardId}, field "${fieldName}" by user ${correctedBy}`,
    );

    return saved;
  }

  private async correctionHintsForCustomer(
    companyId: number,
    customerName: string | null,
  ): Promise<string | null> {
    if (!customerName) return null;

    const recentCorrections = await this.correctionRepo.find({
      where: { companyId, customerName },
      order: { createdAt: "DESC" },
      take: 30,
    });

    if (recentCorrections.length === 0) return null;

    const hints = recentCorrections.map(
      (c) =>
        `- For field "${c.fieldName}": was corrected from "${c.originalValue}" to "${c.correctedValue}"`,
    );

    return `PREVIOUS CORRECTIONS FOR THIS CUSTOMER (learn from these):\n${hints.join("\n")}\n\nApply these patterns when extracting coating specifications. If coating specs were consistently corrected, pay extra attention to the specification format and product names.`;
  }

  private async markFailed(
    analysis: JobCardCoatingAnalysis,
    errorMessage: string,
  ): Promise<JobCardCoatingAnalysis> {
    analysis.status = CoatingAnalysisStatus.FAILED;
    analysis.error = errorMessage;
    this.logger.error(`Coating analysis failed: ${errorMessage}`);
    return this.analysisRepo.save(analysis);
  }
}
