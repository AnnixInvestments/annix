import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import { CompanyType, RubberCompany } from "../entities/rubber-company.entity";

export abstract class RubberCompanyRepository extends CrudRepository<RubberCompany> {
  abstract build(data: Partial<RubberCompany>): RubberCompany;
  abstract findOneByIdOrFail(id: number): Promise<RubberCompany>;
  abstract findByCompanyType(companyType: CompanyType): Promise<RubberCompany[]>;
  abstract findOneByNameAndType(
    upperName: string,
    companyType: CompanyType,
  ): Promise<RubberCompany | null>;
  abstract findOneByNameLike(namePattern: string): Promise<RubberCompany | null>;
  abstract findOneByTrimmedNameAndType(
    name: string,
    companyType: string,
  ): Promise<RubberCompany | null>;
  abstract findByCompoundOwner(isCompoundOwner: boolean): Promise<RubberCompany[]>;
  abstract findByIds(ids: number[]): Promise<RubberCompany[]>;
  abstract findUnmappedToSage(): Promise<RubberCompany[]>;
  abstract findAllOrderedByName(): Promise<RubberCompany[]>;
  abstract findAllWithPricingTierOrderedByName(): Promise<RubberCompany[]>;
  abstract countUnmappedToSage(): Promise<number>;
  abstract updateById(id: number, updates: DeepPartial<RubberCompany>): Promise<void>;
  abstract deleteById(id: number): Promise<boolean>;
}
