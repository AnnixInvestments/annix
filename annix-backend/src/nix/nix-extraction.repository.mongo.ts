import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ExtractionStatus, NixExtraction } from "./entities/nix-extraction.entity";
import {
  type DocNumberSearchRow,
  type MineExtractionCount,
  NixExtractionRepository,
  type RevisionCandidateParams,
  type SameSessionDuplicateParams,
} from "./nix-extraction.repository";

@Injectable()
export class MongoNixExtractionRepository
  extends MongoCrudRepository<NixExtraction>
  implements NixExtractionRepository
{
  constructor(@InjectModel("NixExtraction") model: Model<NixExtraction>) {
    super(model);
  }

  private get mineModel(): Model<Record<string, unknown>> {
    return this.model.db.model<Record<string, unknown>>("SaMine");
  }

  async findBySessionOrderedAsc(sessionId: number): Promise<NixExtraction[]> {
    return this.toDomainList(
      await this.documents.find({ sessionId }).sort({ _id: 1 }).lean().exec(),
    );
  }

  async findLatestSameSessionDuplicate(
    params: SameSessionDuplicateParams,
  ): Promise<NixExtraction | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          sessionId: params.sessionId,
          documentName: params.documentName,
          status: { $ne: ExtractionStatus.FAILED },
        })
        .sort({ _id: -1 })
        .lean()
        .exec(),
    );
  }

  async findByIdWithUserAndRfq(id: number): Promise<NixExtraction | null> {
    return this.toDomain(await this.documents.findById(id).populate(["user", "rfq"]).lean().exec());
  }

  async findRecentForUser(userId: number): Promise<NixExtraction[]> {
    return this.toDomainList(
      await this.documents.find({ userId }).sort({ createdAt: -1 }).limit(50).lean().exec(),
    );
  }

  async findRevisionCandidates(params: RevisionCandidateParams): Promise<NixExtraction[]> {
    const query: Record<string, unknown> = {
      documentNumber: params.documentNumber,
      isLatestRevision: true,
      status: ExtractionStatus.COMPLETED,
    };
    if (params.mineId && params.mineCountry) {
      query.mineId = params.mineId;
      query.mineCountry = params.mineCountry;
    } else {
      query.mineId = null;
    }
    return this.toDomainList(await this.documents.find(query).lean().exec());
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
    await this.documents.findByIdAndUpdate(extractionId, { $set: patch }).exec();
  }

  async countExtractionsByMine(): Promise<MineExtractionCount[]> {
    const rows = await this.documents.aggregate<{ _id: number; extractionCount: number }>([
      { $match: { mineId: { $ne: null } } },
      { $group: { _id: "$mineId", extractionCount: { $sum: 1 } } },
    ]);
    return rows.map((r) => ({
      mineId: Number(r._id),
      extractionCount: Number(r.extractionCount),
    }));
  }

  async countExtractionsForMines(mineIds: number[]): Promise<MineExtractionCount[]> {
    if (mineIds.length === 0) {
      return [];
    }
    const rows = await this.documents.aggregate<{ _id: number; extractionCount: number }>([
      { $match: { mineId: { $in: mineIds } } },
      { $group: { _id: "$mineId", extractionCount: { $sum: 1 } } },
    ]);
    return rows.map((r) => ({
      mineId: Number(r._id),
      extractionCount: Number(r.extractionCount),
    }));
  }

  async findRecentForMine(mineId: number): Promise<NixExtraction[]> {
    return this.toDomainList(
      await this.documents.find({ mineId }).sort({ createdAt: -1 }).limit(200).lean().exec(),
    );
  }

  async searchByDocNumber(
    query: string,
    mineId: number | null,
    limit: number,
  ): Promise<DocNumberSearchRow[]> {
    const filter: Record<string, unknown> = {
      documentNumber: { $regex: `^${escapeRegex(query)}`, $options: "i" },
    };
    if (mineId !== null) {
      filter.mineId = mineId;
    }
    const rows = await this.documents
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    const mineIds = rows
      .map((r) => (r.mineId === undefined || r.mineId === null ? null : Number(r.mineId)))
      .filter((value): value is number => value !== null);
    const mines =
      mineIds.length > 0
        ? await this.mineModel
            .find({ _id: { $in: mineIds } })
            .lean()
            .exec()
        : [];
    const nameById = new Map(mines.map((m) => [Number(m._id), m.mineName as string]));
    return rows.map((r) => ({
      extraction_id: Number(r._id),
      document_number: r.documentNumber as string,
      document_revision: (r.documentRevision as string | null) ?? null,
      extracted_data: (r.extractedData as Record<string, unknown> | null) ?? null,
      mine_id: r.mineId === undefined || r.mineId === null ? null : Number(r.mineId),
      mine_name:
        r.mineId === undefined || r.mineId === null
          ? null
          : (nameById.get(Number(r.mineId)) ?? null),
      created_at: r.createdAt as Date,
    }));
  }

  async findRevisionsForDocument(
    documentNumber: string,
    mineId: number | null,
  ): Promise<NixExtraction[]> {
    const filter: Record<string, unknown> = { documentNumber };
    if (mineId !== null) {
      filter.mineId = mineId;
    }
    return this.toDomainList(
      await this.documents.find(filter).sort({ isLatestRevision: -1, createdAt: -1 }).lean().exec(),
    );
  }

  async clearMineAttachment(extractionId: number): Promise<number> {
    const result = await this.documents
      .updateOne(
        { _id: extractionId, mineId: { $ne: null } },
        {
          $unset: { mineId: "", mineInferenceConfidence: "" },
          $set: { mineInferenceReason: "manual_clear" },
        },
      )
      .exec();
    return result.modifiedCount ?? 0;
  }

  async findLatestCompletedByDocNumber(
    documentNumber: string,
    mineId: number | null,
  ): Promise<NixExtraction | null> {
    const filter: Record<string, unknown> = {
      documentNumber,
      status: ExtractionStatus.COMPLETED,
      isLatestRevision: true,
    };
    if (mineId && mineId > 0) {
      filter.mineId = mineId;
    }
    return this.toDomain(
      await this.documents
        .findOne(filter)
        .sort({ documentRevision: -1, createdAt: -1 })
        .lean()
        .exec(),
    );
  }

  async findUsableSessionSiblings(
    sessionId: number,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]> {
    const completedStatuses = [ExtractionStatus.COMPLETED, ExtractionStatus.NEEDS_CLARIFICATION];
    return this.toDomainList(
      await this.documents
        .find({
          sessionId,
          _id: { $ne: excludeExtractionId },
          status: { $in: completedStatuses },
        })
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
    );
  }

  async findUsableSourceSiblings(
    sourceModule: string,
    sourceId: number,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]> {
    const completedStatuses = [ExtractionStatus.COMPLETED, ExtractionStatus.NEEDS_CLARIFICATION];
    return this.toDomainList(
      await this.documents
        .find({
          sourceModule,
          sourceId,
          _id: { $ne: excludeExtractionId },
          status: { $in: completedStatuses },
        })
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
    );
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
