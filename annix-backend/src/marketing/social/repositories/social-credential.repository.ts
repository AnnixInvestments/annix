import { CrudRepository } from "../../../lib/persistence/crud-repository";
import { SocialCredential } from "../entities/social-credential.entity";

export abstract class SocialCredentialRepository extends CrudRepository<SocialCredential> {
  abstract build(data: Partial<SocialCredential>): SocialCredential;
}
