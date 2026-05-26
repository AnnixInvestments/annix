import { CrudRepository } from "../lib/persistence/crud-repository";
import { BroadcastFilterDto } from "./dto";
import { Broadcast } from "./entities/broadcast.entity";

export interface BroadcastPage<T> {
  broadcasts: T[];
  total: number;
}

export abstract class BroadcastRepository extends CrudRepository<Broadcast> {
  abstract findPageForIds(
    ids: number[],
    filters: BroadcastFilterDto,
    skip: number,
    limit: number,
  ): Promise<BroadcastPage<Broadcast>>;
  abstract findPage(
    filters: BroadcastFilterDto,
    skip: number,
    limit: number,
  ): Promise<BroadcastPage<Broadcast>>;
}
