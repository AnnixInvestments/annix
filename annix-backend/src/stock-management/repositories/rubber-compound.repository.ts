import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { RubberCompound } from "../entities/rubber-compound.entity";

export abstract class RubberCompoundRepository extends CrudRepository<RubberCompound> {
  abstract build(data: DeepPartial<RubberCompound>): RubberCompound;
  abstract saveMany(compounds: RubberCompound[]): Promise<RubberCompound[]>;
  abstract findForCompany(companyId: number, includeInactive: boolean): Promise<RubberCompound[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<RubberCompound | null>;
  abstract findOneByCode(companyId: number, code: string): Promise<RubberCompound | null>;
  abstract findAllForCompany(companyId: number): Promise<RubberCompound[]>;
  abstract updateById(id: number, patch: DeepPartial<RubberCompound>): Promise<void>;
}
