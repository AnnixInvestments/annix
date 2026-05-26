import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import {
  SupplierInvitation,
  SupplierInvitationStatus,
} from "./entities/supplier-invitation.entity";
import { SupplierInvitationRepository } from "./supplier-invitation.repository";

@Injectable()
export class MongoSupplierInvitationRepository
  extends MongoCrudRepository<SupplierInvitation>
  implements SupplierInvitationRepository
{
  constructor(@InjectModel("SupplierInvitation") model: Model<SupplierInvitation>) {
    super(model);
  }

  async findByCompany(customerCompanyId: number): Promise<SupplierInvitation[]> {
    const docs = await this.documents
      .find({ customerCompanyId })
      .populate(["invitedBy", "supplierProfile"])
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActivePendingByCompanyAndEmail(
    customerCompanyId: number,
    email: string,
    nowDate: Date,
  ): Promise<SupplierInvitation | null> {
    const doc = await this.documents
      .findOne({
        customerCompanyId,
        email,
        status: SupplierInvitationStatus.PENDING,
        expiresAt: { $gt: nowDate },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByIdInCompany(
    id: number,
    customerCompanyId: number,
  ): Promise<SupplierInvitation | null> {
    const doc = await this.documents.findOne({ _id: id, customerCompanyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findActivePendingByToken(token: string, nowDate: Date): Promise<SupplierInvitation | null> {
    const doc = await this.documents
      .findOne({
        token,
        status: SupplierInvitationStatus.PENDING,
        expiresAt: { $gt: nowDate },
      })
      .populate(["customerCompany"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findByToken(token: string): Promise<SupplierInvitation | null> {
    const doc = await this.documents.findOne({ token }).lean().exec();
    return this.toDomain(doc);
  }

  async findPendingByEmail(email: string): Promise<SupplierInvitation[]> {
    const docs = await this.documents
      .find({ email, status: SupplierInvitationStatus.PENDING })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
