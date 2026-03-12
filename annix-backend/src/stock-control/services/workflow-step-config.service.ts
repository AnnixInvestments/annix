import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";

const DEFAULT_STEPS: ReadonlyArray<{ key: string; label: string; sortOrder: number }> = [
  { key: "document_upload", label: "Doc Upload", sortOrder: 1 },
  { key: "admin_approval", label: "Admin", sortOrder: 2 },
  { key: "manager_approval", label: "Manager", sortOrder: 3 },
  { key: "requisition_sent", label: "Requisition", sortOrder: 4 },
  { key: "stock_allocation", label: "Stock Alloc", sortOrder: 5 },
  { key: "manager_final", label: "Final Mgr", sortOrder: 6 },
  { key: "ready_for_dispatch", label: "Ready", sortOrder: 7 },
  { key: "dispatched", label: "Dispatched", sortOrder: 8 },
];

@Injectable()
export class WorkflowStepConfigService {
  constructor(
    @InjectRepository(WorkflowStepConfig)
    private readonly repo: Repository<WorkflowStepConfig>,
  ) {}

  async orderedSteps(companyId: number): Promise<WorkflowStepConfig[]> {
    const existing = await this.repo.find({
      where: { companyId },
      order: { sortOrder: "ASC" },
    });

    if (existing.length > 0) {
      return existing;
    }

    await this.seedDefaults(companyId);

    return this.repo.find({
      where: { companyId },
      order: { sortOrder: "ASC" },
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

  async updateLabel(companyId: number, stepKey: string, label: string): Promise<void> {
    const result = await this.repo.update({ companyId, key: stepKey }, { label });

    if (result.affected === 0) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }
  }

  async addStep(
    companyId: number,
    input: { label: string; afterStepKey: string },
  ): Promise<WorkflowStepConfig> {
    const steps = await this.orderedSteps(companyId);

    const afterStep = steps.find((s) => s.key === input.afterStepKey);
    if (!afterStep) {
      throw new NotFoundException(`Step "${input.afterStepKey}" not found for this company`);
    }

    const key = this.generateKey(input.label);

    const existingWithKey = steps.find((s) => s.key === key);
    if (existingWithKey) {
      throw new BadRequestException(`A step with key "${key}" already exists`);
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
    });

    return this.repo.save(newStep);
  }

  async removeStep(companyId: number, stepKey: string): Promise<void> {
    const step = await this.repo.findOne({ where: { companyId, key: stepKey } });

    if (!step) {
      throw new NotFoundException(`Step "${stepKey}" not found for this company`);
    }

    if (step.isSystem) {
      throw new BadRequestException("Cannot remove a system workflow step");
    }

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

  private generateKey(label: string): string {
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "");

    return `custom_${slug}`;
  }
}
