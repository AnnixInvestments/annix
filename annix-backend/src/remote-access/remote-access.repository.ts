import { CrudRepository } from "../lib/persistence/crud-repository";
import { RemoteAccessRequest } from "./entities/remote-access-request.entity";

export abstract class RemoteAccessRequestRepository extends CrudRepository<RemoteAccessRequest> {
  abstract findPendingForAdmin(
    adminId: number,
    documentType: string,
    documentId: number,
  ): Promise<RemoteAccessRequest | null>;
  abstract findApprovedForAdmin(
    adminId: number,
    documentType: string,
    documentId: number,
    now: Date,
  ): Promise<RemoteAccessRequest | null>;
  abstract findPendingByOwner(ownerId: number, now: Date): Promise<RemoteAccessRequest[]>;
  abstract findWithRelations(id: number): Promise<RemoteAccessRequest | null>;
  abstract markExpiredRequests(now: Date): Promise<number>;
}
