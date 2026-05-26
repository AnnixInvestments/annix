import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { AnnixOrbitCompany } from "../entities/annix-orbit-company.entity";
import { AnnixOrbitCompanyRepository } from "./annix-orbit-company.repository";

@Injectable()
export class PostgresAnnixOrbitCompanyRepository
  extends TypeOrmCrudRepository<AnnixOrbitCompany>
  implements AnnixOrbitCompanyRepository
{
  constructor(@InjectRepository(AnnixOrbitCompany) repository: Repository<AnnixOrbitCompany>) {
    super(repository);
  }

  async mirrorCompany(id: number, name: string): Promise<void> {
    await this.repository.query(
      `INSERT INTO cv_assistant_companies (id, name, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [id, name],
    );
    await this.repository.query(
      `SELECT setval('cv_assistant_companies_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM cv_assistant_companies), $1))`,
      [id],
    );
  }
}
