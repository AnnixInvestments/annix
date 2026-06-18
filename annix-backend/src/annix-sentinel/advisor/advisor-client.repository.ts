import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelAdvisorClient } from "./entities/advisor-client.entity";

export abstract class AnnixSentinelAdvisorClientRepository extends CrudRepository<AnnixSentinelAdvisorClient> {}
