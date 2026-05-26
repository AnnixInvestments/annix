import { CrudRepository } from "../lib/persistence/crud-repository";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";

export abstract class FlangePressureClassRepository extends CrudRepository<FlangePressureClass> {
  abstract findByStandardId(standardId: number): Promise<FlangePressureClass[]>;
  abstract findByIds(ids: number[]): Promise<FlangePressureClass[]>;
}
