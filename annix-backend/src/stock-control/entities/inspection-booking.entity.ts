import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { JobCard } from "./job-card.entity";
import { StockControlCompany } from "./stock-control-company.entity";
import { StockControlUser } from "./stock-control-user.entity";

@Entity("inspection_bookings")
export class InspectionBooking {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => JobCard, { onDelete: "CASCADE" })
  @JoinColumn({ name: "job_card_id" })
  jobCard: JobCard;

  @Column({ name: "job_card_id" })
  jobCardId: number;

  @Column({ name: "inspection_date", type: "date" })
  inspectionDate: string;

  @Column({ name: "start_time", type: "varchar", length: 5 })
  startTime: string;

  @Column({ name: "end_time", type: "varchar", length: 5 })
  endTime: string;

  @Column({ name: "inspector_email", type: "varchar", length: 255 })
  inspectorEmail: string;

  @Column({ name: "inspector_name", type: "varchar", length: 255, nullable: true })
  inspectorName: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "varchar", length: 20, default: "booked" })
  status: string;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "booked_by_id" })
  bookedBy: StockControlUser | null;

  @Column({ name: "booked_by_id", nullable: true })
  bookedById: number | null;

  @Column({ name: "booked_by_name", type: "varchar", length: 255, nullable: true })
  bookedByName: string | null;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => StockControlUser, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "completed_by_id" })
  completedBy: StockControlUser | null;

  @Column({ name: "completed_by_id", nullable: true })
  completedById: number | null;

  @Column({ name: "completed_by_name", type: "varchar", length: 255, nullable: true })
  completedByName: string | null;

  @Column({ name: "response_token", type: "varchar", length: 64, nullable: true })
  responseToken: string | null;

  @Column({ name: "token_expires_at", type: "timestamptz", nullable: true })
  tokenExpiresAt: Date | null;

  @Column({ name: "proposed_date", type: "date", nullable: true })
  proposedDate: string | null;

  @Column({ name: "proposed_start_time", type: "varchar", length: 5, nullable: true })
  proposedStartTime: string | null;

  @Column({ name: "proposed_end_time", type: "varchar", length: 5, nullable: true })
  proposedEndTime: string | null;

  @Column({ name: "proposed_note", type: "text", nullable: true })
  proposedNote: string | null;

  @Column({ name: "proposed_at", type: "timestamptz", nullable: true })
  proposedAt: Date | null;

  @Column({ name: "responded_at", type: "timestamptz", nullable: true })
  respondedAt: Date | null;

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_booked_by_id" })
  unifiedBookedBy?: User | null;

  @Column({ name: "unified_booked_by_id", nullable: true })
  unifiedBookedById?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_completed_by_id" })
  unifiedCompletedBy?: User | null;

  @Column({ name: "unified_completed_by_id", nullable: true })
  unifiedCompletedById?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
