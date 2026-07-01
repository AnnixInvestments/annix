import { CrudRepository } from "../lib/persistence/crud-repository";
import { Boq } from "./entities/boq.entity";

export interface BoqListParams {
  status?: string | null;
  drawingId?: number | null;
  rfqId?: number | null;
  createdByUserId?: number | null;
  search?: string | null;
  skip: number;
  limit: number;
}

export interface BoqTotalsResult {
  totalQuantity: number;
  totalWeightKg: number;
  totalEstimatedCost: number;
}

export interface BoqRfqLink {
  boqId: number;
  rfqId: number;
}

export abstract class BoqRepository extends CrudRepository<Boq> {
  abstract findLastByNumberPrefix(prefix: string): Promise<Boq | null>;
  abstract findAllPaginated(params: BoqListParams): Promise<[Boq[], number]>;
  abstract findOneWithRelations(id: number): Promise<Boq | null>;
  abstract recalculateTotals(boqId: number): Promise<void>;
  abstract findRfqLinksByRfqIds(rfqIds: number[]): Promise<BoqRfqLink[]>;
  abstract findByRfqId(rfqId: number): Promise<Boq[]>;
  abstract findBySourceBucket(
    sourceSessionId: number,
    sourceBucketRef: string,
  ): Promise<Boq | null>;
}
