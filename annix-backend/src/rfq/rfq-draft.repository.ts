import { CrudRepository } from "../lib/persistence/crud-repository";
import { RfqDraft } from "./entities/rfq-draft.entity";

export abstract class RfqDraftRepository extends CrudRepository<RfqDraft> {
  abstract findByIdForUser(draftId: number, userId: number): Promise<RfqDraft | null>;
  abstract findByDraftNumberForUser(draftNumber: string, userId: number): Promise<RfqDraft | null>;
  abstract findAllForUserWithConvertedRfq(userId: number): Promise<RfqDraft[]>;
  abstract findLatestUnconvertedForCreator(userId: number): Promise<RfqDraft | null>;
  abstract findByIdWithCreator(id: number): Promise<RfqDraft | null>;
  abstract searchPaginatedWithCreator(params: {
    search?: string;
    status?: string;
    customerId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy: "projectName" | "createdAt";
    sortOrder: "ASC" | "DESC";
  }): Promise<{ items: RfqDraft[]; total: number }>;
}
