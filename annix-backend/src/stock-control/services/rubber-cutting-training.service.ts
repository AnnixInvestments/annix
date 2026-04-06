import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { AiChatService } from "../../nix/ai-providers/ai-chat.service";
import { RubberCuttingTraining } from "../entities/rubber-cutting-training.entity";

interface PanelDimension {
  widthMm: number;
  lengthMm: number;
  quantity: number;
}

interface TrainingInput {
  companyId: number;
  jobCardId: number;
  autoPlanSnapshot: Record<string, any>;
  manualRolls: any[];
  rollWidthMm: number;
  rollLengthMm: number;
  reviewedBy: string | null;
}

@Injectable()
export class RubberCuttingTrainingService {
  private readonly logger = new Logger(RubberCuttingTrainingService.name);

  constructor(
    @InjectRepository(RubberCuttingTraining)
    private readonly trainingRepo: Repository<RubberCuttingTraining>,
    private readonly aiChatService: AiChatService,
  ) {}

  panelFingerprint(panels: PanelDimension[]): string {
    const sorted = [...panels]
      .sort((a, b) => {
        const wDiff = a.widthMm - b.widthMm;
        if (wDiff !== 0) return wDiff;
        const lDiff = a.lengthMm - b.lengthMm;
        if (lDiff !== 0) return lDiff;
        return a.quantity - b.quantity;
      })
      .map((p) => `${p.widthMm}x${p.lengthMm}x${p.quantity}`);

    const input = sorted.join("|");
    return createHash("sha256").update(input).digest("hex").slice(0, 16);
  }

  panelSummaryFromManualRolls(manualRolls: any[]): PanelDimension[] {
    const panelMap = new Map<string, PanelDimension>();

    manualRolls.forEach((roll: any) => {
      const cuts = roll.cuts || [];
      cuts.forEach((cut: any) => {
        const key = `${cut.widthMm}x${cut.lengthMm}`;
        const existing = panelMap.get(key);
        const qty = cut.quantity || 1;
        if (existing) {
          panelMap.set(key, { ...existing, quantity: existing.quantity + qty });
        } else {
          panelMap.set(key, { widthMm: cut.widthMm, lengthMm: cut.lengthMm, quantity: qty });
        }
      });
    });

    return [...panelMap.values()].sort((a, b) => {
      const wDiff = a.widthMm - b.widthMm;
      if (wDiff !== 0) return wDiff;
      return a.lengthMm - b.lengthMm;
    });
  }

  panelSummaryFromAutoPlan(autoPlan: Record<string, any>): PanelDimension[] {
    const panelMap = new Map<string, PanelDimension>();
    const rolls = autoPlan.rolls || [];

    rolls.forEach((roll: any) => {
      const cuts = roll.cuts || [];
      cuts.forEach((cut: any) => {
        const key = `${cut.widthMm}x${cut.lengthMm}`;
        const existing = panelMap.get(key);
        if (existing) {
          panelMap.set(key, { ...existing, quantity: existing.quantity + 1 });
        } else {
          panelMap.set(key, { widthMm: cut.widthMm, lengthMm: cut.lengthMm, quantity: 1 });
        }
      });
    });

    return [...panelMap.values()].sort((a, b) => {
      const wDiff = a.widthMm - b.widthMm;
      if (wDiff !== 0) return wDiff;
      return a.lengthMm - b.lengthMm;
    });
  }

  wastePercentageFromManualRolls(manualRolls: any[]): number {
    let totalArea = 0;
    let usedArea = 0;

    manualRolls.forEach((roll: any) => {
      const rollArea = (roll.widthMm / 1000) * roll.lengthM;
      totalArea += rollArea;

      const cuts = roll.cuts || [];
      cuts.forEach((cut: any) => {
        const qty = cut.quantity || 1;
        const cutArea = (cut.widthMm / 1000) * (cut.lengthMm / 1000) * qty;
        usedArea += cutArea;
      });
    });

    if (totalArea === 0) return 0;
    return Math.round(((totalArea - usedArea) / totalArea) * 10000) / 100;
  }

  async captureTraining(input: TrainingInput): Promise<RubberCuttingTraining | null> {
    try {
      const panelSummary = this.panelSummaryFromManualRolls(input.manualRolls);
      if (panelSummary.length === 0) return null;

      const fingerprint = this.panelFingerprint(panelSummary);
      const panelCount = panelSummary.reduce((sum, p) => sum + p.quantity, 0);
      const autoWastePct = input.autoPlanSnapshot.wastePercentage || 0;
      const manualWastePct = this.wastePercentageFromManualRolls(input.manualRolls);

      const existing = await this.trainingRepo.findOne({
        where: {
          companyId: input.companyId,
          panelFingerprint: fingerprint,
        },
      });

      if (existing) {
        await this.trainingRepo.update(existing.id, {
          jobCardId: input.jobCardId,
          manualPlan: { rolls: input.manualRolls },
          autoPlanSnapshot: input.autoPlanSnapshot,
          autoWastePct,
          manualWastePct,
          usageCount: existing.usageCount + 1,
          reviewedBy: input.reviewedBy,
          lastUsedAt: now().toJSDate(),
        });

        this.logger.log(
          `Updated cutting training #${existing.id} (fingerprint=${fingerprint}, usage=${existing.usageCount + 1})`,
        );

        return this.trainingRepo.findOneBy({ id: existing.id });
      }

      const training = this.trainingRepo.create({
        companyId: input.companyId,
        jobCardId: input.jobCardId,
        panelFingerprint: fingerprint,
        panelCount,
        panelSummary,
        autoPlanSnapshot: input.autoPlanSnapshot,
        manualPlan: { rolls: input.manualRolls },
        autoWastePct,
        manualWastePct,
        rollWidthMm: input.rollWidthMm || 1200,
        rollLengthMm: input.rollLengthMm || 12500,
        reviewedBy: input.reviewedBy,
        lastUsedAt: now().toJSDate(),
      });

      const saved = await this.trainingRepo.save(training);
      this.logger.log(
        `Created cutting training #${saved.id} (fingerprint=${fingerprint}, panels=${panelCount})`,
      );
      return saved;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(`Failed to capture cutting training: ${message}`);
      return null;
    }
  }

  async suggestionsForPanels(
    companyId: number,
    panels: PanelDimension[],
    rollWidthMm?: number,
    rollLengthMm?: number,
  ): Promise<{ exact: RubberCuttingTraining[]; aiSuggestion: any | null }> {
    if (panels.length === 0) return { exact: [], aiSuggestion: null };

    const fingerprint = this.panelFingerprint(panels);

    const exactMatches = await this.trainingRepo.find({
      where: { companyId, panelFingerprint: fingerprint },
      order: { usageCount: "DESC" },
      take: 3,
    });

    if (exactMatches.length > 0) return { exact: exactMatches, aiSuggestion: null };

    const panelCount = panels.reduce((sum, p) => sum + p.quantity, 0);
    const minCount = Math.max(1, panelCount - 2);
    const maxCount = panelCount + 2;

    const similar = await this.trainingRepo
      .createQueryBuilder("t")
      .where("t.company_id = :companyId", { companyId })
      .andWhere("t.panel_count BETWEEN :minCount AND :maxCount", { minCount, maxCount })
      .orderBy("t.usage_count", "DESC")
      .limit(5)
      .getMany();

    if (similar.length === 0) return { exact: [], aiSuggestion: null };

    const aiSuggestion = await this.aiSuggestLayout(
      panels,
      similar,
      rollWidthMm || 1200,
      rollLengthMm || 12500,
    );

    return { exact: [], aiSuggestion };
  }

  private async aiSuggestLayout(
    panels: PanelDimension[],
    trainingExamples: RubberCuttingTraining[],
    rollWidthMm: number,
    rollLengthMm: number,
  ): Promise<any | null> {
    try {
      const available = await this.aiChatService.isAvailable();
      if (!available) return null;

      const exampleSummaries = trainingExamples.slice(0, 3).map((ex) => ({
        panels: ex.panelSummary,
        manualLayout: ex.manualPlan,
        wastePct: Number(ex.manualWastePct),
        usageCount: ex.usageCount,
      }));

      const prompt = [
        "You are a rubber cutting plan optimiser for industrial pipe lining.",
        `Roll dimensions: ${rollWidthMm}mm wide x ${rollLengthMm}mm long.`,
        "",
        "Panels to cut:",
        ...panels.map(
          (p) => `  - ${p.quantity}x panel: ${p.widthMm}mm wide x ${p.lengthMm}mm long`,
        ),
        "",
        "Here are similar past layouts that a human expert approved:",
        JSON.stringify(exampleSummaries, null, 2),
        "",
        "Based on these examples, suggest an optimal arrangement of these panels on rolls.",
        "Minimise waste by grouping panels of similar width into horizontal bands.",
        "Multiple panels can sit side-by-side across the roll width if they fit.",
        "",
        "Return ONLY valid JSON (no markdown fences) in this exact format:",
        JSON.stringify(
          {
            rolls: [
              {
                widthMm: rollWidthMm,
                lengthM: rollLengthMm / 1000,
                thicknessMm: 5,
                cuts: [{ description: "panel description", widthMm: 0, lengthMm: 0, quantity: 1 }],
              },
            ],
            reasoning: "Brief explanation of arrangement strategy",
            estimatedWastePct: 0,
          },
          null,
          2,
        ),
      ].join("\n");

      const { content } = await this.aiChatService.chat(
        [{ role: "user", content: prompt }],
        "You are a cutting plan optimiser. Return only valid JSON. No markdown code fences.",
      );

      const cleaned = content
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      if (!parsed.rolls || !Array.isArray(parsed.rolls)) return null;

      this.logger.log(
        `AI suggested layout for ${panels.length} panel types: ${parsed.reasoning || "no reasoning"}`,
      );

      return {
        source: "ai",
        rolls: parsed.rolls,
        reasoning: parsed.reasoning || null,
        estimatedWastePct: parsed.estimatedWastePct || null,
        basedOnExamples: trainingExamples.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.warn(`AI layout suggestion failed: ${message}`);
      return null;
    }
  }
}
