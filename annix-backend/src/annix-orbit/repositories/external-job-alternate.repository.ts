import { CrudRepository } from "../../lib/persistence/crud-repository";
import { ExternalJobAlternate } from "../entities/external-job-alternate.entity";

export abstract class ExternalJobAlternateRepository extends CrudRepository<ExternalJobAlternate> {
  abstract findByExternalIds(
    externalIds: string[],
    sourceId: number,
  ): Promise<ExternalJobAlternate[]>;
  abstract deleteByCanonicalId(canonicalExternalJobId: number): Promise<void>;
  abstract deleteByCanonicalIds(canonicalExternalJobIds: number[]): Promise<void>;
}
