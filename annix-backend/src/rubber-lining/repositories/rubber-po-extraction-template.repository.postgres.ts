import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberPoExtractionTemplate } from "../entities/rubber-po-extraction-template.entity";
import { RubberPoExtractionTemplateRepository } from "./rubber-po-extraction-template.repository";

@Injectable()
export class PostgresRubberPoExtractionTemplateRepository
  extends TypeOrmCrudRepository<RubberPoExtractionTemplate>
  implements RubberPoExtractionTemplateRepository
{
  constructor(
    @InjectRepository(RubberPoExtractionTemplate)
    repository: Repository<RubberPoExtractionTemplate>,
  ) {
    super(repository);
  }

  build(data: Partial<RubberPoExtractionTemplate>): RubberPoExtractionTemplate {
    return this.repository.create(data as TypeOrmDeepPartial<RubberPoExtractionTemplate>);
  }

  findActiveByCompanyAndHashWithRegions(
    companyId: number,
    formatHash: string,
  ): Promise<RubberPoExtractionTemplate | null> {
    return this.repository.findOne({
      where: { companyId, formatHash, isActive: true },
      relations: ["regions"],
    });
  }

  findActiveByCompanyAndHash(
    companyId: number,
    formatHash: string,
  ): Promise<RubberPoExtractionTemplate | null> {
    return this.repository.findOne({
      where: { companyId, formatHash, isActive: true },
    });
  }

  findActiveByCompanyWithRegions(companyId: number): Promise<RubberPoExtractionTemplate[]> {
    return this.repository.find({
      where: { companyId, isActive: true },
      relations: ["regions"],
      order: { createdAt: "DESC" },
    });
  }

  findByIdWithRegions(id: number): Promise<RubberPoExtractionTemplate | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["regions"],
    });
  }

  async deactivateById(id: number): Promise<void> {
    await this.repository.update(id, { isActive: false });
  }

  countActiveByCompany(companyId: number): Promise<number> {
    return this.repository.count({
      where: { companyId, isActive: true },
    });
  }
}
