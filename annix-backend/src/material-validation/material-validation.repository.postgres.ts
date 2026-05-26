import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { MaterialLimit } from "./entities/material-limit.entity";
import { MaterialValidationRepository } from "./material-validation.repository";

@Injectable()
export class PostgresMaterialValidationRepository
  extends TypeOrmCrudRepository<MaterialLimit>
  implements MaterialValidationRepository
{
  constructor(@InjectRepository(MaterialLimit) repository: Repository<MaterialLimit>) {
    super(repository);
  }

  findAllLimits(): Promise<MaterialLimit[]> {
    return this.repository.find();
  }

  findBySpecId(steelSpecificationId: number): Promise<MaterialLimit | null> {
    return this.repository.findOne({
      where: { steel_specification_id: steelSpecificationId },
      relations: ["steelSpecification"],
    });
  }
}
