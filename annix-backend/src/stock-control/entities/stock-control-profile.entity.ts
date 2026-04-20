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
import { Company } from "../../platform/entities/company.entity";
import { User } from "../../user/entities/user.entity";
import { StaffMember } from "./staff-member.entity";

@Entity("stock_control_profiles")
@Index(["userId"], { unique: true })
export class StockControlProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => Company)
  @JoinColumn({ name: "company_id" })
  company: Company;

  @Column({ name: "company_id" })
  companyId: number;

  @Column({ name: "hide_tooltips", type: "boolean", default: false })
  hideTooltips: boolean;

  @Column({ name: "email_notifications_enabled", type: "boolean", default: true })
  emailNotificationsEnabled: boolean;

  @Column({ name: "push_notifications_enabled", type: "boolean", default: true })
  pushNotificationsEnabled: boolean;

  @ManyToOne(() => StaffMember, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "linked_staff_id" })
  linkedStaff: StaffMember | null;

  @Column({ name: "linked_staff_id", nullable: true })
  linkedStaffId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
