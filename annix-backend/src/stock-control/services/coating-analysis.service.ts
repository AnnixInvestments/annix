import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { ChatMessage } from "../../nix/ai-providers/claude-chat.provider";
import {
  CoatDetail,
  CoatingAnalysisStatus,
  JobCardCoatingAnalysis,
  StockAssessmentItem,
} from "../entities/coating-analysis.entity";
import { JobCard } from "../entities/job-card.entity";
import { JobCardLineItem } from "../entities/job-card-line-item.entity";
import { StockItem } from "../entities/stock-item.entity";

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
  "surfacePrep": "blast" | "hand_tool" | "power_tool" | null,
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
- Surface prep: look for "BLAST", "HAND TOOL", "POWER TOOL" keywords
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
    private readonly aiChatService: AiChatService,
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
      analysis.rawNotes = jobCard.notes;

      if (!jobCard.notes || !jobCard.notes.trim()) {
        analysis.extM2 = 0;
        analysis.intM2 = 0;
        analysis.status = CoatingAnalysisStatus.ANALYSED;
        analysis.coats = [];
        analysis.stockAssessment = [];
        analysis.analysedAt = now().toJSDate();
        return this.analysisRepo.save(analysis);
      }

      const aiResult = await this.extractCoatingSpec(jobCard.notes);

      analysis.applicationType = aiResult.applicationType;
      analysis.surfacePrep = aiResult.surfacePrep;

      const hasExt = aiResult.coats.some((c) => c.area === "external");
      const hasInt = aiResult.coats.some((c) => c.area === "internal");
      analysis.extM2 = hasExt ? paintM2 : 0;
      analysis.intM2 = hasInt ? paintM2 : 0;

      const coats = aiResult.coats.map((coat) => {
        const m2ForCoat = coat.area === "internal" ? analysis.intM2 : analysis.extM2;
        return this.calculateCoatVolume(coat, m2ForCoat);
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

  private sumPaintM2(lineItems: JobCardLineItem[]): number {
    return lineItems
      .filter((li) => li.itemCode && /paint/i.test(li.itemCode))
      .reduce((sum, li) => sum + (Number(li.m2) || 0), 0);
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

    return {
      applicationType: parsed.applicationType || "external",
      surfacePrep: parsed.surfacePrep || null,
      coats: (parsed.coats || []).map((coat: any) => ({
        product: coat.product || "Unknown",
        genericType: coat.genericType || "unknown",
        area: coat.area === "internal" ? "internal" : "external",
        minDftUm: coat.minDftUm || 0,
        maxDftUm: coat.maxDftUm || 0,
        solidsByVolumePercent: coat.solidsByVolumePercent || DEFAULT_SOLIDS_BY_VOLUME,
      })),
    };
  }

  private calculateCoatVolume(coat: AiCoatResult, totalM2: number): CoatDetail {
    const midDftUm = (coat.minDftUm + coat.maxDftUm) / 2;
    const volumeSolids = coat.solidsByVolumePercent || DEFAULT_SOLIDS_BY_VOLUME;
    const pipingLossFactor = 0.55;
    const coverageM2PerLiter =
      midDftUm > 0 ? ((volumeSolids * 10) / midDftUm) * pipingLossFactor : 0;
    const litersRequired =
      coverageM2PerLiter > 0 ? Math.ceil((totalM2 / coverageM2PerLiter) * 10) / 10 : 0;

    return {
      product: coat.product,
      genericType: coat.genericType,
      area: coat.area,
      minDftUm: coat.minDftUm,
      maxDftUm: coat.maxDftUm,
      solidsByVolumePercent: coat.solidsByVolumePercent || DEFAULT_SOLIDS_BY_VOLUME,
      coverageM2PerLiter: Math.round(coverageM2PerLiter * 100) / 100,
      litersRequired,
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
