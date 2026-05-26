import { CrudRepository } from "../lib/persistence/crud-repository";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";

export abstract class NominalOutsideDiameterMmRepository extends CrudRepository<NominalOutsideDiameterMm> {}
