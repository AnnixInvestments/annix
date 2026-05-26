import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitEeSectoralTarget } from "../entities/annix-orbit-ee-sectoral-target.entity";

export abstract class AnnixOrbitEeSectoralTargetRepository extends CrudRepository<AnnixOrbitEeSectoralTarget> {
  abstract listOrdered(): Promise<AnnixOrbitEeSectoralTarget[]>;
  abstract findBySectorCode(sectorCode: string): Promise<AnnixOrbitEeSectoralTarget[]>;
  abstract deleteById(id: number): Promise<number>;
}
