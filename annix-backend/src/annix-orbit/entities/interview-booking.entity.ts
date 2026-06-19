import { Candidate } from "./candidate.entity";
import { InterviewSlot } from "./interview-slot.entity";

export enum InterviewBookingStatus {
  BOOKED = "booked",
  CANCELLED = "cancelled",
}

export class InterviewBooking {
  id: number;

  slot: InterviewSlot;

  slotId: number;

  candidate: Candidate;

  candidateId: number;

  status: InterviewBookingStatus;

  bookedAt: Date;

  cancelledAt: Date | null;

  cancelReason: string | null;

  createdAt: Date;

  updatedAt: Date;
}
