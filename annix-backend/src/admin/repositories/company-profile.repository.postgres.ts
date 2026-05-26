import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { CompanyProfile } from "../entities/company-profile.entity";
import { CompanyProfileRepository } from "./company-profile.repository";

@Injectable()
export class PostgresCompanyProfileRepository
  extends TypeOrmCrudRepository<CompanyProfile>
  implements CompanyProfileRepository
{
  constructor(@InjectRepository(CompanyProfile) repository: Repository<CompanyProfile>) {
    super(repository);
  }

  findSingleton(): Promise<CompanyProfile | null> {
    return this.repository.findOne({ where: { id: 1 } });
  }
}
