import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { isString } from "es-toolkit/compat";
import { ILike, In, IsNull, Not, Repository } from "typeorm";
import { SaMine } from "../../mines/entities/sa-mine.entity";
import { NixExtraction } from "../entities/nix-extraction.entity";
import {
  type CreateMineDto,
  type CreateMineResponseDto,
  type DocNumberSearchRowDto,
  type MineExtractionRowDto,
  type MineSummaryDto,
} from "./dto/mine-library.dto";

@Injectable()
export class MineLibraryService {
  private readonly logger = new Logger(MineLibraryService.name);

  constructor(
    @InjectRepository(SaMine)
    private readonly mineRepo: Repository<SaMine>,
    @InjectRepository(NixExtraction)
    private readonly extractionRepo: Repository<NixExtraction>,
  ) {}

  async listMinesWithExtractions(): Promise<MineSummaryDto[]> {
    const rows = await this.extractionRepo
      .createQueryBuilder("e")
      .select("e.mineId", "mineId")
      .addSelect("COUNT(e.id)", "extractionCount")
      .where("e.mineId IS NOT NULL")
      .groupBy("e.mineId")
      .getRawMany<{ mineId: number; extractionCount: string }>();

    if (rows.length === 0) return [];

    const mineIds = rows.map((r) => Number(r.mineId));
    const mines = await this.mineRepo.findBy({ id: In(mineIds) });
    const countById = new Map(rows.map((r) => [Number(r.mineId), Number(r.extractionCount)]));

    return mines
      .map((m) => ({
        id: m.id,
        mineName: m.mineName,
        operatingCompany: m.operatingCompany,
        province: m.province,
        extractionCount: countById.get(m.id) ?? 0,
      }))
      .sort((a, b) => a.mineName.localeCompare(b.mineName));
  }

  async listMines(query: string | null): Promise<MineSummaryDto[]> {
    const where = query
      ? [{ mineName: ILike(`%${query}%`) }, { operatingCompany: ILike(`%${query}%`) }]
      : undefined;
    const mines = await this.mineRepo.find({
      where,
      order: { mineName: "ASC" },
      take: 50,
    });

    if (mines.length === 0) return [];

    const counts = await this.extractionRepo
      .createQueryBuilder("e")
      .select("e.mineId", "mineId")
      .addSelect("COUNT(e.id)", "extractionCount")
      .where("e.mineId IN (:...ids)", { ids: mines.map((m) => m.id) })
      .groupBy("e.mineId")
      .getRawMany<{ mineId: number; extractionCount: string }>();
    const countById = new Map(counts.map((r) => [Number(r.mineId), Number(r.extractionCount)]));

    return mines.map((m) => ({
      id: m.id,
      mineName: m.mineName,
      operatingCompany: m.operatingCompany,
      province: m.province,
      extractionCount: countById.get(m.id) ?? 0,
    }));
  }

  async listExtractionsForMine(mineId: number): Promise<MineExtractionRowDto[]> {
    const mine = await this.mineRepo.findOne({ where: { id: mineId } });
    if (!mine) throw new NotFoundException(`Mine ${mineId} not found`);

    const extractions = await this.extractionRepo.find({
      where: { mineId },
      order: { createdAt: "DESC" },
      take: 200,
    });

    return extractions.map((e) => this.toExtractionRow(e));
  }

  async searchByDocNumber(
    query: string,
    mineId: number | null,
    limit: number,
  ): Promise<DocNumberSearchRowDto[]> {
    const qb = this.extractionRepo
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

    const rows = await qb.getRawMany<{
      extraction_id: number;
      document_number: string;
      document_revision: string | null;
      extracted_data: Record<string, unknown> | null;
      mine_id: number | null;
      mine_name: string | null;
      created_at: Date;
    }>();

    return rows.map((r) => ({
      extractionId: Number(r.extraction_id),
      documentNumber: r.document_number,
      documentRevision: r.document_revision,
      documentTitle: titleFromExtractedData(r.extracted_data),
      mineId: r.mine_id ? Number(r.mine_id) : null,
      mineName: r.mine_name,
      createdAt: new Date(r.created_at),
    }));
  }

  async createMine(dto: CreateMineDto): Promise<CreateMineResponseDto> {
    const exists = await this.mineRepo.findOne({
      where: { mineName: ILike(dto.mineName), operatingCompany: ILike(dto.operatingCompany) },
    });
    if (exists) {
      throw new BadRequestException(
        `Mine '${dto.mineName}' (${dto.operatingCompany}) already exists; use mine #${exists.id}.`,
      );
    }

    const mine = this.mineRepo.create({
      mineName: dto.mineName,
      operatingCompany: dto.operatingCompany,
      commodityId: dto.commodityId ?? 1,
      province: dto.province ?? "Unknown",
    });
    const saved = await this.mineRepo.save(mine);

    let retagged: number | null = null;
    if (dto.retagExtractionId) {
      const extraction = await this.extractionRepo.findOne({
        where: { id: dto.retagExtractionId },
      });
      if (!extraction) {
        throw new NotFoundException(`Extraction ${dto.retagExtractionId} not found.`);
      }
      extraction.mineId = saved.id;
      extraction.mineInferenceConfidence = 1;
      extraction.mineInferenceReason = "manual_create_from_extraction";
      await this.extractionRepo.save(extraction);
      retagged = extraction.id;
    }

    this.logger.log(
      `Created mine #${saved.id} '${saved.mineName}' (${saved.operatingCompany}); retagged extraction=${retagged}`,
    );

    return {
      mine: {
        id: saved.id,
        mineName: saved.mineName,
        operatingCompany: saved.operatingCompany,
        province: saved.province,
        extractionCount: retagged === null ? 0 : 1,
      },
      retaggedExtractionId: retagged,
    };
  }

  async retagExtraction(extractionId: number, mineId: number): Promise<MineExtractionRowDto> {
    const extraction = await this.extractionRepo.findOne({ where: { id: extractionId } });
    if (!extraction) throw new NotFoundException(`Extraction ${extractionId} not found.`);

    const mine = await this.mineRepo.findOne({ where: { id: mineId } });
    if (!mine) throw new NotFoundException(`Mine ${mineId} not found.`);

    extraction.mineId = mineId;
    extraction.mineInferenceConfidence = 1;
    extraction.mineInferenceReason = "manual_override";
    const saved = await this.extractionRepo.save(extraction);

    return this.toExtractionRow(saved);
  }

  async clearMine(extractionId: number): Promise<void> {
    const result = await this.extractionRepo.update(
      { id: extractionId, mineId: Not(IsNull()) },
      {
        mineId: undefined,
        mineInferenceConfidence: undefined,
        mineInferenceReason: "manual_clear",
      },
    );
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException(`Extraction ${extractionId} not found or has no mine attached.`);
    }
  }

  private toExtractionRow(e: NixExtraction): MineExtractionRowDto {
    const confidence =
      e.mineInferenceConfidence === undefined || e.mineInferenceConfidence === null
        ? null
        : Number(e.mineInferenceConfidence);
    return {
      id: e.id,
      documentNumber: e.documentNumber ?? null,
      documentRevision: e.documentRevision ?? null,
      documentTitle: titleFromExtractedData(e.extractedData ?? null),
      sourceFilename: e.documentName ?? null,
      status: e.status,
      mineInferenceConfidence: confidence,
      mineInferenceReason: e.mineInferenceReason ?? null,
      createdAt: e.createdAt,
    };
  }
}

const TITLE_KEYS = ["documentTitle", "title", "docTitle"] as const;

const titleFromExtractedData = (data: Record<string, unknown> | null): string | null => {
  if (!data) return null;
  const metadata = (data.metadata ?? data) as Record<string, unknown>;
  if (!metadata || typeof metadata !== "object") return null;
  const value = TITLE_KEYS.map((k) => metadata[k]).find(
    (v): v is string => isString(v) && v.trim().length > 0,
  );
  return value ? value.trim() : null;
};
