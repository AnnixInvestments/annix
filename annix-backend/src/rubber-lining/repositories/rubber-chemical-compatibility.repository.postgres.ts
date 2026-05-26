import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberChemicalCompatibility } from "../entities/rubber-chemical-compatibility.entity";
import { RubberChemicalCompatibilityRepository } from "./rubber-chemical-compatibility.repository";

@Injectable()
export class PostgresRubberChemicalCompatibilityRepository
  extends TypeOrmCrudRepository<RubberChemicalCompatibility>
  implements RubberChemicalCompatibilityRepository
{
  constructor(
    @InjectRepository(RubberChemicalCompatibility)
    repository: Repository<RubberChemicalCompatibility>,
  ) {
    super(repository);
  }
}
