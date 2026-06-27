import { CrudRepository } from "../lib/persistence/crud-repository";
import { NixExtractionRegion } from "./entities/nix-extraction-region.entity";

export abstract class NixExtractionRegionRepository extends CrudRepository<NixExtractionRegion> {
  abstract findCustomFieldDefinitions(): Promise<NixExtractionRegion[]>;
  abstract findCustomFieldDefinitionsForCategory(
    documentCategory: string,
  ): Promise<NixExtractionRegion[]>;
  abstract findActiveByCategoryAndField(
    documentCategory: string,
    fieldName: string,
    quarantined?: boolean,
  ): Promise<NixExtractionRegion | null>;
  abstract findActiveForCategory(documentCategory: string): Promise<NixExtractionRegion[]>;
  abstract findAllActive(): Promise<NixExtractionRegion[]>;
  abstract deactivate(id: number): Promise<void>;
}
