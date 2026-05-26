import { CrudRepository } from "../lib/persistence/crud-repository";
import { RfqClarificationRequest } from "./entities/rfq-clarification-request.entity";

export abstract class RfqClarificationRequestRepository extends CrudRepository<RfqClarificationRequest> {
  abstract findByToken(token: string): Promise<RfqClarificationRequest | null>;
}
