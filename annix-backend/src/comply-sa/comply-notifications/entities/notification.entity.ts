import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

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

  @Column({ name: "read_at", type: "varchar", length: 50, nullable: true })
  readAt!: string | null;
}
