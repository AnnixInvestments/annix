import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { NixExtractionRegion } from "./entities/nix-extraction-region.entity";
import { NixExtractionRegionRepository } from "./nix-extraction-region.repository";

@Injectable()
export class PostgresNixExtractionRegionRepository
  extends TypeOrmCrudRepository<NixExtractionRegion>
  implements NixExtractionRegionRepository
{
  constructor(@InjectRepository(NixExtractionRegion) repository: Repository<NixExtractionRegion>) {
    super(repository);
  }

  findCustomFieldDefinitions(): Promise<NixExtractionRegion[]> {
    return this.repository.find({
      where: { isCustomField: true, isActive: true },
      order: { documentCategory: "ASC", fieldName: "ASC" },
    });
  }

  findCustomFieldDefinitionsForCategory(documentCategory: string): Promise<NixExtractionRegion[]> {
    return this.repository.find({
      where: { isCustomField: true, isActive: true, documentCategory },
      order: { fieldName: "ASC" },
    });
  }

  findActiveByCategoryAndField(
    documentCategory: string,
    fieldName: string,
  ): Promise<NixExtractionRegion | null> {
    return this.repository.findOne({
      where: {
        documentCategory,
        fieldName,
        isActive: true,
      },
    });
  }

  findActiveForCategory(documentCategory: string): Promise<NixExtractionRegion[]> {
    return this.repository.find({
      where: {
        documentCategory,
        isActive: true,
      },
      order: {
        fieldName: "ASC",
      },
    });
  }

  findAllActive(): Promise<NixExtractionRegion[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { documentCategory: "ASC", fieldName: "ASC" },
    });
  }

  async deactivate(id: number): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }
}
