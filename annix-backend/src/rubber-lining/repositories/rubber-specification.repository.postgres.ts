import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { RubberSpecification } from "../entities/rubber-specification.entity";
import { RubberSpecificationRepository } from "./rubber-specification.repository";

@Injectable()
export class PostgresRubberSpecificationRepository
  extends TypeOrmCrudRepository<RubberSpecification>
  implements RubberSpecificationRepository
{
  constructor(@InjectRepository(RubberSpecification) repository: Repository<RubberSpecification>) {
    super(repository);
  }

  build(data: Partial<RubberSpecification>): RubberSpecification {
    return this.repository.create(data as TypeOrmDeepPartial<RubberSpecification>);
  }

  findAllWithTypeOrdered(): Promise<RubberSpecification[]> {
    return this.repository.find({
      relations: ["rubberType"],
      order: { rubberTypeId: "ASC", grade: "ASC", hardnessClassIrhd: "ASC" },
    });
  }

  findByTypeIdOrdered(rubberTypeId: number): Promise<RubberSpecification[]> {
    return this.repository.find({
      where: { rubberTypeId },
      relations: ["rubberType"],
      order: { grade: "ASC", hardnessClassIrhd: "ASC" },
    });
  }

  findByTypeIdsOrdered(rubberTypeIds: number[]): Promise<RubberSpecification[]> {
    return this.repository.find({
      where: { rubberTypeId: In(rubberTypeIds) },
      relations: ["rubberType"],
      order: { grade: "ASC", hardnessClassIrhd: "ASC" },
    });
  }

  findOneByCallout(
    rubberTypeId: number,
    grade: string,
    hardnessClassIrhd: number,
  ): Promise<RubberSpecification | null> {
    return this.repository.findOne({
      where: { rubberTypeId, grade, hardnessClassIrhd },
      relations: ["rubberType"],
    });
  }
}
