import { CrudRepository } from "../../lib/persistence/crud-repository";
import { StockReturn } from "../entities/stock-return.entity";

export abstract class StockReturnRepository extends CrudRepository<StockReturn> {}
