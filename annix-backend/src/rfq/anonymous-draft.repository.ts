import { CrudRepository } from "../lib/persistence/crud-repository";
import { AnonymousDraft } from "./entities/anonymous-draft.entity";

export abstract class AnonymousDraftRepository extends CrudRepository<AnonymousDraft> {
  abstract findLatestUnclaimedByEmail(customerEmail: string): Promise<AnonymousDraft | null>;
  abstract findByRecoveryToken(token: string): Promise<AnonymousDraft | null>;
  abstract deleteExpired(before: Date): Promise<number>;
  abstract searchUnclaimedPaginated(params: {
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ items: AnonymousDraft[]; total: number }>;
}
