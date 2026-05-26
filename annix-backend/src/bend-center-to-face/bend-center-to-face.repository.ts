import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeDimension } from "../pipe-dimension/entities/pipe-dimension.entity";
import { BendCenterToFace } from "./entities/bend-center-to-face.entity";

export abstract class BendCenterToFaceRepository extends CrudRepository<BendCenterToFace> {
  abstract findAllOrdered(): Promise<BendCenterToFace[]>;
  abstract findByBendType(bendType: string): Promise<BendCenterToFace[]>;
  abstract findByNominalBore(nominalBoreMm: number): Promise<BendCenterToFace[]>;
  abstract findByCriteria(
    bendType: string,
    nominalBoreMm: number,
    degrees: number,
  ): Promise<BendCenterToFace | null>;
  abstract findByBendTypeAndNominalBoreOrdered(
    bendType: string,
    nominalBoreMm: number,
  ): Promise<BendCenterToFace[]>;
  abstract distinctBendTypes(): Promise<string[]>;
  abstract distinctNominalBoresForBendType(bendType: string): Promise<number[]>;
  abstract distinctDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]>;
  abstract findPipeDimension(
    nominalBoreMm: number,
    wallThicknessMm: number,
  ): Promise<PipeDimension | null>;
  abstract findFlangeDimension(
    nominalBoreMm: number,
    flangeStandardId: number,
    flangePressureClassId: number,
  ): Promise<FlangeDimension | null>;
}
