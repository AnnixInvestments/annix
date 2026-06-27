import { OrbitCompanyIdentity } from "../entities/orbit-company-identity.entity";
import { OrbitIdentityRepository } from "./orbit-identity.repository";

export abstract class OrbitCompanyIdentityRepository extends OrbitIdentityRepository<OrbitCompanyIdentity> {}
