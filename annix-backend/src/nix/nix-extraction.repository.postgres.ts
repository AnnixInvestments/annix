import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SaMine } from "../mines/entities/sa-mine.entity";
import { ExtractionStatus, NixExtraction } from "./entities/nix-extraction.entity";
import {
  type DocNumberSearchRow,
  type MineExtractionCount,
  NixExtractionRepository,
  type RevisionCandidateParams,
  type SameSessionDuplicateParams,
} from "./nix-extraction.repository";

@Injectable()
export class PostgresNixExtractionRepository
  extends TypeOrmCrudRepository<NixExtraction>
  implements NixExtractionRepository
{
  constructor(@InjectRepository(NixExtraction) repository: Repository<NixExtraction>) {
    super(repository);
  }

  findBySessionOrderedAsc(sessionId: number): Promise<NixExtraction[]> {
    return this.repository.find({
      where: { sessionId },
      order: { id: "ASC" },
    });
  }

  findLatestSameSessionDuplicate(
    params: SameSessionDuplicateParams,
  ): Promise<NixExtraction | null> {
    return this.repository.findOne({
      where: {
        sessionId: params.sessionId,
        documentName: params.documentName,
        status: Not(ExtractionStatus.FAILED),
      },
      order: { id: "DESC" },
    });
  }

  findByIdWithUserAndRfq(id: number): Promise<NixExtraction | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["user", "rfq"],
    });
  }

  findRecentForUser(userId: number): Promise<NixExtraction[]> {
    return this.repository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  findRevisionCandidates(params: RevisionCandidateParams): Promise<NixExtraction[]> {
    const where: Record<string, unknown> = {
      documentNumber: params.documentNumber,
      isLatestRevision: true,
      status: ExtractionStatus.COMPLETED,
    };
    if (params.mineId && params.mineCountry) {
      where.mineId = params.mineId;
      where.mineCountry = params.mineCountry;
    } else {
      where.mineId = IsNull();
    }
    return this.repository.find({ where });
  }

  async markSuperseded(
    extractionId: number,
    isLatestRevision: boolean,
    supersededByExtractionId: number | null,
  ): Promise<void> {
    const patch: Record<string, unknown> = { isLatestRevision };
    if (supersededByExtractionId !== null) {
      patch.supersededByExtractionId = supersededByExtractionId;
    }
    await this.repository.update({ id: extractionId }, patch);
  }

  async countExtractionsByMine(): Promise<MineExtractionCount[]> {
    const rows = await this.repository
      .createQueryBuilder("e")
      .select("e.mineId", "mineId")
      .addSelect("COUNT(e.id)", "extractionCount")
      .where("e.mineId IS NOT NULL")
      .groupBy("e.mineId")
      .getRawMany<{ mineId: number; extractionCount: string }>();
    return rows.map((r) => ({
      mineId: Number(r.mineId),
      extractionCount: Number(r.extractionCount),
    }));
  }

  async countExtractionsForMines(mineIds: number[]): Promise<MineExtractionCount[]> {
    if (mineIds.length === 0) {
      return [];
    }
    const rows = await this.repository
      .createQueryBuilder("e")
      .select("e.mineId", "mineId")
      .addSelect("COUNT(e.id)", "extractionCount")
      .where("e.mineId IN (:...ids)", { ids: mineIds })
      .groupBy("e.mineId")
      .getRawMany<{ mineId: number; extractionCount: string }>();
    return rows.map((r) => ({
      mineId: Number(r.mineId),
      extractionCount: Number(r.extractionCount),
    }));
  }

  findRecentForMine(mineId: number): Promise<NixExtraction[]> {
    return this.repository.find({
      where: { mineId },
      order: { createdAt: "DESC" },
      take: 200,
    });
  }

  async searchByDocNumber(
    query: string,
    mineId: number | null,
    limit: number,
  ): Promise<DocNumberSearchRow[]> {
    const qb = this.repository
      .createQueryBuilder("e")
      .leftJoin(SaMine, "m", "m.id = e.mineId")
      .where("e.documentNumber IS NOT NULL")
      .andWhere("e.documentNumber ILIKE :q", { q: `${query}%` })
      .orderBy("e.createdAt", "DESC")
      .take(limit)
      .select([
        "e.id AS extraction_id",
        'e."documentNumber" AS document_number',
        'e."documentRevision" AS document_revision',
        "e.extracted_data AS extracted_data",
        "e.mine_id AS mine_id",
        "m.mine_name AS mine_name",
        "e.created_at AS created_at",
      ]);

    if (mineId !== null) {
      qb.andWhere("e.mineId = :mineId", { mineId });
    }

    return qb.getRawMany<DocNumberSearchRow>();
  }

  findRevisionsForDocument(
    documentNumber: string,
    mineId: number | null,
  ): Promise<NixExtraction[]> {
    const where: Record<string, unknown> = { documentNumber };
    if (mineId !== null) {
      where.mineId = mineId;
    }
    return this.repository.find({
      where,
      order: { isLatestRevision: "DESC", createdAt: "DESC" },
    });
  }

  async clearMineAttachment(extractionId: number): Promise<number> {
    const result = await this.repository.update(
      { id: extractionId, mineId: Not(IsNull()) },
      {
        mineId: undefined,
        mineInferenceConfidence: undefined,
        mineInferenceReason: "manual_clear",
      },
    );
    return result.affected ?? 0;
  }

  findLatestCompletedByDocNumber(
    documentNumber: string,
    mineId: number | null,
  ): Promise<NixExtraction | null> {
    const qb = this.repository
      .createQueryBuilder("e")
      .where("e.documentNumber = :documentNumber", { documentNumber })
      .andWhere("e.status = :status", { status: ExtractionStatus.COMPLETED })
      .andWhere("e.isLatestRevision = :latest", { latest: true })
      .orderBy("e.documentRevision", "DESC", "NULLS LAST")
      .addOrderBy("e.createdAt", "DESC")
      .limit(1);

    if (mineId && mineId > 0) {
      qb.andWhere("e.mineId = :mineId", { mineId });
    }

    return qb.getOne();
  }

  findUsableSessionSiblings(
    sessionId: number,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]> {
    const completedStatuses = [ExtractionStatus.COMPLETED, ExtractionStatus.NEEDS_CLARIFICATION];
    return this.repository
      .createQueryBuilder("extraction")
      .where("extraction.session_id = :sessionId", { sessionId })
      .andWhere("extraction.id <> :excludeId", { excludeId: excludeExtractionId })
      .andWhere("extraction.status IN (:...completedStatuses)", { completedStatuses })
      .orderBy("extraction.created_at", "ASC")
      .getMany();
  }

  findUsableSourceSiblings(
    sourceModule: string,
    sourceId: number,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]> {
    const completedStatuses = [ExtractionStatus.COMPLETED, ExtractionStatus.NEEDS_CLARIFICATION];
    return this.repository
      .createQueryBuilder("extraction")
      .where("extraction.source_module = :sourceModule", { sourceModule })
      .andWhere("extraction.source_id = :sourceId", { sourceId })
      .andWhere("extraction.id <> :excludeId", { excludeId: excludeExtractionId })
      .andWhere("extraction.status IN (:...completedStatuses)", { completedStatuses })
      .orderBy("extraction.created_at", "ASC")
      .getMany();
  }
}
