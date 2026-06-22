import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { InspectionBooking } from "../entities/inspection-booking.entity";
import { InspectionBookingRepository } from "./inspection-booking.repository";

@Injectable()
export class MongoInspectionBookingRepository
  extends MongoTenantScopedRepository<InspectionBooking>
  implements InspectionBookingRepository
{
  constructor(
    @InjectModel("InspectionBooking") model: Model<InspectionBooking>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoInspectionBookingRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoInspectionBookingRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoInspectionBookingRepository {
    return new MongoInspectionBookingRepository(this.model, session);
  }

  async saveForCompany(companyId: number, entity: InspectionBooking): Promise<InspectionBooking> {
    if (entity.companyId !== companyId) {
      throw new Error("Inspection booking does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: InspectionBooking): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Inspection booking does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<InspectionBooking[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ inspectionDate: -1, startTime: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForDateRange(
    companyId: number,
    startDate: string,
    endDate: string,
  ): Promise<InspectionBooking[]> {
    const docs = await this.documents
      .find({
        companyId,
        inspectionDate: { $gte: startDate, $lte: endDate },
      })
      .populate("jobCard")
      .sort({ inspectionDate: 1, startTime: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveForDate(companyId: number, date: string): Promise<InspectionBooking[]> {
    const docs = await this.documents
      .find({
        companyId,
        inspectionDate: date,
        status: { $ne: "cancelled" },
      })
      .sort({ startTime: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findActiveForDateUnordered(companyId: number, date: string): Promise<InspectionBooking[]> {
    const docs = await this.documents
      .find({
        companyId,
        inspectionDate: date,
        status: { $ne: "cancelled" },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(bookingId: number, companyId: number): Promise<InspectionBooking | null> {
    const doc = await this.documents.findOne({ _id: bookingId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByResponseToken(token: string): Promise<InspectionBooking | null> {
    const doc = await this.documents.findOne({ responseToken: token }).lean().exec();
    return this.toDomain(doc);
  }
}
