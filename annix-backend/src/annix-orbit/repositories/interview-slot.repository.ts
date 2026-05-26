import { CrudRepository } from "../../lib/persistence/crud-repository";
import { InterviewSlot } from "../entities/interview-slot.entity";

export abstract class InterviewSlotRepository extends CrudRepository<InterviewSlot> {
  abstract listForJob(companyId: number, jobPostingId: number): Promise<InterviewSlot[]>;
  abstract listForCompanyBetween(
    companyId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<InterviewSlot[]>;
  abstract findByIdForCompanyWithBookings(
    slotId: number,
    companyId: number,
  ): Promise<InterviewSlot | null>;
  abstract listOpenForJob(jobPostingId: number): Promise<InterviewSlot[]>;
  abstract deleteById(slotId: number): Promise<void>;
}
