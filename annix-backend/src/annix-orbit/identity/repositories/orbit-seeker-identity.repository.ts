import { OrbitSeekerIdentity } from "../entities/orbit-seeker-identity.entity";
import { OrbitIdentityRepository } from "./orbit-identity.repository";

export abstract class OrbitSeekerIdentityRepository extends OrbitIdentityRepository<OrbitSeekerIdentity> {}
