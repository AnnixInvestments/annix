import { CrudRepository } from "../lib/persistence/crud-repository";
import { HdpePipeSpecification } from "./entities/hdpe-pipe-specification.entity";

export abstract class HdpePipeSpecificationRepository extends CrudRepository<HdpePipeSpecification> {
  abstract findByNominalBoreAndSdr(
    nominalBore: number,
    sdr: number,
  ): Promise<HdpePipeSpecification | null>;
  abstract findAllByNominalBore(nominalBore: number): Promise<HdpePipeSpecification[]>;
  abstract findActiveOrderedByNominalBoreAndSdr(): Promise<HdpePipeSpecification[]>;
  abstract findDistinctNominalBores(): Promise<number[]>;
}
