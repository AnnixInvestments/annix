import { CrudRepository } from "../lib/persistence/crud-repository";
import { PvcPipeSpecification } from "./entities/pvc-pipe-specification.entity";

export abstract class PvcPipeSpecificationRepository extends CrudRepository<PvcPipeSpecification> {
  abstract findActive(): Promise<PvcPipeSpecification[]>;
  abstract findByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]>;
  abstract findByDNAndPN(
    nominalDiameter: number,
    pressureRating: number,
    pvcType: string,
  ): Promise<PvcPipeSpecification | null>;
  abstract findDistinctActiveDNs(): Promise<number[]>;
  abstract findActiveByDN(nominalDiameter: number): Promise<PvcPipeSpecification[]>;
}
