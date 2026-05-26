import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { InspectionBooking } from "../entities/inspection-booking.entity";
import { InspectionBookingRepository } from "./inspection-booking.repository";

@Injectable()
export class MongoInspectionBookingRepository
  extends MongoCrudRepository<InspectionBooking>
  implements InspectionBookingRepository
{
  constructor(@InjectModel("InspectionBooking") model: Model<InspectionBooking>) {
    super(model);
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
