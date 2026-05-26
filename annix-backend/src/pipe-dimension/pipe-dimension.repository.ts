import { NominalOutsideDiameterMm } from "src/nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { SteelSpecification } from "src/steel-specification/entities/steel-specification.entity";
import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeDimension } from "./entities/pipe-dimension.entity";

export abstract class PipeDimensionRepository extends CrudRepository<PipeDimension> {
  abstract findAllWithRelations(): Promise<PipeDimension[]>;
  abstract findAllWithDiameterAndSpec(): Promise<PipeDimension[]>;
  abstract findOneWithRelations(id: number): Promise<PipeDimension | null>;
  abstract findNominalByDiameter(
    nominalDiameterMm: number,
  ): Promise<NominalOutsideDiameterMm | null>;
  abstract findNominalById(id: number): Promise<NominalOutsideDiameterMm | null>;
  abstract findSteelById(id: number): Promise<SteelSpecification | null>;
  abstract createPipe(data: Partial<PipeDimension>): Promise<PipeDimension>;
  abstract savePipe(entity: PipeDimension): Promise<PipeDimension>;
  abstract removePipe(entity: PipeDimension): Promise<void>;
  abstract findBySpecAndNominal(steelSpecId: number, nominalId: number): Promise<PipeDimension[]>;
  abstract recommendedSpecs(
    nominalId: number,
    workingPressureMpa: number,
    temperature: number,
    steelSpecId?: number,
  ): Promise<PipeDimension[]>;
  abstract higherSchedules(
    nominalId: number,
    currentWallThickness: number,
    workingPressureMpa: number,
    temperature: number,
    steelSpecId?: number,
  ): Promise<PipeDimension[]>;
  abstract findByNominalDiameterScheduleAndSteel(
    nominalDiameterMm: number,
    scheduleDesignation: string,
    steelSpecId?: number,
  ): Promise<PipeDimension | null>;
}
