import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { now } from "../../lib/datetime";
import { JobCardCoatingAnalysis } from "../entities/coating-analysis.entity";
import { JobCardBackgroundCompletion } from "../entities/job-card-background-completion.entity";
import { QaReviewDecision } from "../entities/qa-review-decision.entity";

interface UserContext {
  id: number;
  companyId: number;
  name: string;
}

export interface QaApplicability {
  hasRubber: boolean;
  hasPaint: boolean;
}

interface QaReviewInput {
  rubberAccepted: boolean | null;
  paintAccepted: boolean | null;
  notes: string | null;
}

const QA_STEP_KEYS = [
  "qa_check",
  "qc_batch_certs",
  "qa_review",
  "qc_repairs",
  "qa_final_check",
  "book_3rd_party_inspections",
  "compile_data_book",
] as const;

@Injectable()
export class QaProcessService {
  private readonly logger = new Logger(QaProcessService.name);

  constructor(
    @InjectRepository(JobCardCoatingAnalysis)
    private readonly coatingRepo: Repository<JobCardCoatingAnalysis>,
    @InjectRepository(JobCardBackgroundCompletion)
    private readonly completionRepo: Repository<JobCardBackgroundCompletion>,
    @InjectRepository(QaReviewDecision)
    private readonly reviewRepo: Repository<QaReviewDecision>,
  ) {}

  async applicability(companyId: number, jobCardId: number): Promise<QaApplicability> {
    const analysis = await this.coatingRepo.findOne({
      where: { companyId, jobCardId },
    });

    if (!analysis) {
      return { hasRubber: false, hasPaint: false };
    }

    const hasRubber = analysis.hasInternalLining === true;
    const coats = analysis.coats;
    const hasPaint = Array.isArray(coats) && coats.length > 0;

    return { hasRubber, hasPaint };
  }

  async autoSkipInapplicableSteps(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<void> {
    const { hasRubber, hasPaint } = await this.applicability(companyId, jobCardId);

    const stepsToSkip: string[] = [];

    if (!hasRubber && !hasPaint) {
      stepsToSkip.push("qc_batch_certs", "qc_repairs", "qa_review");
    }

    const existing = await this.completionRepo.find({
      where: { jobCardId, companyId },
    });
    const completedKeys = new Set(existing.map((c) => c.stepKey));

    const newCompletions = stepsToSkip
      .filter((key) => !completedKeys.has(key))
      .map((key) =>
        this.completionRepo.create({
          companyId,
          jobCardId,
          stepKey: key,
          completedById: user.id,
          completedByName: user.name,
          completedAt: now().toJSDate(),
          notes: "Auto-skipped — not applicable",
          completionType: "skipped",
        }),
      );

    if (newCompletions.length > 0) {
      await this.completionRepo.save(newCompletions);
      this.logger.log(
        `Auto-skipped ${newCompletions.length} QA step(s) [${stepsToSkip.join(", ")}] for job card ${jobCardId}`,
      );
    }
  }

  async submitReview(
    companyId: number,
    jobCardId: number,
    input: QaReviewInput,
    user: UserContext,
  ): Promise<QaReviewDecision> {
    const { hasRubber, hasPaint } = await this.applicability(companyId, jobCardId);

    const lastDecision = await this.reviewRepo.findOne({
      where: { companyId, jobCardId },
      order: { cycleNumber: "DESC" },
    });
    const cycleNumber = lastDecision ? lastDecision.cycleNumber + 1 : 1;

    const decision = this.reviewRepo.create({
      companyId,
      jobCardId,
      cycleNumber,
      rubberApplicable: hasRubber,
      paintApplicable: hasPaint,
      rubberAccepted: hasRubber ? input.rubberAccepted : null,
      paintAccepted: hasPaint ? input.paintAccepted : null,
      reviewedById: user.id,
      reviewedByName: user.name,
      reviewedAt: now().toJSDate(),
      notes: input.notes,
    });

    const saved = await this.reviewRepo.save(decision);

    const stepsToSkip: string[] = [];
    const rubberAccepted = !hasRubber || input.rubberAccepted === true;
    const paintAccepted = !hasPaint || input.paintAccepted === true;

    if (rubberAccepted && paintAccepted) {
      stepsToSkip.push("qc_repairs");
    }

    if (stepsToSkip.length > 0) {
      const existing = await this.completionRepo.find({ where: { jobCardId, companyId } });
      const completedKeys = new Set(existing.map((c) => c.stepKey));

      const skipCompletions = stepsToSkip
        .filter((key) => !completedKeys.has(key))
        .map((key) =>
          this.completionRepo.create({
            companyId,
            jobCardId,
            stepKey: key,
            completedById: user.id,
            completedByName: user.name,
            completedAt: now().toJSDate(),
            notes: "Auto-skipped — accepted in QA review",
            completionType: "skipped",
          }),
        );

      if (skipCompletions.length > 0) {
        await this.completionRepo.save(skipCompletions);
        this.logger.log(
          `Auto-skipped repair steps [${stepsToSkip.join(", ")}] for job card ${jobCardId} (cycle ${cycleNumber})`,
        );
      }
    }

    this.logger.log(
      `QA review submitted for job card ${jobCardId} by ${user.name} (cycle ${cycleNumber}): rubber=${input.rubberAccepted}, paint=${input.paintAccepted}`,
    );

    return saved;
  }

  async resetReviewAfterRepairs(companyId: number, jobCardId: number): Promise<boolean> {
    const latestDecision = await this.reviewRepo.findOne({
      where: { companyId, jobCardId },
      order: { cycleNumber: "DESC" },
    });

    if (!latestDecision) {
      return false;
    }

    const needsRepairs =
      (latestDecision.rubberApplicable && latestDecision.rubberAccepted === false) ||
      (latestDecision.paintApplicable && latestDecision.paintAccepted === false);

    if (!needsRepairs) {
      return false;
    }

    const repairCompletions = await this.completionRepo.find({
      where: { jobCardId, companyId },
    });
    const completedKeys = new Set(repairCompletions.map((c) => c.stepKey));

    if (!completedKeys.has("qc_repairs")) {
      return false;
    }

    await this.completionRepo.delete({ jobCardId, companyId, stepKey: "qa_review" });
    await this.completionRepo.delete({ jobCardId, companyId, stepKey: "qa_final_check" });
    await this.completionRepo.delete({
      jobCardId,
      companyId,
      stepKey: "book_3rd_party_inspections",
    });
    await this.completionRepo.delete({ jobCardId, companyId, stepKey: "compile_data_book" });

    this.logger.log(
      `Reset QA review and downstream steps for job card ${jobCardId} after repairs (cycle ${latestDecision.cycleNumber})`,
    );

    return true;
  }

  async autoCompileDataBook(
    companyId: number,
    jobCardId: number,
    user: UserContext,
  ): Promise<void> {
    this.logger.log(`Data book compilation triggered for job card ${jobCardId} by ${user.name}`);
  }

  latestDecisionForJobCard(companyId: number, jobCardId: number): Promise<QaReviewDecision | null> {
    return this.reviewRepo.findOne({
      where: { companyId, jobCardId },
      order: { cycleNumber: "DESC" },
    });
  }
}
