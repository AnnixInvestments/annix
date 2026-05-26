import { CrudRepository } from "../lib/persistence/crud-repository";
import { OperationalStatus, SaMine } from "./entities/sa-mine.entity";

export interface SaMineFilters {
  commodityId?: number;
  province?: string;
  status?: OperationalStatus;
}

export abstract class SaMineRepository extends CrudRepository<SaMine> {
  abstract findFiltered(filters: SaMineFilters): Promise<SaMine[]>;
  abstract findByIdWithCommodity(id: number): Promise<SaMine | null>;
  abstract distinctProvinces(): Promise<string[]>;
  abstract createMine(data: Partial<SaMine>): Promise<SaMine>;
  abstract findCreatedMine(id: number): Promise<SaMine>;
  abstract findByIds(ids: number[]): Promise<SaMine[]>;
  abstract searchByName(query: string | null): Promise<SaMine[]>;
  abstract findByNameAndCompany(mineName: string, operatingCompany: string): Promise<SaMine | null>;
}
