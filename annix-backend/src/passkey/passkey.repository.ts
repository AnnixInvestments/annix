import { CrudRepository } from "../lib/persistence/crud-repository";
import { Passkey } from "./entities/passkey.entity";

export abstract class PasskeyRepository extends CrudRepository<Passkey> {
  abstract findByCredentialId(credentialId: string): Promise<Passkey | null>;
  abstract findByUserId(userId: number): Promise<Passkey[]>;
  abstract countByUserId(userId: number): Promise<number>;
  abstract deleteByIdAndUserId(id: number, userId: number): Promise<void>;
}
