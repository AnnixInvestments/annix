import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StockTakeAdjustment } from "../entities/stock-take-adjustment.entity";

export abstract class StockTakeAdjustmentRepository extends CrudRepository<StockTakeAdjustment> {}
