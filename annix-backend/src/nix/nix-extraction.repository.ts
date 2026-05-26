import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixExtraction } from "./entities/nix-extraction.entity";

export interface ExtractionsBySessionParams {
  sessionId: number;
}

export interface SameSessionDuplicateParams {
  sessionId: number;
  documentName: string;
}

export interface RevisionCandidateParams {
  documentNumber: string;
  mineId: number | null;
  mineCountry: string | null;
}

export interface MineExtractionCount {
  mineId: number;
  extractionCount: number;
}

export interface DocNumberSearchRow {
  extraction_id: number;
  document_number: string;
  document_revision: string | null;
  extracted_data: Record<string, unknown> | null;
  mine_id: number | null;
  mine_name: string | null;
  created_at: Date;
}

export abstract class NixExtractionRepository extends CrudRepository<NixExtraction> {
  abstract findBySessionOrderedAsc(sessionId: number): Promise<NixExtraction[]>;
  abstract findLatestSameSessionDuplicate(
    params: SameSessionDuplicateParams,
  ): Promise<NixExtraction | null>;
  abstract findByIdWithUserAndRfq(id: number): Promise<NixExtraction | null>;
  abstract findRecentForUser(userId: number): Promise<NixExtraction[]>;
  abstract findRevisionCandidates(params: RevisionCandidateParams): Promise<NixExtraction[]>;
  abstract markSuperseded(
    extractionId: number,
    isLatestRevision: boolean,
    supersededByExtractionId: number | null,
  ): Promise<void>;
  abstract countExtractionsByMine(): Promise<MineExtractionCount[]>;
  abstract countExtractionsForMines(mineIds: number[]): Promise<MineExtractionCount[]>;
  abstract findRecentForMine(mineId: number): Promise<NixExtraction[]>;
  abstract searchByDocNumber(
    query: string,
    mineId: number | null,
    limit: number,
  ): Promise<DocNumberSearchRow[]>;
  abstract findRevisionsForDocument(
    documentNumber: string,
    mineId: number | null,
  ): Promise<NixExtraction[]>;
  abstract clearMineAttachment(extractionId: number): Promise<number>;
  abstract findLatestCompletedByDocNumber(
    documentNumber: string,
    mineId: number | null,
  ): Promise<NixExtraction | null>;
  abstract findUsableSessionSiblings(
    sessionId: number,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]>;
  abstract findUsableSourceSiblings(
    sourceModule: string,
    sourceId: number,
    excludeExtractionId: number,
  ): Promise<NixExtraction[]>;
}
