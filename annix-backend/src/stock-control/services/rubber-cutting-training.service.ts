import { createHash } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
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
  ): Promise<RubberCuttingTraining[]> {
    if (panels.length === 0) return [];

    const fingerprint = this.panelFingerprint(panels);

    const exactMatches = await this.trainingRepo.find({
      where: { companyId, panelFingerprint: fingerprint },
      order: { usageCount: "DESC" },
      take: 3,
    });

    if (exactMatches.length > 0) return exactMatches;

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

    return similar;
  }
}
