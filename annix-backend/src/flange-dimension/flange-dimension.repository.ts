import { Bolt } from "src/bolt/entities/bolt.entity";
import { BoltMass } from "src/bolt-mass/entities/bolt-mass.entity";
import { FlangePressureClass } from "src/flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "src/flange-standard/entities/flange-standard.entity";
import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangeDimension } from "./entities/flange-dimension.entity";

export abstract class FlangeDimensionRepository extends CrudRepository<FlangeDimension> {
  abstract findAllWithRelations(): Promise<FlangeDimension[]>;
  abstract findByIdWithRelations(id: number): Promise<FlangeDimension | null>;
  abstract findBySpecs(
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ): Promise<FlangeDimension | null>;
  abstract findByCodeAndDesignation(
    nbMm: number,
    code: string,
    designation: string,
  ): Promise<FlangeDimension | null>;
  abstract findClosestBoltMass(boltId: number, lengthMm: number): Promise<BoltMass | null>;
  abstract findNominalById(id: number): Promise<NominalOutsideDiameterMm | null>;
  abstract findStandardById(id: number): Promise<FlangeStandard | null>;
  abstract findPressureClassById(id: number): Promise<FlangePressureClass | null>;
  abstract findBoltById(id: number): Promise<Bolt | null>;
  abstract findBoltMassByBoltAndLength(boltId: number, lengthMm: number): Promise<BoltMass | null>;
  abstract findByNominalDiameterStandardAndPressureClassWithBolt(
    nominalDiameterMm: number,
    standardId: number,
    pressureClassId: number,
  ): Promise<FlangeDimension | null>;
  abstract existsByAllFields(params: {
    nominalOutsideDiameterId: number;
    standardId: number;
    pressureClassId: number;
    D: number;
    b: number;
    d4: number;
    f: number;
    num_holes: number;
    d1: number;
    pcd: number;
    mass_kg: number;
    bolt?: Bolt | null;
  }): Promise<boolean>;
}
