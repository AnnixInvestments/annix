import { CrudRepository } from "../lib/persistence/crud-repository";
import { ThreadedInsert } from "./entities/threaded-insert.entity";

export abstract class ThreadedInsertRepository extends CrudRepository<ThreadedInsert> {
  abstract insertTypesGrouped(): Promise<Array<{ type: string; count: number }>>;
  abstract insertSizesForType(type: string): Promise<Array<{ size: string }>>;
  abstract insertGradesForTypeAndSize(
    type: string,
    size: string,
  ): Promise<Array<{ grade: string | null; material: string | null }>>;
}
