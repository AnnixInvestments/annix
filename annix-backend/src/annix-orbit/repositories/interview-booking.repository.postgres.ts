import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { InterviewBooking, InterviewBookingStatus } from "../entities/interview-booking.entity";
import { InterviewBookingRepository } from "./interview-booking.repository";

@Injectable()
export class PostgresInterviewBookingRepository
  extends TypeOrmCrudRepository<InterviewBooking>
  implements InterviewBookingRepository
{
  constructor(@InjectRepository(InterviewBooking) repository: Repository<InterviewBooking>) {
    super(repository);
  }

  findActiveForCandidateWithSlot(candidateId: number): Promise<InterviewBooking | null> {
    return this.repository.findOne({
      where: {
        candidateId,
        status: InterviewBookingStatus.BOOKED,
      },
      relations: ["slot"],
    });
  }

  bookingsForCandidate(candidateId: number): Promise<InterviewBooking[]> {
    return this.repository.find({
      where: { candidateId, status: InterviewBookingStatus.BOOKED },
      relations: ["slot", "slot.jobPosting", "slot.company"],
      order: { bookedAt: "ASC" },
    });
  }

  bookingsForCandidates(candidateIds: number[]): Promise<InterviewBooking[]> {
    if (candidateIds.length === 0) return Promise.resolve([]);
    return this.repository.find({
      where: {
        candidateId: In(candidateIds),
        status: InterviewBookingStatus.BOOKED,
        cancelledAt: IsNull(),
      },
      relations: ["slot", "slot.jobPosting"],
      order: { bookedAt: "ASC" },
    });
  }
}
