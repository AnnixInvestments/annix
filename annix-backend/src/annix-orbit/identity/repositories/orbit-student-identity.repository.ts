import { OrbitStudentIdentity } from "../entities/orbit-student-identity.entity";
import { OrbitIdentityRepository } from "./orbit-identity.repository";

export abstract class OrbitStudentIdentityRepository extends OrbitIdentityRepository<OrbitStudentIdentity> {}
