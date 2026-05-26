import { CrudRepository } from "../../lib/persistence/crud-repository";
import { IssuanceSession } from "../entities/issuance-session.entity";

export abstract class IssuanceSessionRepository extends CrudRepository<IssuanceSession> {}
