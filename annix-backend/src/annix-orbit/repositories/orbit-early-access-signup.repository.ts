import { CrudRepository } from "../../lib/persistence/crud-repository";
import { OrbitEarlyAccessSignup } from "../entities/orbit-early-access-signup.entity";

export abstract class OrbitEarlyAccessSignupRepository extends CrudRepository<OrbitEarlyAccessSignup> {
  abstract findByEmailNormalized(email: string): Promise<OrbitEarlyAccessSignup | null>;
  abstract findByMobileNormalized(mobile: string): Promise<OrbitEarlyAccessSignup | null>;
  abstract findByReferralCode(code: string): Promise<OrbitEarlyAccessSignup | null>;
  abstract listNewestFirst(): Promise<OrbitEarlyAccessSignup[]>;
}
