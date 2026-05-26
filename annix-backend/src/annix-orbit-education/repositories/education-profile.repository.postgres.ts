import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { EducationProfile } from "../entities/education-profile.entity";
import { EducationProfileRepository } from "./education-profile.repository";

@Injectable()
export class PostgresEducationProfileRepository
  extends TypeOrmCrudRepository<EducationProfile>
  implements EducationProfileRepository
{
  constructor(@InjectRepository(EducationProfile) repository: Repository<EducationProfile>) {
    super(repository);
  }

  findByUserId(userId: number): Promise<EducationProfile | null> {
    return this.repository.findOne({ where: { userId } });
  }
}
