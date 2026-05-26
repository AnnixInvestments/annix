import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RemoteAccessRequest, RemoteAccessStatus } from "./entities/remote-access-request.entity";
import { RemoteAccessRequestRepository } from "./remote-access.repository";

@Injectable()
export class MongoRemoteAccessRequestRepository
  extends MongoCrudRepository<RemoteAccessRequest>
  implements RemoteAccessRequestRepository
{
  constructor(@InjectModel("RemoteAccessRequest") model: Model<RemoteAccessRequest>) {
    super(model);
  }

  async findPendingForAdmin(
    adminId: number,
    documentType: string,
    documentId: number,
  ): Promise<RemoteAccessRequest | null> {
    const document = await this.documents
      .findOne({
        requestedById: adminId,
        documentType,
        documentId,
        status: RemoteAccessStatus.PENDING,
      })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findApprovedForAdmin(
    adminId: number,
    documentType: string,
    documentId: number,
    now: Date,
  ): Promise<RemoteAccessRequest | null> {
    const document = await this.documents
      .findOne({
        requestedById: adminId,
        documentType,
        documentId,
        status: RemoteAccessStatus.APPROVED,
        expiresAt: { $gt: now },
      })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findPendingByOwner(ownerId: number, now: Date): Promise<RemoteAccessRequest[]> {
    const documents = await this.documents
      .find({
        documentOwnerId: ownerId,
        status: RemoteAccessStatus.PENDING,
        expiresAt: { $gt: now },
      })
      .sort({ requestedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findWithRelations(id: number): Promise<RemoteAccessRequest | null> {
    const document = await this.documents.findById(id).lean().exec();
    return this.toDomain(document);
  }

  async markExpiredRequests(now: Date): Promise<number> {
    const result = await this.documents
      .updateMany(
        { status: RemoteAccessStatus.PENDING, expiresAt: { $lt: now } },
        { $set: { status: RemoteAccessStatus.EXPIRED } },
      )
      .exec();
    return result.modifiedCount;
  }
}
