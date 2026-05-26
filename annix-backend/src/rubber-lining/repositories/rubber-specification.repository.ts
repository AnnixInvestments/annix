import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberSpecification } from "../entities/rubber-specification.entity";

export abstract class RubberSpecificationRepository extends CrudRepository<RubberSpecification> {
  abstract build(data: Partial<RubberSpecification>): RubberSpecification;
  abstract findAllWithTypeOrdered(): Promise<RubberSpecification[]>;
  abstract findByTypeIdOrdered(rubberTypeId: number): Promise<RubberSpecification[]>;
  abstract findByTypeIdsOrdered(rubberTypeIds: number[]): Promise<RubberSpecification[]>;
  abstract findOneByCallout(
    rubberTypeId: number,
    grade: string,
    hardnessClassIrhd: number,
  ): Promise<RubberSpecification | null>;
}
