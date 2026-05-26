import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { InterviewSlot } from "../entities/interview-slot.entity";
import { InterviewSlotRepository } from "./interview-slot.repository";

@Injectable()
export class MongoInterviewSlotRepository
  extends MongoCrudRepository<InterviewSlot>
  implements InterviewSlotRepository
{
  constructor(@InjectModel("InterviewSlot") model: Model<InterviewSlot>) {
    super(model);
  }

  async listForJob(companyId: number, jobPostingId: number): Promise<InterviewSlot[]> {
    const docs = await this.documents
      .find({ companyId, jobPostingId })
      .sort({ startsAt: 1 })
      .populate({ path: "bookings", populate: { path: "candidate" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async listForCompanyBetween(
    companyId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<InterviewSlot[]> {
    const docs = await this.documents
      .find({ companyId, startsAt: { $gte: fromDate, $lte: toDate } })
      .sort({ startsAt: 1 })
      .populate(["jobPosting", { path: "bookings", populate: { path: "candidate" } }])
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompanyWithBookings(
    slotId: number,
    companyId: number,
  ): Promise<InterviewSlot | null> {
    const doc = await this.documents
      .findOne({ _id: slotId, companyId })
      .populate("bookings")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async listOpenForJob(jobPostingId: number): Promise<InterviewSlot[]> {
    const docs = await this.documents
      .find({ jobPostingId, isCancelled: false })
      .sort({ startsAt: 1 })
      .populate("bookings")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteById(slotId: number): Promise<void> {
    await this.documents.findByIdAndDelete(slotId).exec();
  }
}
