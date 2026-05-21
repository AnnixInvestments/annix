import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Candidate } from "./candidate.entity";
import { InterviewSlot } from "./interview-slot.entity";

export enum InterviewBookingStatus {
  BOOKED = "booked",
  CANCELLED = "cancelled",
}

@Entity("cv_assistant_interview_bookings")
@Index(["candidateId"])
export class InterviewBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => InterviewSlot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "slot_id" })
  slot: InterviewSlot;

  @Column({ name: "slot_id" })
  slotId: number;

  @ManyToOne(() => Candidate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "candidate_id" })
  candidate: Candidate;

  @Column({ name: "candidate_id" })
  candidateId: number;

  @Column({ type: "varchar", length: 20, default: InterviewBookingStatus.BOOKED })
  status: InterviewBookingStatus;

  @Column({ name: "booked_at", type: "timestamptz" })
  bookedAt: Date;

  @Column({ name: "cancelled_at", type: "timestamptz", nullable: true })
  cancelledAt: Date | null;

  @Column({ name: "cancel_reason", type: "varchar", length: 255, nullable: true })
  cancelReason: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
