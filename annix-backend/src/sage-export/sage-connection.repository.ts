import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { SageConnection } from "./entities/sage-connection.entity";

export abstract class SageConnectionRepository extends CrudRepository<SageConnection> {
  abstract instantiate(data: DeepPartial<SageConnection>): SageConnection;
  abstract findByAppKey(appKey: string): Promise<SageConnection | null>;
  abstract updateByAppKey(appKey: string, patch: DeepPartial<SageConnection>): Promise<void>;
}
