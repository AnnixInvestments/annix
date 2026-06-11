import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ILike,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Not,
  Repository,
  type DeepPartial as TypeOrmDeepPartial,
} from "typeorm";
import { type QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { JobCard } from "../entities/job-card.entity";
import { JobCardRepository, type JobCardSearchRow } from "./job-card.repository";

@Injectable()
export class PostgresJobCardRepository
  extends TypeOrmCrudRepository<JobCard>
  implements JobCardRepository
{
  constructor(@InjectRepository(JobCard) repository: Repository<JobCard>) {
    super(repository);
  }

  findOneForCompany(id: number, companyId: number): Promise<JobCard | null> {
    return this.repository.findOne({ where: { id, companyId } });
  }

  findOneForCompanyWithLineItems(id: number, companyId: number): Promise<JobCard | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations: ["lineItems"],
    });
  }

  findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<JobCard | null> {
    return this.repository.findOne({
      where: { id, companyId },
      relations,
    });
  }

  findOneForCompanySelectId(id: number, companyId: number): Promise<JobCard | null> {
    return this.repository.findOne({
      where: { id, companyId },
      select: ["id"],
    });
  }

  findOneForCompanySelectIdNotes(id: number, companyId: number): Promise<JobCard | null> {
    return this.repository.findOne({
      where: { id, companyId },
      select: ["id", "notes"],
    });
  }

  findById(id: number): Promise<JobCard | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findForCompanyByListPage(
    companyId: number,
    status: string | undefined,
    page: number,
    limit: number,
  ): Promise<JobCard[]> {
    const qb = this.repository
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.supersededById IS NULL")
      .andWhere("(jc.parentJobCardId IS NULL OR jc.cpoId IS NOT NULL)")
      .andWhere(
        "jc.id NOT IN (SELECT parent_job_card_id FROM job_cards WHERE parent_job_card_id IS NOT NULL)",
      )
      .orderBy("jc.createdAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit);

    if (status) {
      qb.andWhere("jc.status = :status", { status });
    }
    return qb.getMany();
  }

  jtNumbersForJobCards(jobCardIds: number[]): Promise<{ jobCardId: number; jtNumbers: string }[]> {
    return this.repository.manager.query(
      `SELECT li.job_card_id AS "jobCardId",
                STRING_AGG(DISTINCT li.jt_no, ', ' ORDER BY li.jt_no) AS "jtNumbers"
         FROM job_card_line_items li
         WHERE li.job_card_id = ANY($1)
           AND li.jt_no IS NOT NULL
           AND li.jt_no <> ''
         GROUP BY li.job_card_id`,
      [jobCardIds],
    );
  }

  findDeliveryJobCards(companyId: number, parentJobCardId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: { companyId, parentJobCardId },
      relations: ["lineItems"],
      order: { createdAt: "DESC" },
    });
  }

  async findActiveByJobAndJcNumber(
    companyId: number,
    jobNumber: string,
    jcNumber: string,
  ): Promise<JobCard[]> {
    const cards = await this.repository.find({
      where: { companyId, jobNumber, jcNumber },
      order: { id: "DESC" },
    });
    return cards.filter((jc) => !jc.supersededById);
  }

  async countDeliveryChildrenForParents(
    companyId: number,
    parentJobCardIds: number[],
  ): Promise<Map<number, number>> {
    if (parentJobCardIds.length === 0) {
      return new Map();
    }
    const children = await this.repository.find({
      where: { companyId, parentJobCardId: In(parentJobCardIds) },
      select: ["id", "parentJobCardId"],
    });
    return children.reduce((map, child) => {
      const parentId = Number(child.parentJobCardId);
      if (Number.isFinite(parentId)) {
        map.set(parentId, (map.get(parentId) || 0) + 1);
      }
      return map;
    }, new Map<number, number>());
  }

  findForCpo(cpoId: number, companyId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: { cpoId, companyId },
    });
  }

  findForCpoWithLineItemsOrdered(cpoId: number, companyId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: { cpoId, companyId },
      relations: ["lineItems"],
      order: { createdAt: "ASC" },
    });
  }

  findChildJobCardsByCpoCreatedAsc(cpoId: number, companyId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: { cpoId, companyId },
      order: { createdAt: "ASC" },
    });
  }

  findParentForCpo(cpoId: number, companyId: number): Promise<JobCard | null> {
    return this.repository.findOne({
      where: { companyId, cpoId, parentJobCardId: IsNull() },
    });
  }

  findChildJobCardsByJobNumber(companyId: number, jobNumber: string): Promise<JobCard[]> {
    return this.repository.find({
      where: {
        companyId,
        jobNumber,
        parentJobCardId: Not(IsNull()),
      },
      select: ["id", "jtDnNumber"],
    });
  }

  findActiveOrDraftForCompany(companyId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: [
        { companyId, status: "draft" as never },
        { companyId, status: "active" as never },
      ],
    });
  }

  findActiveJobCardsWithDedupeFields(companyId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: { companyId, supersededById: IsNull() },
      order: { createdAt: "DESC" },
      select: {
        id: true,
        jobNumber: true,
        jcNumber: true,
        pageNumber: true,
        jobName: true,
        customerName: true,
        description: true,
        poNumber: true,
        siteLocation: true,
        contactPerson: true,
        dueDate: true,
        notes: true,
        reference: true,
        status: true,
        workflowStatus: true,
        versionNumber: true,
        sourceFilePath: true,
        sourceFileName: true,
        cpoId: true,
        isCpoCalloff: true,
        parentJobCardId: true,
        jtDnNumber: true,
        supersededById: true,
        workflowCeiling: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findByIdsForCompany(jobCardIds: number[], companyId: number): Promise<JobCard[]> {
    return this.repository.find({
      where: jobCardIds.map((id) => ({ id, companyId })),
    });
  }

  searchAcrossCompaniesByNumberOrName(
    companyIds: number[],
    query: string,
    limit: number,
  ): Promise<JobCard[]> {
    const pattern = `%${query}%`;
    return this.repository.find({
      where: [
        { companyId: In(companyIds), jcNumber: ILike(pattern) },
        { companyId: In(companyIds), jobNumber: ILike(pattern) },
        { companyId: In(companyIds), jobName: ILike(pattern) },
      ],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async adjacentIds(
    id: number,
    companyId: number,
  ): Promise<{ previousId: number | null; nextId: number | null }> {
    const baseWhere = { companyId, supersededById: IsNull() };

    const previous = await this.repository.findOne({
      where: { ...baseWhere, id: LessThan(id) },
      order: { id: "DESC" },
      select: ["id"],
    });

    const next = await this.repository.findOne({
      where: { ...baseWhere, id: MoreThan(id) },
      order: { id: "ASC" },
      select: ["id"],
    });

    return {
      previousId: previous?.id || null,
      nextId: next?.id || null,
    };
  }

  findPendingApprovalsForCompany(
    companyId: number,
    statuses: string[],
    page: number,
    limit: number,
  ): Promise<JobCard[]> {
    return this.repository
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.workflowStatus IN (:...statuses)", { statuses })
      .andWhere("jc.status = :status", { status: "active" })
      .orderBy("jc.createdAt", "ASC")
      .take(limit)
      .skip((page - 1) * limit)
      .getMany();
  }

  searchForCompany(companyId: number, pattern: string, limit: number): Promise<JobCardSearchRow[]> {
    return this.repository
      .createQueryBuilder("jc")
      .select([
        "jc.id",
        "jc.jobNumber",
        "jc.jcNumber",
        "jc.jobName",
        "jc.customerName",
        "jc.description",
        "jc.status",
        "jc.updatedAt",
      ])
      .where("jc.companyId = :companyId", { companyId })
      .andWhere(
        "(jc.jobNumber ILIKE :pattern OR jc.jcNumber ILIKE :pattern OR jc.jobName ILIKE :pattern OR jc.customerName ILIKE :pattern OR jc.description ILIKE :pattern OR jc.poNumber ILIKE :pattern)",
        { pattern },
      )
      .orderBy("jc.updatedAt", "DESC")
      .take(limit)
      .getMany();
  }

  findByQrToken(companyId: number, qrToken: string): Promise<JobCard | null> {
    return this.repository
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.id::text = :qrToken OR jc.jobNumber = :qrToken", { qrToken })
      .getOne();
  }

  countByStatus(companyId: number, status: string): Promise<number> {
    return this.repository.count({
      where: { status: status as never, companyId },
    });
  }

  countByWorkflowStatusAndStatuses(
    companyId: number,
    workflowStatus: string,
    statuses: string[],
  ): Promise<number> {
    return this.repository
      .createQueryBuilder("jc")
      .where("jc.companyId = :companyId", { companyId })
      .andWhere("jc.workflowStatus = :workflowStatus", { workflowStatus })
      .andWhere("jc.status IN (:...statuses)", { statuses })
      .getCount();
  }

  async updateById(id: number, changes: DeepPartial<JobCard>): Promise<void> {
    await this.repository.update(id, changes as QueryDeepPartialEntity<JobCard>);
  }

  async updateForCompany(
    id: number,
    companyId: number,
    changes: DeepPartial<JobCard>,
  ): Promise<void> {
    await this.repository.update({ id, companyId }, changes as QueryDeepPartialEntity<JobCard>);
  }

  async updateWorkflowStatusIfMatches(
    id: number,
    companyId: number,
    expectedWorkflowStatus: string,
    nextWorkflowStatus: string,
  ): Promise<number> {
    const result = await this.repository.update(
      { id, companyId, workflowStatus: expectedWorkflowStatus },
      { workflowStatus: nextWorkflowStatus },
    );
    return result.affected ?? 0;
  }

  saveMany(entities: JobCard[]): Promise<JobCard[]> {
    return this.repository.save(entities);
  }

  build(data: DeepPartial<JobCard>): JobCard {
    return this.repository.create(data as TypeOrmDeepPartial<JobCard>);
  }
}
