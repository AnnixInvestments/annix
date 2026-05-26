import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { isString } from "es-toolkit/compat";
import { SaMineRepository } from "../../mines/sa-mine.repository";
import { NixExtraction } from "../entities/nix-extraction.entity";
import { NixExtractionRepository } from "../nix-extraction.repository";
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
    private readonly mineRepo: SaMineRepository,
    private readonly extractionRepo: NixExtractionRepository,
  ) {}

  async listMinesWithExtractions(): Promise<MineSummaryDto[]> {
    const rows = await this.extractionRepo.countExtractionsByMine();

    if (rows.length === 0) return [];

    const mineIds = rows.map((r) => Number(r.mineId));
    const mines = await this.mineRepo.findByIds(mineIds);
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
    const mines = await this.mineRepo.searchByName(query);

    if (mines.length === 0) return [];

    const counts = await this.extractionRepo.countExtractionsForMines(mines.map((m) => m.id));
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
    const mine = await this.mineRepo.findById(mineId);
    if (!mine) throw new NotFoundException(`Mine ${mineId} not found`);

    const extractions = await this.extractionRepo.findRecentForMine(mineId);

    return extractions.map((e) => this.toExtractionRow(e));
  }

  async searchByDocNumber(
    query: string,
    mineId: number | null,
    limit: number,
  ): Promise<DocNumberSearchRowDto[]> {
    const rows = await this.extractionRepo.searchByDocNumber(query, mineId, limit);

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
    const exists = await this.mineRepo.findByNameAndCompany(dto.mineName, dto.operatingCompany);
    if (exists) {
      throw new BadRequestException(
        `Mine '${dto.mineName}' (${dto.operatingCompany}) already exists; use mine #${exists.id}.`,
      );
    }

    const saved = await this.mineRepo.createMine({
      mineName: dto.mineName,
      operatingCompany: dto.operatingCompany,
      commodityId: dto.commodityId ?? 1,
      province: dto.province ?? "Unknown",
    });

    let retagged: number | null = null;
    if (dto.retagExtractionId) {
      const extraction = await this.extractionRepo.findById(dto.retagExtractionId);
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
    const extraction = await this.extractionRepo.findById(extractionId);
    if (!extraction) throw new NotFoundException(`Extraction ${extractionId} not found.`);

    const mine = await this.mineRepo.findById(mineId);
    if (!mine) throw new NotFoundException(`Mine ${mineId} not found.`);

    extraction.mineId = mineId;
    extraction.mineInferenceConfidence = 1;
    extraction.mineInferenceReason = "manual_override";
    const saved = await this.extractionRepo.save(extraction);

    return this.toExtractionRow(saved);
  }

  /**
   * Returns every extraction known for a given document number — current
   * canonical (is_latest_revision = true) at the top, superseded older
   * versions below, sorted by createdAt DESC within each group. Powers the
   * mine-document archive page so the user can audit what's been replaced
   * by what.
   */
  async listRevisionsForDocument(
    documentNumber: string,
    mineId: number | null,
  ): Promise<MineExtractionRowDto[]> {
    const rows = await this.extractionRepo.findRevisionsForDocument(documentNumber, mineId);
    return rows.map((e) => this.toExtractionRow(e));
  }

  async clearMine(extractionId: number): Promise<void> {
    const affected = await this.extractionRepo.clearMineAttachment(extractionId);
    if (affected === 0) {
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
      isLatestRevision: e.isLatestRevision,
      supersededByExtractionId: e.supersededByExtractionId ?? null,
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
