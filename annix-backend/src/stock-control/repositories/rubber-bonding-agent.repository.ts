import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberBondingAgent } from "../entities/rubber-bonding-agent.entity";

export abstract class RubberBondingAgentRepository extends CrudRepository<RubberBondingAgent> {
  abstract findAllForCompany(companyId: number): Promise<RubberBondingAgent[]>;
  abstract findOneForCompany(companyId: number, id: number): Promise<RubberBondingAgent | null>;
}
