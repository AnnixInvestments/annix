import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { DashboardPreference } from "../entities/dashboard-preference.entity";
import { DashboardPreferenceRepository } from "./dashboard-preference.repository";

@Injectable()
export class PostgresDashboardPreferenceRepository
  extends TypeOrmCrudRepository<DashboardPreference>
  implements DashboardPreferenceRepository
{
  constructor(
    @InjectRepository(DashboardPreference)
    repository: Repository<DashboardPreference>,
  ) {
    super(repository);
  }

  findOneForUser(companyId: number, userId: number): Promise<DashboardPreference | null> {
    return this.repository.findOne({ where: { companyId, userId } });
  }
}
