import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, MoreThan, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { RemoteAccessRequest, RemoteAccessStatus } from "./entities/remote-access-request.entity";
import { RemoteAccessRequestRepository } from "./remote-access.repository";

@Injectable()
export class PostgresRemoteAccessRequestRepository
  extends TypeOrmCrudRepository<RemoteAccessRequest>
  implements RemoteAccessRequestRepository
{
  constructor(@InjectRepository(RemoteAccessRequest) repository: Repository<RemoteAccessRequest>) {
    super(repository);
  }

  findPendingForAdmin(
    adminId: number,
    documentType: string,
    documentId: number,
  ): Promise<RemoteAccessRequest | null> {
    return this.repository.findOne({
      where: {
        requestedBy: { id: adminId },
        documentType: documentType as RemoteAccessRequest["documentType"],
        documentId,
        status: RemoteAccessStatus.PENDING,
      },
    });
  }

  findApprovedForAdmin(
    adminId: number,
    documentType: string,
    documentId: number,
    now: Date,
  ): Promise<RemoteAccessRequest | null> {
    return this.repository.findOne({
      where: {
        requestedBy: { id: adminId },
        documentType: documentType as RemoteAccessRequest["documentType"],
        documentId,
        status: RemoteAccessStatus.APPROVED,
        expiresAt: MoreThan(now),
      },
    });
  }

  findPendingByOwner(ownerId: number, now: Date): Promise<RemoteAccessRequest[]> {
    return this.repository.find({
      where: {
        documentOwner: { id: ownerId },
        status: RemoteAccessStatus.PENDING,
        expiresAt: MoreThan(now),
      },
      relations: ["requestedBy", "documentOwner"],
      order: { requestedAt: "DESC" },
    });
  }

  findWithRelations(id: number): Promise<RemoteAccessRequest | null> {
    return this.repository.findOne({
      where: { id },
      relations: ["requestedBy", "documentOwner"],
    });
  }

  async markExpiredRequests(now: Date): Promise<number> {
    const result = await this.repository.update(
      {
        status: RemoteAccessStatus.PENDING,
        expiresAt: LessThan(now),
      },
      { status: RemoteAccessStatus.EXPIRED },
    );
    return result.affected ?? 0;
  }
}
