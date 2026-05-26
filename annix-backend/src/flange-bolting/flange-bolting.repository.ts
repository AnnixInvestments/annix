import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangeBolting } from "./entities/flange-bolting.entity";
import { FlangeBoltingMaterial } from "./entities/flange-bolting-material.entity";

export abstract class FlangeBoltingRepository extends CrudRepository<FlangeBolting> {
  abstract saveMany(entities: FlangeBolting[]): Promise<FlangeBolting[]>;
  abstract findAllWithStandard(): Promise<FlangeBolting[]>;
  abstract findByStandardId(standardId: number): Promise<FlangeBolting[]>;
  abstract findByStandardAndClass(
    standardId: number,
    pressureClass: string,
  ): Promise<FlangeBolting[]>;
  abstract findByStandardClassAndNps(
    standardId: number,
    pressureClass: string,
    nps: string,
  ): Promise<FlangeBolting | null>;
}

export abstract class FlangeBoltingMaterialRepository extends CrudRepository<FlangeBoltingMaterial> {
  abstract findAllOrderedByGroup(): Promise<FlangeBoltingMaterial[]>;
  abstract findByMaterialGroup(materialGroup: string): Promise<FlangeBoltingMaterial | null>;
}
