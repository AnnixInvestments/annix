import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { JobCard } from "../entities/job-card.entity";

export interface JobCardSearchRow {
  id: number;
  jobNumber: string;
  jcNumber: string | null;
  jobName: string;
  customerName: string | null;
  description: string | null;
  status: string;
  updatedAt: Date;
}

export abstract class JobCardRepository extends CrudRepository<JobCard> {
  abstract withTransaction(context: TransactionContext): CrudRepository<JobCard>;
  abstract findOneForCompany(id: number, companyId: number): Promise<JobCard | null>;
  abstract findOneForCompanyWithLineItems(id: number, companyId: number): Promise<JobCard | null>;
  abstract findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<JobCard | null>;
  abstract findOneForCompanySelectId(id: number, companyId: number): Promise<JobCard | null>;
  abstract findOneForCompanySelectIdNotes(id: number, companyId: number): Promise<JobCard | null>;
  abstract findById(id: number): Promise<JobCard | null>;
  abstract findForCompanyByListPage(
    companyId: number,
    status: string | undefined,
    page: number,
    limit: number,
  ): Promise<JobCard[]>;
  abstract jtNumbersForJobCards(
    jobCardIds: number[],
  ): Promise<{ jobCardId: number; jtNumbers: string }[]>;
  abstract findDeliveryJobCards(companyId: number, parentJobCardId: number): Promise<JobCard[]>;
  abstract findActiveByJobAndJcNumber(
    companyId: number,
    jobNumber: string,
    jcNumber: string,
  ): Promise<JobCard[]>;
  abstract countDeliveryChildrenForParents(
    companyId: number,
    parentJobCardIds: number[],
  ): Promise<Map<number, number>>;
  abstract findForCpo(cpoId: number, companyId: number): Promise<JobCard[]>;
  abstract findForCpoWithLineItemsOrdered(cpoId: number, companyId: number): Promise<JobCard[]>;
  abstract findChildJobCardsByCpoCreatedAsc(cpoId: number, companyId: number): Promise<JobCard[]>;
  abstract findParentForCpo(cpoId: number, companyId: number): Promise<JobCard | null>;
  abstract findChildJobCardsByJobNumber(companyId: number, jobNumber: string): Promise<JobCard[]>;
  abstract findActiveOrDraftForCompany(companyId: number): Promise<JobCard[]>;
  abstract findActiveJobCardsWithDedupeFields(companyId: number): Promise<JobCard[]>;
  abstract findByIdsForCompany(jobCardIds: number[], companyId: number): Promise<JobCard[]>;
  abstract searchAcrossCompaniesByNumberOrName(
    companyIds: number[],
    query: string,
    limit: number,
  ): Promise<JobCard[]>;
  abstract adjacentIds(
    id: number,
    companyId: number,
  ): Promise<{ previousId: number | null; nextId: number | null }>;
  abstract findPendingApprovalsForCompany(
    companyId: number,
    statuses: string[],
    page: number,
    limit: number,
  ): Promise<JobCard[]>;
  abstract searchForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<JobCardSearchRow[]>;
  abstract findByQrToken(companyId: number, qrToken: string): Promise<JobCard | null>;
  abstract countByStatus(companyId: number, status: string): Promise<number>;
  abstract countByWorkflowStatusAndStatuses(
    companyId: number,
    workflowStatus: string,
    statuses: string[],
  ): Promise<number>;
  abstract updateById(id: number, changes: DeepPartial<JobCard>): Promise<void>;
  abstract updateForCompany(
    id: number,
    companyId: number,
    changes: DeepPartial<JobCard>,
  ): Promise<void>;
  abstract updateWorkflowStatusIfMatches(
    id: number,
    companyId: number,
    expectedWorkflowStatus: string,
    nextWorkflowStatus: string,
  ): Promise<number>;
  abstract saveMany(entities: JobCard[]): Promise<JobCard[]>;
  abstract build(data: DeepPartial<JobCard>): JobCard;
}
