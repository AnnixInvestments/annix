import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("cv_assistant_companies")
export class CvAssistantCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ name: "imap_host", type: "varchar", length: 255, nullable: true })
  imapHost: string | null;

  @Column({ name: "imap_port", type: "int", nullable: true })
  imapPort: number | null;

  @Column({ name: "imap_user", type: "varchar", length: 255, nullable: true })
  imapUser: string | null;

  @Column({ name: "imap_password_encrypted", type: "varchar", length: 500, nullable: true })
  imapPasswordEncrypted: string | null;

  @Column({ name: "monitoring_enabled", type: "boolean", default: false })
  monitoringEnabled: boolean;

  @Column({ name: "email_from_address", type: "varchar", length: 255, nullable: true })
  emailFromAddress: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
