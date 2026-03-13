import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";

@Entity("comply_sa_audit_logs")
export class ComplySaAuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @ManyToOne(
    () => ComplySaCompany,
    (company) => company.auditLogs,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;

  @Column({ name: "user_id", type: "int", nullable: true })
  userId!: number | null;

  @Column({ type: "varchar", length: 50 })
  action!: string;

  @Column({ name: "entity_type", type: "varchar", length: 50, nullable: true })
  entityType!: string | null;

  @Column({ name: "entity_id", type: "int", nullable: true })
  entityId!: number | null;

  @Column({ type: "jsonb", nullable: true })
  details!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
