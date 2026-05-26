import { CrudRepository } from "../lib/persistence/crud-repository";
import { Drawing } from "./entities/drawing.entity";

export interface DrawingListParams {
  status?: string | null;
  rfqId?: number | null;
  uploadedByUserId?: number | null;
  search?: string | null;
  skip: number;
  limit: number;
}

export abstract class DrawingRepository extends CrudRepository<Drawing> {
  abstract findLastByNumberPrefix(prefix: string): Promise<Drawing | null>;
  abstract findAllPaginated(params: DrawingListParams): Promise<[Drawing[], number]>;
  abstract findOneWithRelations(id: number): Promise<Drawing | null>;
}
