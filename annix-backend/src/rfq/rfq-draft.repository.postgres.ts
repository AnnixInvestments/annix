import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RfqDraft } from "./entities/rfq-draft.entity";
import { RfqDraftRepository } from "./rfq-draft.repository";

@Injectable()
export class PostgresRfqDraftRepository
  extends TypeOrmCrudRepository<RfqDraft>
  implements RfqDraftRepository
{
  constructor(@InjectRepository(RfqDraft) repository: Repository<RfqDraft>) {
    super(repository);
  }

  findByIdForUser(draftId: number, userId: number): Promise<RfqDraft | null> {
    return this.repository
      .createQueryBuilder("draft")
      .where("draft.id = :draftId", { draftId })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();
  }

  findByDraftNumberForUser(draftNumber: string, userId: number): Promise<RfqDraft | null> {
    return this.repository
      .createQueryBuilder("draft")
      .where("draft.draft_number = :draftNumber", { draftNumber })
      .andWhere("draft.created_by_user_id = :userId", { userId })
      .getOne();
  }

  findAllForUserWithConvertedRfq(userId: number): Promise<RfqDraft[]> {
    return this.repository
      .createQueryBuilder("draft")
      .leftJoinAndSelect("draft.convertedRfq", "rfq")
      .where("draft.created_by_user_id = :userId", { userId })
      .orderBy("draft.updated_at", "DESC")
      .getMany();
  }

  findLatestUnconvertedForCreator(userId: number): Promise<RfqDraft | null> {
    return this.repository.findOne({
      where: { createdBy: { id: userId }, isConverted: false },
      order: { updatedAt: "DESC" },
    });
  }

  findByIdWithCreator(id: number): Promise<RfqDraft | null> {
    return this.repository.findOne({ where: { id }, relations: ["createdBy"] });
  }

  async searchPaginatedWithCreator(params: {
    search?: string;
    status?: string;
    customerId?: number;
    dateFrom?: Date;
    dateTo?: Date;
    sortBy: "projectName" | "createdAt";
    sortOrder: "ASC" | "DESC";
  }): Promise<{ items: RfqDraft[]; total: number }> {
    const qb = this.repository
      .createQueryBuilder("draft")
      .leftJoinAndSelect("draft.createdBy", "user");

    if (params.search) {
      const escaped = params.search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      qb.andWhere(
        "(draft.projectName ILIKE :search OR draft.draftNumber ILIKE :search OR user.email ILIKE :search)",
        { search: `%${escaped}%` },
      );
    }

    if (params.status === "DRAFT") {
      qb.andWhere("draft.isConverted = false");
    } else if (params.status === "PENDING") {
      qb.andWhere("draft.isConverted = true");
    }

    if (params.customerId) {
      qb.andWhere("user.id = :customerId", { customerId: params.customerId });
    }

    if (params.dateFrom && params.dateTo) {
      qb.andWhere("draft.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      });
    }

    const sortField = params.sortBy === "projectName" ? "draft.projectName" : "draft.createdAt";
    qb.orderBy(sortField, params.sortOrder);

    const total = await qb.getCount();
    const items = await qb.getMany();
    return { items, total };
  }
}
