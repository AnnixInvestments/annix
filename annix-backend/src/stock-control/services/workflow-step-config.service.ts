import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common"; // v2
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";

interface PhaseGroup {
  phase: number;
  branchColor: string | null;
  bgStepKeys: string[];
}

const DEFAULT_STEPS: ReadonlyArray<{
  key: string;
  label: string;
  sortOrder: number;
  isBackground: boolean;
  triggerAfterStep: string | null;
  actionLabel: string | null;
  branchColor: string | null;
  phaseActionLabels: Record<string, string> | null;
}> = [
  {
    key: "admin_approval",
    label: "Admin",
    sortOrder: 1,
    isBackground: false,
    triggerAfterStep: null,
    actionLabel: "Accept JC",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "manager_approval",
    label: "Manager",
    sortOrder: 2,
    isBackground: false,
    triggerAfterStep: null,
    actionLabel: "Release to Factory",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "quality_check",
    label: "Quality",
    sortOrder: 3,
    isBackground: false,
    triggerAfterStep: null,
    actionLabel: "Quality Check",
    branchColor: null,
    phaseActionLabels: { "1": "Quality Check", "2": "Quality Release" },
  },
  {
    key: "dispatched",
    label: "Dispatched",
    sortOrder: 4,
    isBackground: false,
    triggerAfterStep: null,
    actionLabel: "Dispatched",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "document_upload",
    label: "Doc Upload",
    sortOrder: 1,
    isBackground: true,
    triggerAfterStep: "admin_approval",
    actionLabel: "Accept Draft",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "stock_allocation",
    label: "Stock Alloc",
    sortOrder: 2,
    isBackground: true,
    triggerAfterStep: "admin_approval",
    actionLabel: "Complete Stock Alloc",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "reception",
    label: "Reception",
    sortOrder: 3,
    isBackground: true,
    triggerAfterStep: "admin_approval",
    actionLabel: "Print JC",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "upload_source_documents",
    label: "Upload Docs",
    sortOrder: 4,
    isBackground: true,
    triggerAfterStep: "admin_approval",
    actionLabel: "Docs Uploaded",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "requisition",
    label: "Requisition",
    sortOrder: 5,
    isBackground: true,
    triggerAfterStep: "manager_approval",
    actionLabel: "Req Sent",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "req_auth",
    label: "Req Auth",
    sortOrder: 5,
    isBackground: true,
    triggerAfterStep: "manager_approval",
    actionLabel: "Req Auth",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "order_placement",
    label: "Order Placement",
    sortOrder: 6,
    isBackground: true,
    triggerAfterStep: "manager_approval",
    actionLabel: "Order Placed",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "qa_check",
    label: "QA Check",
    sortOrder: 7,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "QA Checked",
    branchColor: "#3b82f6",
    phaseActionLabels: null,
  },
  {
    key: "compile_data_book",
    label: "Data Book",
    sortOrder: 8,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "Data Book Compiled",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "qa_review",
    label: "QA Review",
    sortOrder: 9,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "QA Reviewed",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "qc_repairs",
    label: "Rubber/Paint Repairs",
    sortOrder: 10,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "Repairs Done",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "qa_final_check",
    label: "QA Final",
    sortOrder: 11,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "Final Check Done",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "book_3rd_party_inspections",
    label: "3rd Party Insp",
    sortOrder: 12,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "Inspections Booked",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "qc_batch_certs",
    label: "Rubber/Paint Certs",
    sortOrder: 13,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "Certs Done",
    branchColor: "#3b82f6",
    phaseActionLabels: null,
  },
  {
    key: "contact_customer_collection",
    label: "Contact Customer",
    sortOrder: 17,
    isBackground: true,
    triggerAfterStep: "quality_check",
    actionLabel: "Customer Called",
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "job_file_review",
    label: "Job File Review",
    sortOrder: 18,
    isBackground: true,
    triggerAfterStep: "dispatched",
    actionLabel: null,
    branchColor: null,
    phaseActionLabels: null,
  },
  {
    key: "file_sign_off",
    label: "File Sign Off",
    sortOrder: 19,
    isBackground: true,
    triggerAfterStep: "dispatched",
    actionLabel: "File Sign Off",
    branchColor: null,
    phaseActionLabels: null,
  },
];

@Injectable()
export class WorkflowStepConfigService {
  private readonly logger = new Logger(WorkflowStepConfigService.name);

  constructor(
    @InjectRepository(WorkflowStepConfig)
    private readonly repo: Repository<WorkflowStepConfig>,
  ) {}

  async orderedSteps(companyId: number): Promise<WorkflowStepConfig[]> {
    const existing = await this.repo.find({
      where: { companyId, isBackground: false },
      order: { sortOrder: "ASC" },
    });

    if (existing.length > 0) {
      return existing;
    }

    await this.seedDefaults(companyId);

    return this.repo.find({
      where: { companyId, isBackground: false },
      order: { sortOrder: "ASC" },
    });
  }

  async backgroundSteps(companyId: number): Promise<WorkflowStepConfig[]> {
    const existing = await this.repo.find({
      where: { companyId, isBackground: true },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });

    if (existing.length > 0) {
      return existing;
    }

    await this.seedDefaults(companyId);

    return this.repo.find({
      where: { companyId, isBackground: true },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  async backgroundStepsForTrigger(
    companyId: number,
    triggerStepKey: string,
  ): Promise<WorkflowStepConfig[]> {
    return this.repo.find({
      where: { companyId, isBackground: true, triggerAfterStep: triggerStepKey },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  async seedDefaults(companyId: number): Promise<void> {
    const entities = DEFAULT_STEPS.map((step) =>
      this.repo.create({
        companyId,
        key: step.key,
        label: step.label,
        sortOrder: step.sortOrder,
        isSystem: true,
        isBackground: step.isBackground,
        triggerAfterStep: step.triggerAfterStep,
        actionLabel: step.actionLabel,
        branchColor: step.branchColor,
        phaseActionLabels: step.phaseActionLabels,
      }),
    );

    await this.repo
      .createQueryBuilder()
      .insert()
      .into(WorkflowStepConfig)
      .values(entities)
      .orIgnore()
      .execute();
  }

  async updateActionLabel(
    companyId: number,
    stepKey: string,
    actionLabel: string | null,
  ): Promise<void> {
    const result = await this.repo.update({ companyId, key: stepKey }, { actionLabel });

    if (result.affected === 0) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }
  }

  async updateLabel(companyId: number, stepKey: string, label: string): Promise<void> {
    const result = await this.repo.update({ companyId, key: stepKey }, { label });

    if (result.affected === 0) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }
  }

  async updateBranchColor(
    companyId: number,
    stepKey: string,
    branchColor: string | null,
  ): Promise<void> {
    const result = await this.repo.update({ companyId, key: stepKey }, { branchColor });

    if (result.affected === 0) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }
  }

  async addStep(
    companyId: number,
    input: {
      label: string;
      afterStepKey: string;
      isBackground?: boolean;
      triggerAfterStep?: string;
    },
  ): Promise<WorkflowStepConfig> {
    const key = this.generateKey(input.label);

    const existingWithKey = await this.repo.findOne({ where: { companyId, key } });
    if (existingWithKey) {
      throw new BadRequestException(`A step with key "${key}" already exists`);
    }

    if (input.isBackground) {
      const newStep = this.repo.create({
        companyId,
        key,
        label: input.label,
        sortOrder: 0,
        isSystem: false,
        isBackground: true,
        triggerAfterStep: input.triggerAfterStep ?? null,
      });

      return this.repo.save(newStep);
    }

    const steps = await this.orderedSteps(companyId);

    const afterStep = steps.find((s) => s.key === input.afterStepKey);
    if (!afterStep) {
      throw new NotFoundException(`Step "${input.afterStepKey}" not found for this company`);
    }

    const stepsAfterInsertion = steps.filter((s) => s.sortOrder > afterStep.sortOrder);
    if (stepsAfterInsertion.length > 0) {
      await this.repo
        .createQueryBuilder()
        .update(WorkflowStepConfig)
        .set({ sortOrder: () => "sort_order + 1" })
        .where("companyId = :companyId AND sortOrder > :sortOrder", {
          companyId,
          sortOrder: afterStep.sortOrder,
        })
        .execute();
    }

    const newStep = this.repo.create({
      companyId,
      key,
      label: input.label,
      sortOrder: afterStep.sortOrder + 1,
      isSystem: false,
      isBackground: false,
      triggerAfterStep: null,
    });

    return this.repo.save(newStep);
  }

  async toggleBackground(
    companyId: number,
    stepKey: string,
    isBackground: boolean,
    triggerAfterStep?: string,
  ): Promise<WorkflowStepConfig> {
    const step = await this.repo.findOne({ where: { companyId, key: stepKey } });

    if (!step) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }

    step.isBackground = isBackground;
    step.triggerAfterStep = isBackground ? (triggerAfterStep ?? null) : null;
    step.sortOrder = isBackground ? 0 : await this.nextSortOrder(companyId);

    return this.repo.save(step);
  }

  async updateFollows(
    companyId: number,
    stepKey: string,
    triggerAfterStep: string | null,
  ): Promise<WorkflowStepConfig> {
    const step = await this.repo.findOne({ where: { companyId, key: stepKey } });

    if (!step) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }

    step.triggerAfterStep = triggerAfterStep;
    return this.repo.save(step);
  }

  private async nextSortOrder(companyId: number): Promise<number> {
    const steps = await this.orderedSteps(companyId);
    if (steps.length === 0) {
      return 1;
    }
    return steps[steps.length - 1].sortOrder + 1;
  }

  async removeStep(companyId: number, stepKey: string): Promise<void> {
    const step = await this.repo.findOne({ where: { companyId, key: stepKey } });
    this.logger.log(
      `removeStep: key=${stepKey}, found=${!!step}, isSystem=${step?.isSystem}, isBg=${step?.isBackground}`,
    );

    if (!step) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }

    this.logger.log(`removeStep: proceeding to delete key=${stepKey}`);

    await this.repo.update(
      { companyId, triggerAfterStep: stepKey },
      { triggerAfterStep: step.triggerAfterStep },
    );

    await this.repo.remove(step);
  }

  async reorderStep(companyId: number, stepKey: string, direction: "up" | "down"): Promise<void> {
    const steps = await this.orderedSteps(companyId);
    const currentIndex = steps.findIndex((s) => s.key === stepKey);

    if (currentIndex === -1) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (swapIndex < 0 || swapIndex >= steps.length) {
      throw new BadRequestException(`Cannot move step ${direction}`);
    }

    const currentStep = steps[currentIndex];
    const swapStep = steps[swapIndex];
    const tempOrder = currentStep.sortOrder;

    await this.repo.update({ id: currentStep.id }, { sortOrder: swapStep.sortOrder });
    await this.repo.update({ id: swapStep.id }, { sortOrder: tempOrder });
  }

  async bulkReorder(companyId: number, orderedKeys: string[]): Promise<void> {
    const steps = await this.repo.find({ where: { companyId } });

    const stepsByKey = new Map(steps.map((s) => [s.key, s]));

    const updates = orderedKeys
      .map((key, index) => {
        const step = stepsByKey.get(key);
        if (!step) {
          return null;
        }
        return { id: step.id, sortOrder: index + 1 };
      })
      .filter((update): update is { id: number; sortOrder: number } => update !== null);

    await Promise.all(
      updates.map((update) => this.repo.update({ id: update.id }, { sortOrder: update.sortOrder })),
    );
  }

  async phasesForFgStep(companyId: number, fgStepKey: string): Promise<PhaseGroup[]> {
    const bgSteps = await this.backgroundStepsForTrigger(companyId, fgStepKey);

    if (bgSteps.length === 0) {
      return [];
    }

    const hasColored = bgSteps.some((s) => s.branchColor !== null);
    const hasNull = bgSteps.some((s) => s.branchColor === null);

    if (!hasColored || !hasNull) {
      return [{ phase: 1, branchColor: null, bgStepKeys: bgSteps.map((s) => s.key) }];
    }

    const coloredKeys = bgSteps.filter((s) => s.branchColor !== null).map((s) => s.key);
    const nullKeys = bgSteps.filter((s) => s.branchColor === null).map((s) => s.key);

    return [
      {
        phase: 1,
        branchColor: bgSteps.find((s) => s.branchColor !== null)?.branchColor || null,
        bgStepKeys: coloredKeys,
      },
      { phase: 2, branchColor: null, bgStepKeys: nullKeys },
    ];
  }

  firstStepPerBranch(steps: WorkflowStepConfig[]): WorkflowStepConfig[] {
    const seen = new Set<string | null>();
    return steps.reduce<WorkflowStepConfig[]>((acc, step) => {
      const color = step.branchColor || null;
      if (seen.has(color)) {
        return acc;
      }
      seen.add(color);
      return [...acc, step];
    }, []);
  }

  async updatePhaseActionLabels(
    companyId: number,
    stepKey: string,
    phaseActionLabels: Record<string, string> | null,
  ): Promise<void> {
    const result = await this.repo.update({ companyId, key: stepKey }, { phaseActionLabels });

    if (result.affected === 0) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }
  }

  async fgStepConfig(companyId: number, stepKey: string): Promise<WorkflowStepConfig | null> {
    return this.repo.findOne({ where: { companyId, key: stepKey, isBackground: false } });
  }

  private generateKey(label: string): string {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "");

    return `custom_${slug}`;
  }
}
