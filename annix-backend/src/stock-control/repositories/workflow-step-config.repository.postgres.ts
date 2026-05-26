import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { WorkflowStepConfig } from "../entities/workflow-step-config.entity";
import { WorkflowStepConfigRepository } from "./workflow-step-config.repository";

@Injectable()
export class PostgresWorkflowStepConfigRepository
  extends TypeOrmCrudRepository<WorkflowStepConfig>
  implements WorkflowStepConfigRepository
{
  constructor(@InjectRepository(WorkflowStepConfig) repository: Repository<WorkflowStepConfig>) {
    super(repository);
  }

  build(data: DeepPartial<WorkflowStepConfig>): WorkflowStepConfig {
    return this.repository.create(data as TypeOrmDeepPartial<WorkflowStepConfig>);
  }

  findOrderedForeground(companyId: number): Promise<WorkflowStepConfig[]> {
    return this.repository.find({
      where: { companyId, isBackground: false },
      order: { sortOrder: "ASC" },
    });
  }

  findOrderedBackground(companyId: number): Promise<WorkflowStepConfig[]> {
    return this.repository.find({
      where: { companyId, isBackground: true },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  findBackgroundForTrigger(
    companyId: number,
    triggerStepKey: string,
  ): Promise<WorkflowStepConfig[]> {
    return this.repository.find({
      where: { companyId, isBackground: true, triggerAfterStep: triggerStepKey },
      order: { sortOrder: "ASC", createdAt: "ASC" },
    });
  }

  findForCompany(companyId: number): Promise<WorkflowStepConfig[]> {
    return this.repository.find({ where: { companyId } });
  }

  findOneForCompanyByKey(companyId: number, key: string): Promise<WorkflowStepConfig | null> {
    return this.repository.findOne({ where: { companyId, key } });
  }

  findOneForegroundForCompanyByKey(
    companyId: number,
    key: string,
  ): Promise<WorkflowStepConfig | null> {
    return this.repository.findOne({
      where: { companyId, key, isBackground: false },
    });
  }

  async insertManyIgnore(entities: DeepPartial<WorkflowStepConfig>[]): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(WorkflowStepConfig)
      .values(entities as QueryDeepPartialEntity<WorkflowStepConfig>[])
      .orIgnore()
      .execute();
  }

  async updateByCompanyAndKey(
    companyId: number,
    key: string,
    updates: DeepPartial<WorkflowStepConfig>,
  ): Promise<number> {
    const result = await this.repository.update(
      { companyId, key },
      updates as QueryDeepPartialEntity<WorkflowStepConfig>,
    );
    return result.affected ?? 0;
  }

  async updateById(id: number, updates: DeepPartial<WorkflowStepConfig>): Promise<void> {
    await this.repository.update(id, updates as QueryDeepPartialEntity<WorkflowStepConfig>);
  }

  async updateTriggerAfterStep(
    companyId: number,
    triggerAfterStep: string,
    newTriggerAfterStep: string | null,
  ): Promise<void> {
    await this.repository.update(
      { companyId, triggerAfterStep },
      { triggerAfterStep: newTriggerAfterStep },
    );
  }

  async bumpSortOrderAfter(companyId: number, sortOrder: number): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .update(WorkflowStepConfig)
      .set({ sortOrder: () => "sort_order + 1" })
      .where("companyId = :companyId AND sortOrder > :sortOrder", {
        companyId,
        sortOrder,
      })
      .execute();
  }
}
