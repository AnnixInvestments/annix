import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { SteelSpecification } from "./entities/steel-specification.entity";
import { SteelSpecificationRepository } from "./steel-specification.repository";

@Injectable()
export class PostgresSteelSpecificationRepository
  extends TypeOrmCrudRepository<SteelSpecification>
  implements SteelSpecificationRepository
{
  constructor(@InjectRepository(SteelSpecification) repository: Repository<SteelSpecification>) {
    super(repository);
  }

  findAllWithRelations(): Promise<SteelSpecification[]> {
    return this.repository.find({ relations: ["fittings", "pipeDimensions"] });
  }

  findByIdWithRelations(id: number): Promise<SteelSpecification | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["fittings", "pipeDimensions"],
    });
  }

  findByName(steelSpecName: string): Promise<SteelSpecification | null> {
    return this.repository.findOne({
      where: { steelSpecName },
    });
  }

  findByIds(ids: number[]): Promise<SteelSpecification[]> {
    return this.repository.find({ where: { id: In(ids) } });
  }
}
