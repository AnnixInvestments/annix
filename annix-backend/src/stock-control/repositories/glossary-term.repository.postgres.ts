import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { GlossaryTerm } from "../entities/glossary-term.entity";
import { GlossaryTermRepository } from "./glossary-term.repository";

@Injectable()
export class PostgresGlossaryTermRepository
  extends TypeOrmCrudRepository<GlossaryTerm>
  implements GlossaryTermRepository
{
  constructor(@InjectRepository(GlossaryTerm) repository: Repository<GlossaryTerm>) {
    super(repository);
  }

  findForCompanyOrdered(companyId: number): Promise<GlossaryTerm[]> {
    return this.repository.find({
      where: { companyId },
      order: { abbreviation: "ASC" },
    });
  }

  findOneForCompanyByAbbreviation(
    companyId: number,
    abbreviation: string,
  ): Promise<GlossaryTerm | null> {
    return this.repository.findOne({
      where: { companyId, abbreviation },
    });
  }

  async deleteForCompanyByAbbreviation(companyId: number, abbreviation: string): Promise<void> {
    await this.repository.delete({ companyId, abbreviation });
  }

  async deleteAllForCompany(companyId: number): Promise<void> {
    await this.repository.delete({ companyId });
  }
}
