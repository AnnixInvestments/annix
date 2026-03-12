import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";
import { ComplySaUser } from "../../companies/entities/user.entity";
import { ComplySaComplianceRequirement } from "../../compliance/entities/compliance-requirement.entity";

@Entity("comply_sa_notifications")
export class ComplySaNotification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "user_id", type: "int", nullable: true })
  userId!: number | null;

  @Column({ name: "requirement_id", type: "int", nullable: true })
  requirementId!: number | null;

  @Column({ type: "varchar", length: 20 })
  channel!: string;

  @Column({ type: "varchar", length: 30 })
  type!: string;

  @Column({ type: "text" })
  message!: string;

  @CreateDateColumn({ name: "sent_at" })
  sentAt!: Date;

  @Column({ name: "read_at", type: "timestamp", nullable: true })
  readAt!: Date | null;

  @ManyToOne(() => ComplySaCompany, { onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;

  @ManyToOne(() => ComplySaUser, { onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user!: ComplySaUser | null;

  @ManyToOne(() => ComplySaComplianceRequirement, { onDelete: "SET NULL" })
  @JoinColumn({ name: "requirement_id" })
  requirement!: ComplySaComplianceRequirement | null;
}
