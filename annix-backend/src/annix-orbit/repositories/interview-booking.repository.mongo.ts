import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { InterviewBooking, InterviewBookingStatus } from "../entities/interview-booking.entity";
import { InterviewBookingRepository } from "./interview-booking.repository";

@Injectable()
export class MongoInterviewBookingRepository
  extends MongoCrudRepository<InterviewBooking>
  implements InterviewBookingRepository
{
  constructor(@InjectModel("InterviewBooking", ORBIT_CONNECTION) model: Model<InterviewBooking>) {
    super(model);
  }

  async findActiveForCandidateWithSlot(candidateId: number): Promise<InterviewBooking | null> {
    const doc = await this.documents
      .findOne({ candidateId, status: InterviewBookingStatus.BOOKED })
      .populate("slot")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async bookingsForCandidate(candidateId: number): Promise<InterviewBooking[]> {
    const docs = await this.documents
      .find({ candidateId, status: InterviewBookingStatus.BOOKED })
      .sort({ bookedAt: 1 })
      .populate({
        path: "slot",
        populate: [{ path: "jobPosting" }, { path: "company" }],
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async bookingsForCandidates(candidateIds: number[]): Promise<InterviewBooking[]> {
    if (candidateIds.length === 0) return [];
    const docs = await this.documents
      .find({
        candidateId: { $in: candidateIds },
        status: InterviewBookingStatus.BOOKED,
        cancelledAt: null,
      })
      .sort({ bookedAt: 1 })
      .populate({ path: "slot", populate: { path: "jobPosting" } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
