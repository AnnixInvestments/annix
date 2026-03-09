import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import { lookupCoatingProduct } from "../config/coating-products";
import {
  CoatDetail,
  CoatingAnalysisStatus,
  JobCardCoatingAnalysis,
  StockAssessmentItem,
} from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { StockControlCompany } from "../entities/stock-control-company.entity";
import { StockItem } from "../entities/stock-item.entity";
import { M2CalculationService } from "./m2-calculation.service";

interface AiCoatResult {
  product: string;
  genericType: string | null;
  area: "external" | "internal";
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

const COATING_SYSTEM_PROMPT = `You are an industrial coating specification parser. Extract coating details from job card notes.

The notes typically follow this format:
EXT : BLAST & PAINT [PRODUCT] [COLOR] @ [DFT RANGE]um + [PRODUCT] [COLOR] @ [DFT RANGE]um
INT : [SIMILAR FORMAT]

Return JSON only with this structure:
{
  "applicationType": "external" | "internal" | "both",
  "surfacePrep": "blast" | "sa3_blast" | "hand_tool" | "power_tool" | null,
  "coats": [
    {
      "product": "PENGUARD EXPRESS MIO BUFF",
      "genericType": "epoxy_mio" | "polyurethane" | "zinc_rich" | "epoxy" | "alkyd" | "inorganic_zinc" | "acrylic" | "unknown",
      "area": "external" | "internal",
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
- Surface prep: look for "BLAST", "HAND TOOL", "POWER TOOL" keywords. If internal rubber lining (R/L) is specified, surface prep is "sa3_blast" (SA3 abrasive blast required before rubber lining)
- "R/L" or "RUBBER LINING" in INT section means internal rubber lining — set applicationType to "both" but DO NOT include rubber as a coat entry. Rubber lining is not paint.
- NEVER include rubber lining products (identified by keywords: R/L, SHORE, RUBBER, LINING, LINER, LAGGING) in the coats array — only include paint/coating products
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
    private readonly aiChatService: AiChatService,
    private readonly m2CalculationService: M2CalculationService,
  ) {}

  async analyseJobCards(jobCardIds: number[], companyId: number): Promise<void> {
    for (const jobCardId of jobCardIds) {
      try {
        await this.analyseJobCard(jobCardId, companyId);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Coating analysis failed for job card ${jobCardId}: ${message}`);
      }
    }
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

      const lineItems = await this.lineItemRepo.find({
        where: { jobCardId, companyId },
      });

      const paintM2 = this.sumPaintM2(lineItems);
      let calculatedExtM2 = 0;
      let calculatedIntM2 = 0;

      if (paintM2 === 0) {
        const calculated = await this.calculatePipeM2(lineItems);
        calculatedExtM2 = calculated.extM2;
        calculatedIntM2 = calculated.intM2;
        this.logger.log(
          `No paint line items for JC ${jobCardId}, calculated from pipe dims: ext=${calculatedExtM2.toFixed(2)}, int=${calculatedIntM2.toFixed(2)}`,
        );
      }

      const lineItemTotalM2 = this.sumLineItemM2WithQuantity(lineItems);
      if (calculatedExtM2 === 0 && calculatedIntM2 === 0 && lineItemTotalM2 > 0) {
        this.logger.log(
          `Using line item m² × qty fallback for JC ${jobCardId}: ${lineItemTotalM2.toFixed(2)}`,
        );
      }

      const noteLineItems = lineItems
        .filter((li) => {
          const code = (li.itemCode || "").trim();
          const hasNoData =
            !li.itemDescription &&
            !li.itemNo &&
            !li.jtNo &&
            (li.quantity === null || Number.isNaN(li.quantity));
          return hasNoData && code.length > 60;
        })
        .map((li) => (li.itemCode || "").trim());
      const combinedNotes = [jobCard.notes || "", ...noteLineItems].filter(Boolean).join("\n");
      analysis.rawNotes = combinedNotes || jobCard.notes;

      if (!combinedNotes.trim()) {
        analysis.extM2 = 0;
        analysis.intM2 = 0;
        analysis.status = CoatingAnalysisStatus.ANALYSED;
        analysis.coats = [];
        analysis.stockAssessment = [];
        analysis.analysedAt = now().toJSDate();
        return this.analysisRepo.save(analysis);
      }

      const aiResult = await this.extractCoatingSpec(combinedNotes);

      const hasInternalRubberLining = /INT\s*:\s*R\/L/i.test(combinedNotes);
      analysis.applicationType = aiResult.applicationType;
      analysis.surfacePrep = hasInternalRubberLining ? "sa3_blast" : aiResult.surfacePrep;

      const hasExt = aiResult.coats.some((c) => c.area === "external");
      const hasInt = aiResult.coats.some((c) => c.area === "internal");
      const needsIntM2 = hasInt || hasInternalRubberLining;

      if (paintM2 > 0) {
        analysis.extM2 = hasExt ? paintM2 : 0;
        analysis.intM2 = needsIntM2 ? paintM2 : 0;
      } else if (calculatedExtM2 > 0 || calculatedIntM2 > 0) {
        analysis.extM2 = hasExt ? calculatedExtM2 : 0;
        analysis.intM2 = needsIntM2 ? calculatedIntM2 : 0;
      } else {
        analysis.extM2 = hasExt ? lineItemTotalM2 : 0;
        analysis.intM2 = needsIntM2 ? lineItemTotalM2 : 0;
      }

      if (analysis.extM2 === 0 && hasExt && lineItemTotalM2 > 0) {
        this.logger.log(
          `Ext m² was 0 despite external coat detected for JC ${jobCardId}, using line item total: ${lineItemTotalM2.toFixed(2)}`,
        );
        analysis.extM2 = lineItemTotalM2;
      }
      if (analysis.intM2 === 0 && needsIntM2 && lineItemTotalM2 > 0) {
        this.logger.log(
          `Int m² was 0 despite internal coat/lining detected for JC ${jobCardId}, using line item total: ${lineItemTotalM2.toFixed(2)}`,
        );
        analysis.intM2 = lineItemTotalM2;
      }

      const retentionFactor = await this.lossFactorForCompany(companyId);
      const coats = aiResult.coats.map((coat) => {
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
    fileBuffer: Buffer,
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

    const productNames = unverified.map((c) => c.product).join(", ");
    const tdsBase64 = fileBuffer.toString("base64");

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "application/pdf", data: tdsBase64 },
          },
          {
            type: "text",
            text: `Extract the volume solids percentage from this Technical Data Sheet (TDS) PDF. I need the volume solids for: ${productNames}.\n\nReturn JSON only:\n{ "products": [{ "product": "Product Name", "volumeSolidsPercent": 85 }] }\n\nRules:\n- Look for "Volume Solids", "Solids by Volume", or similar in the datasheet\n- The value is typically a percentage (e.g., 85%, 72%)\n- Match each product name to the closest product found in the TDS\n- Return valid JSON only, no additional text`,
          },
        ] as any,
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
      .reduce((sum, li) => sum + (Number(li.m2) || 0), 0);
  }

  private sumLineItemM2WithQuantity(lineItems: JobCardLineItem[]): number {
    return lineItems.reduce((sum, li) => {
      const m2 = Number(li.m2) || 0;
      const qty = Number(li.quantity) || 1;
      return sum + m2 * qty;
    }, 0);
  }

  private async calculatePipeM2(
    lineItems: JobCardLineItem[],
  ): Promise<{ extM2: number; intM2: number }> {
    const pipeItems = lineItems.filter((li) => {
      const desc = li.itemDescription || li.itemCode || "";
      return /\d+\s*NB/i.test(desc) && /\d+\s*LG/i.test(desc);
    });

    if (pipeItems.length === 0) {
      return { extM2: 0, intM2: 0 };
    }

    const descriptions = pipeItems.map((li) => li.itemDescription || li.itemCode || "");
    const results = await this.m2CalculationService.calculateM2ForItems(descriptions);

    return pipeItems.reduce(
      (totals, li, idx) => {
        const result = results[idx];
        const qty = Number(li.quantity) || 1;
        const ext = (result.externalM2 || 0) * qty;
        const int = (result.internalM2 || 0) * qty;
        return { extM2: totals.extM2 + ext, intM2: totals.intM2 + int };
      },
      { extM2: 0, intM2: 0 },
    );
  }

  private async extractCoatingSpec(notes: string): Promise<AiExtractionResult> {
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: `Parse the following job card coating notes and extract the coating specification:\n\n"${notes}"\n\nRespond with JSON only.`,
      },
    ];

    const { content: response } = await this.aiChatService.chat(messages, COATING_SYSTEM_PROMPT);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI response did not contain valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const RUBBER_PATTERN = /\br\/l\b|rubber|shore|lining|liner|lagging/i;

    const allCoats = (parsed.coats || []).map((coat: any) => ({
      product: coat.product || "Unknown",
      genericType: coat.genericType || "unknown",
      area: coat.area === "internal" ? "internal" : "external",
      minDftUm: coat.minDftUm || 0,
      maxDftUm: coat.maxDftUm || 0,
      solidsByVolumePercent: coat.solidsByVolumePercent || DEFAULT_SOLIDS_BY_VOLUME,
    }));

    const paintCoats = allCoats.filter((coat: AiCoatResult) => !RUBBER_PATTERN.test(coat.product));

    return {
      applicationType: parsed.applicationType || "external",
      surfacePrep: parsed.surfacePrep || null,
      coats: paintCoats,
    };
  }

  private async lossFactorForCompany(companyId: number): Promise<number> {
    const company = await this.companyRepo.findOne({ where: { id: companyId } });
    const lossPct = company?.pipingLossFactorPct ?? 45;
    return (100 - lossPct) / 100;
  }

  private calculateCoatVolume(
    coat: AiCoatResult,
    totalM2: number,
    retentionFactor: number,
  ): CoatDetail {
    const knownProduct = lookupCoatingProduct(coat.product);
    const hasDft = coat.minDftUm > 0 || coat.maxDftUm > 0;
    const effectiveMinDft = hasDft ? coat.minDftUm : knownProduct?.defaultDftUm || coat.minDftUm;
    const effectiveMaxDft = hasDft ? coat.maxDftUm : knownProduct?.defaultDftUm || coat.maxDftUm;
    const midDftUm = (effectiveMinDft + effectiveMaxDft) / 2;
    const volumeSolids = knownProduct
      ? knownProduct.volumeSolidsPercent
      : coat.solidsByVolumePercent || DEFAULT_SOLIDS_BY_VOLUME;
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

    return coats.map((coat) => {
      const matched = this.fuzzyMatchStockItem(coat.product, stockItems);

      return {
        product: coat.product,
        stockItemId: matched?.id ?? null,
        stockItemName: matched?.name ?? null,
        currentStock: matched ? Number(matched.quantity) : 0,
        required: coat.litersRequired,
        unit: "liters",
        sufficient: matched ? Number(matched.quantity) >= coat.litersRequired : false,
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
