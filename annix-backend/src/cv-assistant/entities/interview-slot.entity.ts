import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { CvAssistantCompany } from "./cv-assistant-company.entity";
import { InterviewBooking } from "./interview-booking.entity";
import { JobPosting } from "./job-posting.entity";

@Entity("cv_assistant_interview_slots")
@Index(["jobPostingId", "startsAt"])
@Index(["companyId", "startsAt"])
export class InterviewSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CvAssistantCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: CvAssistantCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobPosting, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_posting_id" })
  jobPosting: JobPosting;

  @Column({ name: "job_posting_id" })
  jobPostingId: number;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt: Date;

  @Column({ name: "location_label", type: "varchar", length: 255, nullable: true })
  locationLabel: string | null;

  @Column({ name: "location_address", type: "varchar", length: 500, nullable: true })
  locationAddress: string | null;

  @Column({ name: "location_lat", type: "double precision", nullable: true })
  locationLat: number | null;

  @Column({ name: "location_lng", type: "double precision", nullable: true })
  locationLng: number | null;

  @Column({ type: "smallint", default: 1 })
  capacity: number;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ name: "is_cancelled", type: "boolean", default: false })
  isCancelled: boolean;

  @OneToMany(
    () => InterviewBooking,
    (booking) => booking.slot,
  )
  bookings: InterviewBooking[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
