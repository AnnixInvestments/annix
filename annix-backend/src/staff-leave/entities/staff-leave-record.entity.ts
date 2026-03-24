import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { StockControlCompany } from "../../stock-control/entities/stock-control-company.entity";
import { StockControlUser } from "../../stock-control/entities/stock-control-user.entity";

export enum LeaveType {
  SICK = "sick",
  HOLIDAY = "holiday",
}

@Entity("staff_leave_records")
export class StaffLeaveRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StockControlCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company: StockControlCompany;

  @Column({ name: "company_id" })
  companyId: number;

  @ManyToOne(() => StockControlUser, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: StockControlUser;

  @Column({ name: "user_id" })
  userId: number;

  @Column({ name: "leave_type", type: "varchar", length: 20 })
  leaveType: LeaveType;

  @Column({ name: "start_date", type: "date" })
  startDate: string;

  @Column({ name: "end_date", type: "date" })
  endDate: string;

  @Column({ name: "sick_note_url", type: "text", nullable: true })
  sickNoteUrl: string | null;

  @Column({ name: "sick_note_original_filename", type: "varchar", length: 255, nullable: true })
  sickNoteOriginalFilename: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
