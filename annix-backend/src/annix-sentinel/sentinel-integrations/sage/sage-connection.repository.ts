import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { AnnixSentinelSageConnection } from "./sage-connection.entity";

export abstract class AnnixSentinelSageConnectionRepository extends CrudRepository<AnnixSentinelSageConnection> {
  abstract findByCompany(companyId: number): Promise<AnnixSentinelSageConnection | null>;
  abstract deleteByCompany(companyId: number): Promise<number>;
}
