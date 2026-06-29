import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SalesRep } from "../entities/sales-rep.entity";

export abstract class SalesRepRepository extends CrudRepository<SalesRep> {
  abstract build(data: Partial<SalesRep>): SalesRep;
  abstract findByCompanyId(companyId: number): Promise<SalesRep[]>;
}
