import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelApiKey } from "./entities/api-key.entity";

export abstract class AnnixSentinelApiKeyRepository extends CrudRepository<AnnixSentinelApiKey> {
  abstract findActiveByKeyHash(keyHash: string): Promise<AnnixSentinelApiKey | null>;
  abstract findByIdAndCompany(id: number, companyId: number): Promise<AnnixSentinelApiKey | null>;
  abstract findByCompanyNewestFirst(companyId: number): Promise<AnnixSentinelApiKey[]>;
}
