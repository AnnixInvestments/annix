import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberPoExtractionTemplate } from "../entities/rubber-po-extraction-template.entity";

export abstract class RubberPoExtractionTemplateRepository extends CrudRepository<RubberPoExtractionTemplate> {
  abstract build(data: Partial<RubberPoExtractionTemplate>): RubberPoExtractionTemplate;
  abstract findActiveByCompanyAndHashWithRegions(
    companyId: number,
    formatHash: string,
  ): Promise<RubberPoExtractionTemplate | null>;
  abstract findActiveByCompanyAndHash(
    companyId: number,
    formatHash: string,
  ): Promise<RubberPoExtractionTemplate | null>;
  abstract findActiveByCompanyWithRegions(companyId: number): Promise<RubberPoExtractionTemplate[]>;
  abstract findByIdWithRegions(id: number): Promise<RubberPoExtractionTemplate | null>;
  abstract deactivateById(id: number): Promise<void>;
  abstract countActiveByCompany(companyId: number): Promise<number>;
}
