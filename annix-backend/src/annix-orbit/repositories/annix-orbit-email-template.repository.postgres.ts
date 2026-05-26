import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import {
  AnnixOrbitEmailTemplate,
  CvEmailTemplateKind,
} from "../entities/annix-orbit-email-template.entity";
import { AnnixOrbitEmailTemplateRepository } from "./annix-orbit-email-template.repository";

@Injectable()
export class PostgresAnnixOrbitEmailTemplateRepository
  extends TypeOrmCrudRepository<AnnixOrbitEmailTemplate>
  implements AnnixOrbitEmailTemplateRepository
{
  constructor(
    @InjectRepository(AnnixOrbitEmailTemplate)
    repository: Repository<AnnixOrbitEmailTemplate>,
  ) {
    super(repository);
  }

  findForCompany(companyId: number): Promise<AnnixOrbitEmailTemplate[]> {
    return this.repository.find({ where: { companyId } });
  }

  findForCompanyKind(
    companyId: number,
    kind: CvEmailTemplateKind,
  ): Promise<AnnixOrbitEmailTemplate | null> {
    return this.repository.findOne({ where: { companyId, kind } });
  }

  async deleteForCompanyKind(companyId: number, kind: CvEmailTemplateKind): Promise<void> {
    await this.repository.delete({ companyId, kind });
  }
}
