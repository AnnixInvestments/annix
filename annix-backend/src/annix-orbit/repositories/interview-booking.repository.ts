import { CrudRepository } from "../../lib/persistence/crud-repository";
import { InterviewBooking } from "../entities/interview-booking.entity";

export abstract class InterviewBookingRepository extends CrudRepository<InterviewBooking> {
  abstract findActiveForCandidateWithSlot(candidateId: number): Promise<InterviewBooking | null>;
  abstract bookingsForCandidate(candidateId: number): Promise<InterviewBooking[]>;
  abstract bookingsForCandidates(candidateIds: number[]): Promise<InterviewBooking[]>;
}
