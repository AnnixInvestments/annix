import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixSentinelProfile } from "./entities/annix-sentinel-profile.entity";

export abstract class AnnixSentinelProfileRepository extends CrudRepository<AnnixSentinelProfile> {}
