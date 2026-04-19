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
import { StockControlCompany } from "../../stock-control/entities/stock-control-company.entity";
import { StockControlUser } from "../../stock-control/entities/stock-control-user.entity";

import { User } from "../../user/entities/user.entity";

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

  @ManyToOne(() => Company, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "unified_company_id" })
  unifiedCompany?: Company | null;

  @Column({ name: "unified_company_id", nullable: true })
  unifiedCompanyId?: number | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "unified_user_id" })
  unifiedUser?: User | null;

  @Column({ name: "unified_user_id", nullable: true })
  unifiedUserId?: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
