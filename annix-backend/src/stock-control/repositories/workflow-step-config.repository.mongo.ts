import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { keys } from "es-toolkit/compat";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";
import { WorkflowStepConfigRepository } from "./workflow-step-config.repository";

type EmbeddedStep = Record<string, unknown>;

const LEGACY_COLLECTION = "workflow_step_configs";

const EMBED_FIELDS: ReadonlyArray<keyof WorkflowStepConfig> = [
  "id",
  "companyId",
  "key",
  "label",
  "sortOrder",
  "isSystem",
  "isBackground",
  "triggerAfterStep",
  "actionLabel",
  "branchColor",
  "phaseActionLabels",
  "stepOutcomes",
  "branchType",
  "rejoinAtStep",
];

@Injectable()
export class MongoWorkflowStepConfigRepository
  extends MongoTenantScopedRepository<WorkflowStepConfig>
  implements WorkflowStepConfigRepository
{
  constructor(
    @InjectModel("WorkflowStepConfig") legacyModel: Model<WorkflowStepConfig>,
    @InjectModel("StockControlCompany") private readonly companyModel: Model<unknown>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(legacyModel, session);
  }

  withTransaction(context: TransactionContext): MongoWorkflowStepConfigRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoWorkflowStepConfigRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoWorkflowStepConfigRepository {
    return new MongoWorkflowStepConfigRepository(this.model, this.companyModel, session);
  }

  private get companyDocuments(): Model<Record<string, unknown>> {
    return this.companyModel as unknown as Model<Record<string, unknown>>;
  }

  private get txnSession(): { session: ClientSession } | Record<string, never> {
    return this.session ? { session: this.session } : {};
  }

  private toEmbedded(entity: DeepPartial<WorkflowStepConfig>): EmbeddedStep {
    const source = entity as Record<string, unknown>;
    return EMBED_FIELDS.reduce<EmbeddedStep>((acc, field) => {
      const value = source[field];
      acc[field] = value === undefined ? null : value;
      return acc;
    }, {});
  }

  private fromEmbedded(companyId: number, raw: EmbeddedStep): WorkflowStepConfig {
    return {
      id: raw.id as number,
      companyId,
      key: raw.key as string,
      label: raw.label as string,
      sortOrder: raw.sortOrder as number,
      isSystem: raw.isSystem as boolean,
      isBackground: raw.isBackground as boolean,
      triggerAfterStep: (raw.triggerAfterStep as string | null) ?? null,
      actionLabel: (raw.actionLabel as string | null) ?? null,
      branchColor: (raw.branchColor as string | null) ?? null,
      phaseActionLabels: (raw.phaseActionLabels as Record<string, string> | null) ?? null,
      stepOutcomes: (raw.stepOutcomes as WorkflowStepConfig["stepOutcomes"]) ?? null,
      branchType: (raw.branchType as WorkflowStepConfig["branchType"]) ?? null,
      rejoinAtStep: (raw.rejoinAtStep as string | null) ?? null,
    } as WorkflowStepConfig;
  }

  private legacyToEmbedded(companyId: number, doc: Record<string, unknown>): EmbeddedStep {
    return this.toEmbedded(this.fromEmbedded(companyId, { ...doc, id: doc._id }));
  }

  private async allocateId(): Promise<number> {
    const database = this.companyModel.db.db;
    if (!database) {
      throw new Error("Mongo connection is not ready for id sequencing");
    }
    const counters = database.collection<{ _id: string; seq: number }>("counters");
    const incremented = await counters.findOneAndUpdate(
      { _id: LEGACY_COLLECTION },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true, ...this.txnSession },
    );
    if (incremented && Number.isFinite(incremented.seq)) {
      return incremented.seq;
    }
    const highest = await this.documents
      .find({ _id: { $type: "number" } })
      .sort({ _id: -1 })
      .limit(1)
      .session(this.session)
      .lean()
      .exec();
    const parsed = highest.length > 0 ? Number(highest[0]._id) : 0;
    const next = (Number.isFinite(parsed) ? parsed : 0) + 1;
    await counters.updateOne(
      { _id: LEGACY_COLLECTION },
      { $set: { seq: next } },
      { upsert: true, ...this.txnSession },
    );
    return next;
  }

  private async loadCompany(
    companyId: number,
  ): Promise<{ workflowStepConfigs: EmbeddedStep[] | null } | null> {
    const doc = await this.companyDocuments
      .findOne({ _id: companyId }, { workflowStepConfigs: 1 })
      .session(this.session)
      .lean()
      .exec();
    if (!doc) {
      return null;
    }
    const embedded = (doc as { workflowStepConfigs?: EmbeddedStep[] | null }).workflowStepConfigs;
    return { workflowStepConfigs: embedded ?? null };
  }

  private async readLegacy(companyId: number): Promise<EmbeddedStep[]> {
    const docs = await this.documents.find({ companyId }).session(this.session).lean().exec();
    return docs.map((doc) => this.legacyToEmbedded(companyId, doc));
  }

  private async readSteps(companyId: number): Promise<EmbeddedStep[]> {
    const company = await this.loadCompany(companyId);
    if (!company) {
      return this.readLegacy(companyId);
    }
    if (company.workflowStepConfigs === null) {
      return this.readLegacy(companyId);
    }
    return company.workflowStepConfigs;
  }

  private async readStepsForWrite(companyId: number): Promise<EmbeddedStep[]> {
    const company = await this.loadCompany(companyId);
    if (!company || company.workflowStepConfigs === null) {
      const legacy = await this.readLegacy(companyId);
      await this.persist(companyId, legacy);
      return legacy;
    }
    return company.workflowStepConfigs;
  }

  private async persist(companyId: number, steps: EmbeddedStep[]): Promise<void> {
    await this.companyDocuments
      .updateOne({ _id: companyId }, { $set: { workflowStepConfigs: steps } }, this.txnSession)
      .exec();
  }

  build(data: DeepPartial<WorkflowStepConfig>): WorkflowStepConfig {
    return data as WorkflowStepConfig;
  }

  async create(data: DeepPartial<WorkflowStepConfig>): Promise<WorkflowStepConfig> {
    const companyId = (data as { companyId?: number }).companyId;
    if (companyId === undefined || companyId === null) {
      throw new Error("Step config requires a companyId");
    }
    const steps = await this.readStepsForWrite(companyId);
    const id = await this.allocateId();
    const embedded = this.toEmbedded({ ...data, id, companyId });
    await this.persist(companyId, [...steps, embedded]);
    return this.fromEmbedded(companyId, embedded);
  }

  async saveForCompany(companyId: number, entity: WorkflowStepConfig): Promise<WorkflowStepConfig> {
    if (entity.companyId !== companyId) {
      throw new Error("Step config does not belong to the requesting company");
    }
    const steps = await this.readStepsForWrite(companyId);
    const index = steps.findIndex((step) => step.key === entity.key);
    if (index === -1) {
      const id = entity.id ?? (await this.allocateId());
      const embedded = this.toEmbedded({ ...entity, id, companyId });
      await this.persist(companyId, [...steps, embedded]);
      return this.fromEmbedded(companyId, embedded);
    }
    const id = (steps[index].id as number | null) ?? entity.id ?? (await this.allocateId());
    const embedded = this.toEmbedded({ ...entity, id, companyId });
    const next = steps.map((step, i) => (i === index ? embedded : step));
    await this.persist(companyId, next);
    return this.fromEmbedded(companyId, embedded);
  }

  async removeForCompany(companyId: number, entity: WorkflowStepConfig): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Step config does not belong to the requesting company");
    }
    const steps = await this.readStepsForWrite(companyId);
    const next = steps.filter((step) => step.key !== entity.key);
    await this.persist(companyId, next);
  }

  async findOrderedForeground(companyId: number): Promise<WorkflowStepConfig[]> {
    const steps = await this.readSteps(companyId);
    return steps
      .filter((step) => step.isBackground === false)
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
      .map((step) => this.fromEmbedded(companyId, step));
  }

  async findOrderedBackground(companyId: number): Promise<WorkflowStepConfig[]> {
    const steps = await this.readSteps(companyId);
    return steps
      .filter((step) => step.isBackground === true)
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
      .map((step) => this.fromEmbedded(companyId, step));
  }

  async findBackgroundForTrigger(
    companyId: number,
    triggerStepKey: string,
  ): Promise<WorkflowStepConfig[]> {
    const steps = await this.readSteps(companyId);
    return steps
      .filter((step) => step.isBackground === true && step.triggerAfterStep === triggerStepKey)
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
      .map((step) => this.fromEmbedded(companyId, step));
  }

  async findForCompany(companyId: number): Promise<WorkflowStepConfig[]> {
    const steps = await this.readSteps(companyId);
    return steps.map((step) => this.fromEmbedded(companyId, step));
  }

  async findOneForCompanyByKey(companyId: number, key: string): Promise<WorkflowStepConfig | null> {
    const steps = await this.readSteps(companyId);
    const match = steps.find((step) => step.key === key);
    return match ? this.fromEmbedded(companyId, match) : null;
  }

  async findOneForegroundForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<WorkflowStepConfig | null> {
    const steps = await this.readSteps(companyId);
    const match = steps.find((step) => step.key === key && step.isBackground === false);
    return match ? this.fromEmbedded(companyId, match) : null;
  }

  async insertManyIgnore(entities: DeepPartial<WorkflowStepConfig>[]): Promise<void> {
    const byCompany = entities.reduce<Map<number, DeepPartial<WorkflowStepConfig>[]>>(
      (acc, entity) => {
        const companyId = (entity as { companyId?: number }).companyId;
        if (companyId === undefined || companyId === null) {
          return acc;
        }
        const existing = acc.get(companyId) ?? [];
        existing.push(entity);
        acc.set(companyId, existing);
        return acc;
      },
      new Map(),
    );

    await Array.from(byCompany.entries()).reduce(async (prev, [companyId, group]) => {
      await prev;
      const steps = await this.readStepsForWrite(companyId);
      const existingKeys = new Set(steps.map((step) => step.key as string));
      const additions: EmbeddedStep[] = [];
      await group.reduce(async (inner, entity) => {
        await inner;
        const key = (entity as { key?: string }).key;
        if (key === undefined || existingKeys.has(key)) {
          return;
        }
        existingKeys.add(key);
        const id = await this.allocateId();
        additions.push(this.toEmbedded({ ...entity, id, companyId }));
      }, Promise.resolve());
      if (additions.length > 0) {
        await this.persist(companyId, [...steps, ...additions]);
      }
    }, Promise.resolve());
  }

  async updateByCompanyAndKey(
    companyId: number,
    key: string,
    updates: DeepPartial<WorkflowStepConfig>,
  ): Promise<number> {
    const steps = await this.readStepsForWrite(companyId);
    let modified = 0;
    const next = steps.map((step) => {
      if (step.key !== key) {
        return step;
      }
      modified += 1;
      return this.applyUpdates(step, updates);
    });
    if (modified > 0) {
      await this.persist(companyId, next);
    }
    return modified;
  }

  async updateById(id: number, updates: DeepPartial<WorkflowStepConfig>): Promise<void> {
    const company = await this.companyDocuments
      .findOne({ "workflowStepConfigs.id": id }, { _id: 1, workflowStepConfigs: 1 })
      .session(this.session)
      .lean()
      .exec();
    if (company) {
      const companyId = (company as { _id: number })._id;
      const steps =
        ((company as { workflowStepConfigs?: EmbeddedStep[] }).workflowStepConfigs as
          | EmbeddedStep[]
          | undefined) ?? [];
      const next = steps.map((step) => (step.id === id ? this.applyUpdates(step, updates) : step));
      await this.persist(companyId, next);
      return;
    }
    await this.documents
      .updateOne({ _id: id }, { $set: this.toUpdateSet(updates) })
      .session(this.session)
      .exec();
  }

  async updateTriggerAfterStep(
    companyId: number,
    triggerAfterStep: string,
    newTriggerAfterStep: string | null,
  ): Promise<void> {
    const steps = await this.readStepsForWrite(companyId);
    let modified = 0;
    const next = steps.map((step) => {
      if (step.triggerAfterStep !== triggerAfterStep) {
        return step;
      }
      modified += 1;
      return { ...step, triggerAfterStep: newTriggerAfterStep };
    });
    if (modified > 0) {
      await this.persist(companyId, next);
    }
  }

  async bumpSortOrderAfter(companyId: number, sortOrder: number): Promise<void> {
    const steps = await this.readStepsForWrite(companyId);
    let modified = 0;
    const next = steps.map((step) => {
      if ((step.sortOrder as number) <= sortOrder) {
        return step;
      }
      modified += 1;
      return { ...step, sortOrder: (step.sortOrder as number) + 1 };
    });
    if (modified > 0) {
      await this.persist(companyId, next);
    }
  }

  private toUpdateSet(updates: DeepPartial<WorkflowStepConfig>): Record<string, unknown> {
    const source = updates as Record<string, unknown>;
    return keys(source).reduce<Record<string, unknown>>((acc, field) => {
      acc[field] = source[field] === undefined ? null : source[field];
      return acc;
    }, {});
  }

  private applyUpdates(step: EmbeddedStep, updates: DeepPartial<WorkflowStepConfig>): EmbeddedStep {
    return { ...step, ...this.toUpdateSet(updates) };
  }
}
