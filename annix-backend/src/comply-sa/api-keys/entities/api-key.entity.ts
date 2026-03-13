import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ComplySaCompany } from "../../companies/entities/company.entity";

@Entity("comply_sa_api_keys")
export class ComplySaApiKey {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "company_id", type: "int" })
  companyId!: number;

  @Column({ name: "key_hash", type: "varchar", length: 255 })
  keyHash!: string;

  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ name: "last_used_at", type: "timestamp", nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: "expires_at", type: "timestamp", nullable: true })
  expiresAt!: Date | null;

  @Column({ type: "boolean", default: true })
  active!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @ManyToOne(
    () => ComplySaCompany,
    (company) => company.apiKeys,
  )
  @JoinColumn({ name: "company_id" })
  company!: ComplySaCompany;
}
