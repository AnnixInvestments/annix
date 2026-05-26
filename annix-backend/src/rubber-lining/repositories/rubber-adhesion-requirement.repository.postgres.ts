import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberAdhesionRequirement } from "../entities/rubber-application.entity";
import { RubberAdhesionRequirementRepository } from "./rubber-adhesion-requirement.repository";

@Injectable()
export class PostgresRubberAdhesionRequirementRepository
  extends TypeOrmCrudRepository<RubberAdhesionRequirement>
  implements RubberAdhesionRequirementRepository
{
  constructor(
    @InjectRepository(RubberAdhesionRequirement)
    repository: Repository<RubberAdhesionRequirement>,
  ) {
    super(repository);
  }

  findByTypeNumberOrdered(typeNumber?: number): Promise<RubberAdhesionRequirement[]> {
    const query = this.repository
      .createQueryBuilder("adhesion")
      .leftJoinAndSelect("adhesion.rubberType", "rubberType");

    if (typeNumber) {
      query.andWhere("rubberType.typeNumber = :typeNumber", { typeNumber });
    }

    return query
      .orderBy("rubberType.typeNumber", "ASC")
      .addOrderBy("adhesion.vulcanizationMethod", "ASC")
      .getMany();
  }
}
